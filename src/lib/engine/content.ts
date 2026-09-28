import type { AuditRow } from '../audits';
import { askJson } from '../ai/model';
import { quoteFound } from '../ai/validate';
import { env, hasAnthropic } from '../env';
import { recordEvidence } from '../evidence';
import { INDUSTRIES } from '../industries';
import type { ContentCheck } from '../types';
import { cityOf } from '../util';

// Brand and content review. Some checks are plain facts the code can read (a phone link, video on
// the site, an FAQ). The rest are judgements by the AI model, and each must quote the page it is
// based on; a judgement whose quote is not found word for word in the source is dropped.

export async function reviewContent(a: AuditRow): Promise<{ checks: ContentCheck[]; evidence: string; model: string } | null> {
  const b = a.data.brands.client;
  const site = b?.site;
  const checks: ContentCheck[] = [];
  if (site?.ok) {
    checks.push({ item: 'Tap-to-call phone number', result: site.hasPhoneLink ? 'pass' : 'fail', note: site.hasPhoneLink ? 'The site has a phone link mobile visitors can tap.' : 'No tap-to-call phone link was found on the pages read.' });
    checks.push({ item: 'Video on the website', result: site.videoEmbeds > 0 ? 'pass' : 'fail', note: site.videoEmbeds > 0 ? `${site.videoEmbeds} embedded video(s) found on the pages read.` : 'No embedded video on the pages read.' });
    checks.push({ item: 'Answers to buyer questions (FAQ)', result: site.hasFaq ? 'pass' : 'fail', note: site.hasFaq ? 'An FAQ section was found.' : 'No FAQ section was found on the pages read.' });
    checks.push({ item: 'Business details for search engines (schema)', result: site.hasSchemaLocalBusiness ? 'pass' : 'fail', note: site.hasSchemaLocalBusiness ? 'Business schema is present.' : 'No business schema found, which helps Google and AI assistants read the business details.' });
    if (a.inputs.languages.includes('es')) checks.push({ item: 'Spanish-language content', result: site.spanish ? 'pass' : 'fail', note: site.spanish ? 'Spanish content or a Spanish version was found.' : 'No Spanish content was found.' });
  }
  if (!hasAnthropic() || !site?.ok) return checks.length ? { checks, evidence: site?.evidence || '', model: 'rules' } : null;

  const sources: Record<string, string> = { website: site.text.slice(0, 12000) };
  if (b?.place?.description) sources.google_profile = b.place.description;
  if (b?.youtube?.recentTitles?.length) sources.youtube_titles = b.youtube.recentTitles.join('\n');
  const ind = INDUSTRIES[a.inputs.industry];
  const system = `You review the online content of a ${ind.label.toLowerCase()} in ${cityOf(a.market)} for a marketing audit. Judge only from the source text given. Every judgement must include a short quote copied exactly from the source that supports it; if nothing supports a judgement, use result "fail" with quote "".`;
  const user = `Business: ${a.name}\nSources (JSON): ${JSON.stringify(sources)}\n\nReturn {"checks":[{"item":string,"result":"pass"|"partial"|"fail","note":string,"quote":string,"source":"website"|"google_profile"|"youtube_titles"}]} for exactly these items:\n1. Clear offer: does the text say what they do and for whom?\n2. Service area: does it name the city or neighborhoods served?\n3. Proof: reviews, testimonials, credentials, numbers of jobs or sales?\n4. Call to action: a clear next step (call, book, quote)?\n5. Content that answers buyers: guides, prices, process, FAQs?\nKeep each note under 25 words and do not mention numbers that are not in the quote.`;
  const res = await askJson<{ checks: ContentCheck[] }>(system, user, 1500).catch(() => null);
  const dropped: string[] = [];
  for (const c of res?.checks || []) {
    if (!c?.item || !['pass', 'partial', 'fail'].includes(c.result)) continue;
    const src = sources[c.source || 'website'] || '';
    if (c.result !== 'fail' && !(c.quote && quoteFound(c.quote, src))) { dropped.push(c.item); continue; }
    if (c.quote && !quoteFound(c.quote, src)) c.quote = undefined;
    checks.push({ item: c.item.replace(/^\d+\.\s*/, ''), result: c.result, note: c.note, quote: c.quote || undefined, source: c.source });
  }
  const ev = await recordEvidence(a.id, { source: `AI content review (${env.aiModel})`, label: `Content review of ${a.name}`, raw: { checks, dropped, sources: Object.keys(sources) } });
  return { checks, evidence: ev, model: env.aiModel };
}
