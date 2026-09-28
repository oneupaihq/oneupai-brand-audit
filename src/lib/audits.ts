import { q, one, json } from './db';
import type { AuditInputs, BrandId, Collected, Competitors, Overrides, Results, SocialKey, SocialManual } from './types';
import { newId, slugify, domainOf, textNames, sameSite, nameTokens, normName } from './util';
import { sampleMode } from './env';

export type Status = 'running' | 'awaiting_competitors' | 'review' | 'published' | 'failed';

export interface AuditRow {
  id: string;
  slug: string;
  created_at: string;
  updated_at: string;
  name: string;
  website: string;
  market: string;
  industry: string;
  tier: 'quick' | 'full';
  inputs: AuditInputs;
  sample: boolean;
  status: Status;
  step: string | null;
  step_attempts: number;
  locked_until: string | null;
  waiting: any;
  error: string | null;
  competitors: Competitors | null;
  manual: Partial<Record<BrandId, Partial<Record<SocialKey, SocialManual>>>>;
  data: Collected;
  results: Results | null;
  overrides: Overrides;
  published_at: string | null;
  expires_at: string | null;
  outcome: string | null;
  parent_id: string | null;
  cost: number;
}

export async function createAudit(inputs: AuditInputs, parentId?: string): Promise<AuditRow> {
  const id = newId('au_');
  const slug = `${slugify(inputs.name) || 'audit'}-${id.slice(3, 9).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`;
  const rows = await q<AuditRow>(
    `insert into audits (id, slug, name, website, market, industry, tier, inputs, sample, status, step, parent_id, data)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'running','resolve',$10,$11::jsonb) returning *`,
    [id, slug, inputs.name, inputs.website, inputs.market, inputs.industry, inputs.tier, json(inputs), sampleMode(), parentId ?? null, json({ brands: {} })],
  );
  return rows[0];
}

export const getAudit = (id: string) => one<AuditRow>('select * from audits where id = $1', [id]);
export const getBySlug = (slug: string) => one<AuditRow>('select * from audits where slug = $1', [slug]);
export const listAudits = () => q<AuditRow>('select id, slug, name, market, industry, tier, status, step, created_at, updated_at, published_at, outcome, sample, parent_id, error from audits order by created_at desc limit 200');

export async function patchAudit(id: string, patch: Partial<Record<keyof AuditRow, unknown>>) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const JSONB = new Set(['inputs', 'waiting', 'competitors', 'manual', 'data', 'results', 'overrides']);
  const sets = keys.map((k, i) => `${k} = $${i + 2}${JSONB.has(k) ? '::jsonb' : ''}`);
  const vals = keys.map(k => (JSONB.has(k) ? json((patch as any)[k]) : (patch as any)[k]));
  await q(`update audits set ${sets.join(', ')}, updated_at = now() where id = $1`, [id, ...vals]);
}

// ---------- identities used to recognise each business in search results and AI answers ----------

export interface Ident { id: BrandId; name: string; domain?: string; placeId?: string }

export function identities(a: AuditRow): Ident[] {
  const conf = a.competitors?.confirmed;
  const out: Ident[] = [{ id: 'client', name: a.name, domain: domainOf(a.website), placeId: conf?.client?.placeId }];
  (conf?.comps || []).slice(0, 3).forEach((c, i) => out.push({ id: (['a', 'b', 'c'] as BrandId[])[i], name: c.name, domain: c.domain, placeId: c.place?.placeId }));
  return out;
}

/** Which business (if any) a search result, map listing or citation belongs to. */
export function whoIs(ids: Ident[], x: { domain?: string; title?: string; placeId?: string; url?: string }): BrandId | null {
  for (const b of ids) {
    if (x.placeId && b.placeId && x.placeId === b.placeId) return b.id;
    const d = x.domain || domainOf(x.url);
    if (d && b.domain && sameSite(d, b.domain)) return b.id;
  }
  for (const b of ids) {
    if (!x.title) continue;
    const t = normName(x.title), n = normName(b.name);
    if (n.length >= 4 && (t === n || t.startsWith(n + ' ') || t.includes(' ' + n + ' '))) return b.id;
    const toks = nameTokens(b.name);
    if (toks.length >= 2 && toks.every(k => (' ' + t + ' ').includes(' ' + k + ' '))) return b.id;
  }
  return null;
}

/** Which businesses an AI answer names, by name in the text or by their website in its citations. */
export function namedIn(ids: Ident[], text: string, citations: { url: string }[]): BrandId[] {
  const out: BrandId[] = [];
  for (const b of ids) {
    const inText = textNames(text, b.name, b.domain);
    const cited = !!b.domain && citations.some(c => sameSite(domainOf(c.url), b.domain));
    if (inText || cited) out.push(b.id);
  }
  return out;
}
