// Builds each client's two plan pages from plans/clients/<slug>/plan.json:
//   plans/out/<slug>/<slug>-90-day-plan.html     the checklist, in the audit-report design
//   plans/out/<slug>/<slug>-90-day-plan-3d.html  the 3D voyage
//   plans/out/<slug>/<slug>-agreement.html       the offer and payment page, when plan.json has "agreement"
// Usage: npm run plans              (every client)
//        npm run plans -- <slug>    (one client)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadPlan } from './lib/plan.mjs';
import { checklistPage } from './lib/checklist.mjs';
import { voyagePage } from './lib/voyage-page.mjs';
import { agreementPage, checkAgreement } from './lib/agreement.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientsDir = path.join(here, 'clients');
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(clientsDir).filter(d => !d.startsWith('_') && fs.existsSync(path.join(clientsDir, d, 'plan.json')));

const r = await build({ entryPoints: [path.join(here, 'src/voyage.js')], bundle: true, format: 'iife', minify: true, target: 'es2019', write: false, legalComments: 'none' });
const bundle = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const oneup = `data:image/svg+xml;base64,${fs.readFileSync(path.join(here, 'assets/oneupai-logo.svg')).toString('base64')}`;

let failed = 0;
for (const slug of slugs) {
  try {
    const plan = loadPlan(path.join(clientsDir, slug));
    const out = path.join(here, 'out', slug);
    fs.mkdirSync(out, { recursive: true });
    const a = checklistPage(plan, oneup), b = voyagePage(plan, oneup, bundle);
    fs.writeFileSync(path.join(out, plan.checklistUrl), a);
    fs.writeFileSync(path.join(out, plan.voyageUrl), b);
    let extra = '';
    if (plan.agreement) {
      const errs = checkAgreement(plan.agreement);
      if (errs.length) throw new Error(errs.join('; '));
      const c = agreementPage(plan, oneup);
      fs.writeFileSync(path.join(out, plan.agreementUrl), c);
      extra = ` + agreement ${Math.round(c.length / 1024)} KB`;
    }
    console.log(`${slug}: ${plan.weeks.length} weeks, ${plan.totals.videos} videos, ${plan.totals.shorts} shorts, ${plan.totals.articles} articles`
      + ` -> plans/out/${slug}/ (${Math.round(a.length / 1024)} KB + ${Math.round(b.length / 1024)} KB${extra})`);
  } catch (e) {
    failed++;
    console.error(`${slug}: ${e.message}`);
  }
}
if (failed) process.exit(1);
