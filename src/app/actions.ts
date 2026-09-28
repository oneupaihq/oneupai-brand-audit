'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { after } from 'next/server';
import { createAudit, getAudit, patchAudit } from '@/lib/audits';
import { SESSION_COOKIE, passwordOk, sessionToken } from '@/lib/auth';
import { applyConfirmed } from '@/lib/engine/steps';
import { analyze } from '@/lib/engine/analyze';
import { log } from '@/lib/evidence';
import { INDUSTRIES } from '@/lib/industries';
import { kick } from '@/lib/jobs';
import type { AuditInputs, BrandId, Candidate, IndustryKey, SocialKey, SocialManual } from '@/lib/types';
import { domainOf, normUrl } from '@/lib/util';

export async function login(_: unknown, form: FormData) {
  if (!passwordOk(String(form.get('password') || ''))) return { error: 'That password is not right.' };
  (await cookies()).set(SESSION_COOKIE, sessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  const next = String(form.get('next') || '/');
  redirect(next.startsWith('/') ? next : '/');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

const str = (f: FormData, k: string) => String(f.get(k) || '').trim();

export async function startAudit(_: unknown, form: FormData) {
  const name = str(form, 'name'), website = str(form, 'website'), market = str(form, 'market');
  const industry = str(form, 'industry') as IndustryKey;
  if (!name || !website || !market) return { error: 'Business name, website and market are required.' };
  if (!domainOf(website)) return { error: 'The website address does not look right.' };
  if (!INDUSTRIES[industry]) return { error: 'Choose an industry.' };
  const inputs: AuditInputs = {
    name, website: normUrl(website), market, industry,
    tier: str(form, 'tier') === 'quick' ? 'quick' : 'full',
    languages: form.get('spanish') ? ['en', 'es'] : ['en'],
    gbpUrl: str(form, 'gbpUrl') || undefined,
    services: str(form, 'services').split(',').map(s => s.trim()).filter(Boolean),
    social: Object.fromEntries((['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube'] as const).map(k => [k, str(form, k) || undefined]).filter(([, v]) => v)),
    notes: str(form, 'notes') || undefined,
  };
  const a = await createAudit(inputs);
  await log(a.id, `Audit started (${inputs.tier}).`);
  after(() => kick(a.id));
  redirect(`/audits/${a.id}`);
}

export async function confirmCompetitors(form: FormData) {
  const id = str(form, 'id');
  const a = await getAudit(id);
  if (!a || a.status !== 'awaiting_competitors') return;
  const comp = a.competitors!;
  const clientKey = str(form, 'clientPlace');
  const client = clientKey === 'none' ? null : comp.clientPlaceOptions.find(p => p.placeId === clientKey) || comp.clientPlace;
  const picked = form.getAll('cand').map(String);
  const comps: Candidate[] = comp.candidates.filter(c => picked.includes(c.key));
  for (let i = 1; i <= 3; i++) {
    const n = str(form, `addName${i}`), w = str(form, `addSite${i}`);
    if (n && w) comps.push({ key: `manual-${i}`, name: n, website: normUrl(w), domain: domainOf(w), why: 'Added by hand', score: 0, evidence: [] });
  }
  await patchAudit(id, { competitors: { ...comp, confirmed: { client, comps: comps.slice(0, 3) } }, status: 'running' });
  await applyConfirmed((await getAudit(id))!);
  await log(id, `Competitors confirmed: ${comps.slice(0, 3).map(c => c.name).join(', ') || 'none'}.`);
  after(() => kick(id));
  refresh();
}

export async function saveSocial(form: FormData) {
  const id = str(form, 'id');
  const a = await getAudit(id);
  if (!a) return;
  const manual = { ...(a.manual || {}) } as Record<BrandId, Partial<Record<SocialKey, SocialManual>>>;
  const today = new Date().toISOString().slice(0, 10);
  for (const b of ['client', 'a', 'b', 'c'] as BrandId[]) for (const p of ['instagram', 'tiktok', 'facebook', 'linkedin'] as SocialKey[]) {
    const fo = str(form, `${b}.${p}.followers`), po = str(form, `${b}.${p}.posts90`), la = str(form, `${b}.${p}.lastPost`), none = form.get(`${b}.${p}.none`);
    if (none) { (manual[b] ||= {})[p] = { followers: 0, posts90: 0, lastPost: null, enteredAt: today }; continue; }
    if (!fo && !po && !la) { if (manual[b]) delete manual[b][p]; continue; }
    (manual[b] ||= {})[p] = { followers: fo ? Number(fo.replace(/[, ]/g, '')) : null, posts90: po ? Number(po) : 0, lastPost: la || null, enteredAt: today };
  }
  await patchAudit(id, { manual });
  if (a.status === 'review' || a.status === 'published') await analyze((await getAudit(id))!, { skipAi: true });
  refresh();
}

export async function setFinding(form: FormData) {
  const id = str(form, 'id'), fid = str(form, 'fid'), op = str(form, 'op');
  const a = await getAudit(id);
  if (!a) return;
  const o = { ...(a.overrides || {}) };
  if (op === 'hide' || op === 'show') {
    const s = new Set(o.hiddenFindings || []);
    if (op === 'hide') s.add(fid); else s.delete(fid);
    o.hiddenFindings = [...s];
  } else if (op === 'edit') {
    o.findingText = { ...(o.findingText || {}), [fid]: { title: str(form, 'title') || undefined, detail: str(form, 'detail') || undefined } };
  }
  await patchAudit(id, { overrides: o });
  await analyze((await getAudit(id))!, { skipAi: true });
  refresh();
}

export async function setAnonymize(form: FormData) {
  const id = str(form, 'id');
  const a = await getAudit(id);
  if (!a) return;
  await patchAudit(id, { overrides: { ...(a.overrides || {}), anonymize: form.get('anonymize') === 'on' } });
  await analyze((await getAudit(id))!, { skipAi: true });
  refresh();
}

export async function publish(form: FormData) {
  const id = str(form, 'id');
  const a = await getAudit(id);
  if (!a || !a.results) return;
  await patchAudit(id, { status: 'published', published_at: new Date().toISOString(), expires_at: a.outcome === 'won' ? null : new Date(Date.now() + 90 * 86400_000).toISOString() });
  await log(id, 'Report published.');
  refresh();
}

export async function unpublish(form: FormData) {
  const id = str(form, 'id');
  await patchAudit(id, { status: 'review', published_at: null });
  await log(id, 'Report link turned off.');
  refresh();
}

export async function setOutcome(form: FormData) {
  const id = str(form, 'id'), outcome = str(form, 'outcome');
  if (!['won', 'lost', 'follow_up'].includes(outcome)) return;
  await patchAudit(id, { outcome, ...(outcome === 'won' ? { expires_at: null } : {}) });
  await log(id, `Outcome set: ${outcome.replace('_', ' ')}.${outcome === 'won' ? ' This audit is now the baseline; monthly re-runs start in 30 days.' : ''}`);
  refresh();
}

export async function retry(form: FormData) {
  const id = str(form, 'id');
  await patchAudit(id, { status: 'running', step_attempts: 0, locked_until: null, error: null });
  await log(id, 'Retrying.');
  after(() => kick(id));
  refresh();
}

export async function reanalyze(form: FormData) {
  const id = str(form, 'id');
  const a = await getAudit(id);
  if (!a) return;
  await analyze(a);
  refresh();
}
