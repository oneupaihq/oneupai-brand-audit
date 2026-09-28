// Central place for configuration. Keys are read from the environment only on the server.

export const env = {
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  dfsLogin: process.env.DATAFORSEO_LOGIN || '',
  dfsPassword: process.env.DATAFORSEO_PASSWORD || '',
  // 'standard' uses the cheaper task queue; 'live' returns immediately at a higher price.
  dfsMode: (process.env.DATAFORSEO_MODE || 'standard') as 'standard' | 'live',
  googleKey: process.env.GOOGLE_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-sonnet-5',
  appPassword: process.env.APP_PASSWORD || '',
  cronSecret: process.env.CRON_SECRET || '',
  reportBaseUrl: (process.env.REPORT_BASE_URL || 'https://audit.oneupai.com').replace(/\/$/, ''),
  // Optional overrides for the assistant models asked through DataForSEO.
  llmModels: {
    chatgpt: process.env.LLM_MODEL_CHATGPT || '',
    claude: process.env.LLM_MODEL_CLAUDE || '',
    gemini: process.env.LLM_MODEL_GEMINI || '',
  },
};

export const hasDataForSeo = () => !!(env.dfsLogin && env.dfsPassword);
export const hasGoogle = () => !!env.googleKey;
export const hasAnthropic = () => !!env.anthropicKey;

/** Sample mode: any core key missing. Every record made in sample mode is marked as sample. */
export const sampleMode = () => !hasDataForSeo() || !hasGoogle();

/** Base URL this deployment can call itself on, used to chain audit steps. */
export function selfUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}
