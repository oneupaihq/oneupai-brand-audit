import { env } from '../env';
import { pool, sleep } from '../util';

// Thin DataForSEO client. Standard queue (task_post + task_get) for SERPs, live endpoints for the rest.
// Docs: https://docs.dataforseo.com/v3/

const BASE = 'https://api.dataforseo.com/v3';
export let spent = 0; // USD reported by DataForSEO during this invocation
export const resetSpent = () => { spent = 0; };

function auth() {
  return 'Basic ' + Buffer.from(`${env.dfsLogin}:${env.dfsPassword}`).toString('base64');
}

export async function dfs(path: string, body?: unknown, method: 'POST' | 'GET' = 'POST'): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: auth(), 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(body ?? []) : undefined,
      signal: AbortSignal.timeout(150_000),
    });
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await res.json();
    if (typeof j.cost === 'number') spent += j.cost;
    if (j.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${j.status_code} ${j.status_message}`);
    return j;
  }
  throw new Error(`DataForSEO ${path}: gave up after retries`);
}

/** Live call with one task; returns tasks[0].result (array) or throws with the task's message. */
export async function live(path: string, task: Record<string, unknown>): Promise<any[]> {
  const j = await dfs(path, [task]);
  const t = j.tasks?.[0];
  if (!t || t.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${t?.status_code} ${t?.status_message}`);
  return t.result || [];
}

export type SerpKind = 'google/organic' | 'google/maps' | 'youtube/organic';

/** Post tasks to the standard queue. Returns task ids in the same order (null where the post failed). */
export async function postTasks(kind: SerpKind, tasks: Record<string, unknown>[]): Promise<(string | null)[]> {
  const ids: (string | null)[] = [];
  for (let i = 0; i < tasks.length; i += 100) {
    const chunk = tasks.slice(i, i + 100).map((t, k) => ({ ...t, tag: String(i + k) }));
    const j = await dfs(`/serp/${kind}/task_post`, chunk);
    for (const t of j.tasks || []) ids.push(t.status_code === 20100 ? t.id : null);
  }
  return ids;
}

/** Fetch finished results for the given ids. Returns id -> result (items) for the ones that are ready. */
export async function collectTasks(kind: SerpKind, ids: string[], budgetMs: number): Promise<Record<string, any>> {
  const done: Record<string, any> = {};
  const deadline = Date.now() + budgetMs;
  let pending = ids.filter(Boolean);
  while (pending.length && Date.now() < deadline) {
    await pool(pending, 8, async id => {
      try {
        const j = await dfs(`/serp/${kind}/task_get/advanced/${id}`, undefined, 'GET');
        const t = j.tasks?.[0];
        if (t?.status_code === 20000) done[id] = t.result?.[0] ?? null;
        else if (t && ![40601, 40602, 40100].includes(t.status_code)) done[id] = { error: `${t.status_code} ${t.status_message}` };
      } catch { /* try again next round */ }
    });
    pending = pending.filter(id => !(id in done));
    if (pending.length) await sleep(8000);
  }
  return done;
}

/** Live SERP for one task (used when DATAFORSEO_MODE=live, or to fill gaps). */
export async function liveSerp(kind: SerpKind, task: Record<string, unknown>) {
  const r = await live(`/serp/${kind}/live/advanced`, task);
  return r[0] ?? null;
}

// ---------- keywords ----------

export async function searchVolume(keywords: string[], coord: string, language: string) {
  const r = await live('/keywords_data/google_ads/search_volume/live', { keywords: keywords.slice(0, 1000), location_coordinate: coord, language_code: language });
  return r as { keyword: string; search_volume: number | null; cpc: number | null; competition: string | null }[];
}

export async function keywordSuggestions(seed: string, language: string, limit = 40) {
  const r = await live('/dataforseo_labs/google/keyword_suggestions/live', { keyword: seed, location_code: 2840, language_code: language, limit, include_seed_keyword: false });
  return (r[0]?.items || []).map((it: any) => ({ keyword: it.keyword as string, volume: (it.keyword_info?.search_volume ?? null) as number | null }));
}

// ---------- backlinks ----------

export async function backlinksSummary(domain: string) {
  const r = await live('/backlinks/summary/live', { target: domain, include_subdomains: true, internal_list_limit: 1, backlinks_status_type: 'live' });
  const x = r[0] || {};
  return { referringDomains: Number(x.referring_main_domains ?? x.referring_domains ?? 0), backlinks: Number(x.backlinks ?? 0), rank: x.rank ?? null, raw: { target: x.target, referring_domains: x.referring_domains, referring_main_domains: x.referring_main_domains, backlinks: x.backlinks, rank: x.rank } };
}

// ---------- AI assistants ----------

const LLM_PATH = { chatgpt: 'chat_gpt', claude: 'claude', gemini: 'gemini' } as const;
const PREFER: Record<keyof typeof LLM_PATH, RegExp[]> = {
  chatgpt: [/^gpt-5(\.\d+)?$/, /^gpt-5/, /^gpt-4\.1$/, /^gpt-4o$/],
  claude: [/sonnet/, /opus/, /haiku/],
  gemini: [/gemini-3.*flash/, /gemini-2\.5-flash$/, /flash/, /pro/],
};
const modelCache: Partial<Record<keyof typeof LLM_PATH, string>> = {};

export async function pickModel(a: keyof typeof LLM_PATH): Promise<string> {
  if (env.llmModels[a]) return env.llmModels[a];
  if (modelCache[a]) return modelCache[a]!;
  const j = await dfs(`/ai_optimization/${LLM_PATH[a]}/llm_responses/models`, undefined, 'GET');
  const models: { model_name: string; web_search_supported?: boolean; reasoning?: boolean }[] = j.tasks?.[0]?.result || [];
  const web = models.filter(m => m.web_search_supported);
  let pick = '';
  for (const re of PREFER[a]) { const m = web.find(x => re.test(x.model_name)); if (m) { pick = m.model_name; break; } }
  pick ||= web[0]?.model_name || models[0]?.model_name;
  if (!pick) throw new Error(`No ${a} model available from DataForSEO`);
  modelCache[a] = pick;
  return pick;
}

export async function askAssistant(a: keyof typeof LLM_PATH, question: string, city: string) {
  const model = await pickModel(a);
  const r = await live(`/ai_optimization/${LLM_PATH[a]}/llm_responses/live`, {
    user_prompt: question.slice(0, 500), model_name: model, web_search: true, web_search_country_iso_code: 'US', web_search_city: city, max_output_tokens: 1200,
  });
  const res = r[0] || {};
  let text = '';
  const citations: { title?: string; url: string }[] = [];
  for (const it of res.items || []) {
    if (it.type !== 'message') continue;
    for (const s of it.sections || []) {
      if (s.text) text += (text ? '\n' : '') + s.text;
      for (const a2 of s.annotations || []) if (a2.url) citations.push({ title: a2.title, url: a2.url });
    }
  }
  return { model: res.model_name || model, text, citations, cost: res.money_spent ?? null };
}
