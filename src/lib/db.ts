import { env } from './env';

// One tiny query function for the whole app.
// Production: Neon Postgres over HTTP (DATABASE_URL from the Vercel Neon integration).
// Local development and tests: DATABASE_URL=pglite:<dir> runs Postgres in-process.

type Row = Record<string, any>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

let client: QueryFn | null = null;
let ready: Promise<void> | null = null;

async function makeClient(): Promise<QueryFn> {
  const url = env.databaseUrl;
  if (!url) throw new Error('DATABASE_URL is not set. Add Neon Postgres to the Vercel project, or use DATABASE_URL=pglite:./.data/pg locally.');
  if (url.startsWith('pglite:')) {
    const mod = '@electric-sql/pglite';
    const { PGlite } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ mod);
    const g = globalThis as any;
    g.__pglite ??= new PGlite(url.slice('pglite:'.length) || undefined);
    const db = g.__pglite;
    return async (text, params = []) => (await db.query(text, params)).rows as Row[];
  }
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  return async (text, params = []) => (await sql.query(text, params as any[])) as Row[];
}

const SCHEMA = `
create table if not exists audits (
  id text primary key,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  website text not null,
  market text not null,
  industry text not null,
  tier text not null default 'full',
  inputs jsonb not null default '{}'::jsonb,
  sample boolean not null default false,
  status text not null default 'queued',
  step text,
  step_attempts int not null default 0,
  locked_until timestamptz,
  waiting jsonb,
  error text,
  competitors jsonb,
  manual jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  results jsonb,
  overrides jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  outcome text,
  parent_id text,
  cost numeric not null default 0
);
create index if not exists audits_status on audits(status);
create table if not exists evidence (
  id text primary key,
  audit_id text not null,
  source text not null,
  label text not null,
  query jsonb,
  url text,
  fetched_at timestamptz not null default now(),
  sample boolean not null default false,
  raw jsonb
);
create index if not exists evidence_audit on evidence(audit_id);
create table if not exists audit_log (
  id bigserial primary key,
  audit_id text not null,
  at timestamptz not null default now(),
  level text not null default 'info',
  message text not null
);
create index if not exists audit_log_audit on audit_log(audit_id, id);
`;

export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  client ??= await makeClient();
  ready ??= (async () => { for (const s of SCHEMA.split(';').map(x => x.trim()).filter(Boolean)) await client!(s); })();
  await ready;
  return (await client(text, params)) as T[];
}

export async function one<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** JSON parameters: Neon and PGlite both accept a JSON string cast with ::jsonb. */
export const json = (v: unknown) => JSON.stringify(v ?? null);
