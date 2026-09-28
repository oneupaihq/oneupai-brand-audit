import { q, json } from './db';
import { newId } from './util';

// Every fact the engine uses is saved with its source, the exact request, the date and the raw
// response. Findings and the report point at these ids, so every number can be traced.

export interface EvidenceInput {
  source: string; // 'DataForSEO Google organic', 'Google PageSpeed', 'Website', 'Entered by hand', 'Sample'
  label: string; // plain words: 'Google results for "kitchen remodel orlando"'
  query?: unknown;
  url?: string;
  raw?: unknown;
  sample?: boolean;
}

const MAX_RAW = 180_000;

export async function recordEvidence(auditId: string, e: EvidenceInput): Promise<string> {
  const id = newId('ev_');
  let raw: unknown = e.raw ?? null;
  const s = JSON.stringify(raw);
  if (s && s.length > MAX_RAW) raw = { truncated: true, size: s.length, head: s.slice(0, MAX_RAW) };
  await q(
    'insert into evidence (id, audit_id, source, label, query, url, sample, raw) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb)',
    [id, auditId, e.source, e.label, json(e.query ?? null), e.url ?? null, !!e.sample, json(raw)],
  );
  return id;
}

export async function evidenceIndex(auditId: string) {
  const rows = await q('select id, source, label, url, fetched_at, sample from evidence where audit_id = $1', [auditId]);
  const out: Record<string, { source: string; label: string; date: string; url?: string; sample?: boolean }> = {};
  for (const r of rows) out[r.id] = { source: r.source, label: r.label, date: new Date(r.fetched_at).toISOString().slice(0, 10), url: r.url || undefined, sample: r.sample || undefined };
  return out;
}

export async function log(auditId: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
  await q('insert into audit_log (audit_id, level, message) values ($1,$2,$3)', [auditId, level, message]);
}
