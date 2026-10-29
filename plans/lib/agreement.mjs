// The agreement page: the offer, the key terms and the payment button, in the audit-report design.
// Built only when plan.json has an "agreement" block (see plans/README.md).
import fs from 'fs';
import { esc, themeHead } from './html.mjs';

const asset = f => fs.readFileSync(new URL(`../assets/${f}`, import.meta.url), 'utf8');
const usd = n => `$${Number(n).toLocaleString('en-US')}`;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fullDate = iso => { const d = new Date(`${iso}T12:00:00Z`); return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };

// escapes text, then turns [text](url) into a link and fills {videos} {shorts} {articles} from the plan totals
const rich = (s, plan) => esc(s).replace(/\{(videos|shorts|articles)\}/g, (_, k) => plan.totals[k]).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

const section = (n, title, line, body, id) => `<section id="${id}"><div class="sh"><span class="sn">${n}</span><h2>${esc(title)}</h2></div><p class="line">${esc(line)}</p>${body}</section>`;

const CSS = `
.offer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 4px 0 6px; }
.offer .kpi { text-align: center; }
.offer .was { text-decoration: line-through; color: #6b7480; }
.terms { list-style: none; padding: 0; margin: 4px 0 0; display: grid; gap: 10px; }
.terms li { padding: 12px 14px 12px 16px; border-left: 3px solid var(--goldfill); background: #fbf7ef; border-radius: 0 10px 10px 0; }
.steps2 { padding-left: 22px; margin: 4px 0 0; }
.steps2 li { margin: 0 0 12px; }
.steps2 li::marker { color: var(--gold); font-weight: 800; }
.pay { text-align: center; padding: 8px 0 4px; }
.pay .btn { font-size: 17px; padding: 14px 26px; }
.pay p { margin: 12px 0 0; font-size: 14px; }
.expires { display: inline-block; margin-top: 14px; font-size: 14px; font-weight: 700; color: #7a4f00; background: #fff3d6; border: 1px solid #f0d9a8; border-radius: 99px; padding: 6px 14px; }
.inc tbody td, .inc thead th { text-align: left; }
.inc tbody th { white-space: nowrap; }
@media (max-width: 720px) {
  .offer { grid-template-columns: 1fr; }
  .line { white-space: normal; }
  .inc tbody th { white-space: normal; width: 30%; }
  section { padding: 20px 18px; }
}
@media print { .hero-actions, .pay .btn { display: none; } }
`;

export function agreementPage(plan, oneupLogoUri) {
  const A = plan.agreement, by = plan.preparedBy, TH = themeHead(plan.theme);
  const months = A.rateMonths;
  const expires = fullDate(A.expires);
  const fx = A.fx;

  const offer = `<div class="offer">`
    + `<div class="kpi"><div class="kn was">${usd(A.standard)}</div><div class="kl">Standard rate, per month</div></div>`
    + `<div class="kpi pos"><div class="kn">${usd(A.rate)}</div><div class="kl">Your rate, per month, fixed for the first ${months} months</div></div>`
    + `<div class="kpi"><div class="kn">${usd((A.standard - A.rate) * months)}</div><div class="kl">You save over the first ${months} months</div></div>`
    + `</div>`
    + `<p>From month ${months + 1}, the package is billed at the standard ${usd(A.standard)} a month. Over the first ${months} months you pay ${usd(A.rate * months)} instead of ${usd(A.standard * months)}.</p>`
    + (fx ? `<p class="src">${esc(fx.line)} At the <a href="${esc(fx.url)}">${esc(fx.source)}</a> for ${esc(fx.date)}, your rate is about ${esc(fx.rate)} a month; your bank converts at its own rate and may add a fee.</p>` : '')
    + `<p><span class="expires">This offer is open until ${esc(expires)}</span></p>`;

  const included = `<div class="tw"><table class="inc"><thead><tr><th scope="col">What</th><th scope="col">Details</th></tr></thead><tbody>`
    + A.included.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${rich(b, plan)}</td></tr>`).join('')
    + `</tbody></table></div>`
    + `<p class="src">The <a href="${esc(plan.checklistUrl)}">${plan.days}-day plan</a> lists every week's work. ${esc(A.notIncluded)}</p>`;

  const terms = `<ul class="terms">${A.terms.map(t => `<li>${rich(t, plan)}</li>`).join('')}</ul>`
    + `<p class="src">These are the main points. The full <a href="${esc(A.termsUrl)}">Terms of Service</a> apply, and you accept them at checkout.</p>`;

  const start = `<ol class="steps2">${A.steps.map(s => `<li>${rich(s, plan)}</li>`).join('')}</ol>`
    + `<div class="pay"><a class="btn gold" href="${esc(A.payUrl)}">Agree and pay the first month: ${usd(A.rate)}</a>`
    + `<p>Your code <b>${esc(A.code)}</b> is already applied at checkout. Open until ${esc(expires)}.</p>`
    + `<p>Prefer an invoice? Email <a href="mailto:${esc(by.email)}">${esc(by.email)}</a> and we'll send one at the same rate.</p></div>`;

  const SECTIONS = [
    ['Your offer', `${A.package}, ${usd(A.rate)} a month for the first ${months} months.`, offer, 'offer'],
    ["What's included", `Everything in the ${plan.days}-day plan, from the website to the videos.`, included, 'included'],
    ['Key terms', 'Monthly billing, 30 days’ notice to cancel, nothing published without your approval.', terms, 'terms'],
    ['How to start', 'Once we’ve agreed the plan together, paying the first month starts week 1.', start, 'start'],
  ];
  const body = SECTIONS.map(([a, b, c, d], i) => section(i + 1, a, b, c, d)).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">${TH.link}<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(plan.client)} · Agreement and payment</title>
<style>${asset('report.css')}${asset('checklist.css')}${CSS}${TH.css}</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="${plan.logoUri}" alt="${esc(plan.brand)}"><img class="olog" src="${oneupLogoUri}" alt="OneUpAI"></div>
 <p class="kicker">${esc(A.package)} · Open until ${esc(expires)}</p>
 <h1>${esc(plan.client)}: Agreement and payment</h1>
 <p class="meta">Prepared for <b>${esc(plan.client)}</b> · Prepared by <b>${esc(by.name)}, ${esc(by.company)}</b> · ${esc(plan.prepared)}</p>
 <div class="hero-actions">${A.auditUrl ? `<a class="btn" href="${esc(A.auditUrl)}">The analysis</a>` : ''}<a class="btn" href="${esc(plan.checklistUrl)}">The ${plan.days}-day plan</a><a class="btn gold" href="#start">How to start</a></div>
</div></header>
<main>${body}</main>
<footer><span>${esc(A.legalName || by.company)} · ${esc(by.email)}</span><span><a href="${esc(A.termsUrl)}">Terms of Service</a></span></footer>
</body></html>`;
}

// checks run by the build so a page never goes out with a missing price, link or date
export function checkAgreement(A) {
  const errs = [];
  for (const k of ['package', 'standard', 'rate', 'rateMonths', 'payUrl', 'code', 'expires', 'termsUrl', 'included', 'terms', 'steps', 'notIncluded'])
    if (A[k] === undefined || A[k] === '' || String(A[k]).includes('TODO')) errs.push(`agreement.${k} is missing`);
  if (A.payUrl && !/^https:\/\/buy\.stripe\.com\//.test(A.payUrl)) errs.push('agreement.payUrl should be a Stripe payment link');
  if (A.payUrl && A.code && !A.payUrl.includes(`prefilled_promo_code=${A.code}`)) errs.push('agreement.payUrl should end with ?prefilled_promo_code=<code>');
  if (A.expires && !/^\d{4}-\d{2}-\d{2}$/.test(A.expires)) errs.push('agreement.expires must be YYYY-MM-DD');
  if (A.rate >= A.standard) errs.push('agreement.rate should be below agreement.standard');
  return errs;
}
