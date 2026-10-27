# Client plan pages

Every client's 90-day plan ships as two pages built from one file, plus an agreement page when the file has an `agreement` block:

- **Checklist page** (`<slug>-90-day-plan.html`): the whole plan in the audit-report design, with check marks.
- **Agreement and payment** (`<slug>-agreement.html`): the offer, what's included, the key terms and the payment button. Built only when `plan.json` has `agreement`.
- **3D voyage** (`<slug>-90-day-plan-3d.html`): the client's yacht sails a course with one buoy per week. It starts at a marina, passes the launch event and ends at the day-90 lighthouse. Each buoy opens that week's checklist.

Both pages are single files with no server and nothing to install. They share check marks through the browser's storage, so a box ticked on one page shows on the other in the same browser. This is step 3 of the [client onboarding and production process](https://claude.ai/code/artifact/1f2df36c-face-4c66-9746-56e12a951e5c).

## Making a client's pages

1. Copy `clients/_template/` to `clients/<slug>/`, where `<slug>` is the client's name in lowercase with dashes, such as `maria-lopez`.
2. Put the client's logo next to `plan.json`; PNG, JPG or SVG all work. Name the file in `logo`.
3. Fill in every `TODO` in `plan.json` from the questionnaire, the audit and the internal plan. The build refuses a plan that still has a TODO.
4. Run `npm run plans -- <slug>`, or `npm run plans` to build every client.
5. Open both files from `plans/out/<slug>/` on a computer and on a phone. Check the launch week, the last week and a few check marks.
6. Send both files together; they link to each other by file name. If you host them, put them in the same folder.

## What goes in plan.json

| Field | What it holds |
| --- | --- |
| `slug`, `client`, `brand`, `logo` | Who the plan is for; `slug` must match the folder name |
| `start`, `end`, `prepared`, `baselineDate` | Plan dates (`YYYY-MM-DD`), the date on the cover, the audit date shown as "Today" |
| `preparedBy` | Name, company and email on the cover and footer |
| `goal`, `oneLine` | The goal line, and the one-line bio used on every profile |
| `phases` | Four phases with name, dates, color and one line. Exactly one has `"launch": true`: the event week |
| `weeks` | One entry per week: `n`, `dates`, `start` (`YYYY-MM-DD`), `phase`, `focus`, optional `note`, `you` (the client's tasks) and `out` (`[kind, text]` pairs; kind is one of `video`, `short`, `article`, `note`, `post`, `setup`, `report`) |
| `thisWeek` | How many of week 1's tasks appear under "This week" (default: all) |
| `later` | Small open questions with no deadline |
| `calibration` | Due date, when sample edits come back, and the five clip topics |
| `launch` | The event: `name` and `dates` (shown in 3D), `venue`, playbook `title` and `line`, and `before`, `during` (with the phone `shots` list) and `after` |
| `guide` | The "How to record" steps; the template's version works for most clients |
| `approvals`, `afterMonth`, `hour`, `themes`, `profiles`, `boundaries`, `tools`, `measures` | The rest of the plan, as rows |
| `cadence` | Optional. What continues after the last week: `title`, `line`, `head`, `rows` and an optional `note`, shown after the launch playbook |
| `status` | Optional. A short label shown on both pages' headers, such as "Proposed plan, for discussion" before the client has agreed the plan |
| `copy` | Optional. Page wording for clients who don't film themselves: KPI labels, the time line, the guide's title and line (`guideTitle`, `guideLine`, `howto`), `hourTitle`, `hourLine`, `themesTitle`, `toolsLine`, `shotsTitle` and `shotsHowto` (false hides the guide button on the launch list). Defaults are in `lib/plan.mjs`; Pearce Placements is the example |
| `calibration` extras | Optional `title`, `line`, `intro` and `setup: false` turn the calibration clip into a written or voice-note starter pack |
| `target`, `articlesLabel`, `profilesLine` | Optional. A worked-back sales target; the label for articles when they aren't on LinkedIn; the line under "How you'll show up" when the brand isn't the client's own name |
| `totals` | Optional. If given, the build checks it against the weeks: video and article items count once each, and a short item counts its leading number or a number in brackets, so "4 shorts" is 4 and "a short each day (5)" is 5 |
| `agreement` | Optional. The agreement and payment page: `package`, `legalName`, `standard` and `rate` (US dollars a month), `rateMonths` (how long the rate is fixed), `expires` (`YYYY-MM-DD`, the last day of the offer), `code` (the Stripe promotion code), `payUrl` (the Stripe payment link ending `?prefilled_promo_code=<code>`), `termsUrl`, `auditUrl`, `fx` (`line`, `source`, `url`, `date`, `rate`: the monthly rate in the client's currency), `included` (rows; `{videos}`, `{shorts}`, `{articles}` fill from the weeks), `notIncluded`, `terms` and `steps`. Text in `included`, `terms` and `steps` can hold `[text](url)` links. The build refuses a missing field or a payment link without the code. Pearce Placements is the example |
| `storeKey` | Optional. Where check marks are saved in the browser; leave it out for new clients |

Check-box IDs come from each item's position, such as `w4o2` for week 4's second item and `shot3` for the third shot. Once a client has started ticking boxes, add new items at the end of a week rather than in the middle.

## Launch venues

`launch.venue` sets what stands on the shore at the launch-week buoy:

| Venue | Scene | Use for |
| --- | --- | --- |
| `boat-show` | Show docks with yachts moored bow-in, gold flags along the dock, tents on the beach | Yacht brokers (FLIBS, Palm Beach, Miami) |
| `event` | A pier, a covered stage and a row of tents under gold flags | Open-house weekends, home and garden shows, anything held on land |

To add a venue, add a branch in the launch-event block of `src/voyage.js` and its name to `VENUES` in `lib/plan.mjs`.

## Files

| Path | What it is |
| --- | --- |
| `build.mjs` | Loads each plan, bundles the 3D scene with three.js and writes both pages |
| `lib/plan.mjs` | Loads `plan.json`, assigns check-box IDs, counts totals and rejects incomplete plans |
| `lib/checklist.mjs`, `lib/voyage-page.mjs`, `lib/guide.mjs` | The two pages and the shared "How to record" guide |
| `src/voyage.js` | The 3D scene: sea, coast, marina, launch venue, buoys, lighthouse, the yacht and its camera |
| `assets/` | Report styles (shared with the audit report), page styles, the checklist script, the OneUpAI logo |
| `clients/<slug>/` | One folder per client: `plan.json` and the logo |
| `out/` | Built pages; not committed |
