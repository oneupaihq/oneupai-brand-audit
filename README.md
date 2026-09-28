# OneUpAI Brand Audit

The audit engine behind OneUpAI's presence audits. You enter a business; the tool does the rest:

1. Measures its online presence against 3 local competitors: the Google map, its Google profile, reviews, website, search rankings, YouTube, what ChatGPT, Claude and Gemini say, social media, linking sites and ads.
2. Scores 10 categories against the competitors' median, writes the findings, and saves every fact with its source.
3. Builds a 90-day plan, then an ongoing plan. Every item is labelled: a ready OneUp agent, an agent to build or adapt, a OneUpAI service, or a client task.
4. Writes an internal strategy brief with talking points, likely objections and what to offer.
5. Publishes a shareable 3D report at `audit.oneupai.com/r/<name>`, with a switch between today and after 90 days.
6. For won clients, re-runs every 30 days against the same competitors to measure planned against actual.

## Set up (once)

1. **Vercel:** import this repo as a project on the Pro plan.
2. **Database:** in the project's Storage tab, add **Neon Postgres**. It sets `DATABASE_URL`. Tables are created automatically on first use.
3. **Environment variables:** see `.env.example`. At minimum set:
   - `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
   - `GOOGLE_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `APP_PASSWORD`
   - `CRON_SECRET`
4. **Domain:** add `audit.oneupai.com` under Domains.
5. **Redeploy** after changing environment variables.

Without the DataForSEO or Google keys, the tool runs in **sample mode**:
- Every audit is marked as sample data.
- The review screen warns you.
- The 3D report shows "Sample data, not a real audit".

## How an audit runs

Each step is its own serverless invocation, with `maxDuration` of 600 s. Each step saves its results and starts the next one. A cron job every 5 minutes restarts anything that stalled, including a step waiting on DataForSEO's task queue.

| Step | What it does | Main sources |
| --- | --- | --- |
| `resolve` | Finds the market, reads the website, matches the Google profile, suggests competitors. **Full audits pause here** so you can confirm. | Google Places, website, DataForSEO organic |
| `keywords` | Builds the list of searches from the industry preset, measures local search volume, and keeps the top 12. | DataForSEO Google Ads volume, Labs |
| `serp_post` / `serp_collect` | Google results for each search, a 5×5 Google Maps grid, and YouTube results, on the standard queue. | DataForSEO SERP |
| `assistants` | 5-6 buyer questions to ChatGPT, Claude and Gemini with web search on, each asked twice. | DataForSEO AI Optimization |
| `profiles` | Google profile details, mobile speed, linking sites and YouTube channel for each business. | Places, PageSpeed, DataForSEO Backlinks, YouTube Data API |
| `content` | Brand and content review. Rule checks, plus AI judgements that must quote the page they are based on. | Website, Anthropic |
| `analyze` | Scores, findings, plan, projections, brief and the report data. | (no API calls) |

The social media counts are entered by hand on the review screen. Re-scoring after that is instant, with no API calls.

## Accuracy safeguards

- **Numbers:** every number comes from code working on stored data (`evidence` table). The AI model never supplies one.
- **Findings:** findings come from rules (`src/lib/engine/findings.ts`).
- **Fact check:** AI-written text passes through `src/lib/ai/validate.ts`. Any sentence with a number or business name that is not in the data is dropped and replaced with the rule-written version.
- **AI assistant answers:** a mention counts only if the business's name or website appears in the saved answer.
- **Missing data:** it shows as "not checked", never as zero.
- **Projections:** ranges from fixed rules (`src/lib/engine/plan.ts`), and the rule is shown next to each one.

## Code map

- `src/lib/engine/`: steps, scoring, findings, plan, brief, report builder
- `src/lib/collectors/`: DataForSEO, Google, website crawler, sample data
- `src/lib/industries.ts`: industry presets, which agents and services close each gap
- `renderer/`: the 3D report (three.js). `npm run build:report` bundles it into `public/report/app.js`; it also runs automatically before `dev` and `build`.
- `src/app/`: screens (audits list, new audit, review, brief), the report route `/r/[slug]`, job and cron routes

## Local development

```bash
npm install
cp .env.example .env.local   # DATABASE_URL=pglite:./.data/pg runs Postgres in-process
npm run dev
npm test                     # engine test: three audits through every step with mocked APIs
```

## Costs per audit (approximate)

- Full audit: about $3-5 in DataForSEO data. The largest parts are the AI assistant questions and linking-site checks.
- Quick audit: about $0.50-1.
- Google API calls fall within the free tiers at this volume.
- The review screen shows what DataForSEO reported charging for each audit.
