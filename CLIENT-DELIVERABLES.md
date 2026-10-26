# Client deliverables: audit and plan

How to produce a client's full set the way Jace Kizzier (yacht broker, 90-day plan) and Morne Koen (estate agent, 180-day plan) were done. Follow it step by step and the files come out in the same design, structure and standard.

## What every client gets

| # | Deliverable | Format | Built by |
| --- | --- | --- | --- |
| 1 | Presence audit report | Single HTML file in the audit-report design | `audits/clients/<slug>/build.py` |
| 2 | 3D presence audit | Single HTML file using the audit renderer | Same script |
| 3 | Plan document for the client (and an internal copy when the client works with other agencies) | Claude Docs doc with the OneUpAI logo at the top | Written in Claude Docs (step 5) |
| 4 | Plan checklist page | `<slug>-<days>-day-plan.html` | `npm run plans -- <slug>` |
| 5 | Plan 3D voyage page | `<slug>-<days>-day-plan-3d.html` | Same command |
| 6 | First-steps email | Drafted in chat | Step 7 |

Reference clients:

- `audits/clients/jace-kizzier/build.py` builds two audits: the website brand against firms, and the person against peers. Uses `scene: 'marina'`.
- `audits/clients/morne-koen/build.py` builds one audit: the person against peers. Uses `scene: 'city'` and `planDays: 180`.
- `plans/clients/jace-kizzier/plan.json` is a 13-week plan; `plans/clients/morne-koen/plan.json` is a 26-week plan with a target section.

## Rules that apply to everything

- **Facts only.** Every number comes from a public page you opened, with the date checked. Anything you could not verify is written "Not checked" or "–", never estimated. An account you can't tie to the client (wrong name, private, no link) is "not confirmed", not counted.
- **Plain, professional wording.** No slogans or taglines. First sentence of each section is its point. Short sentences.
- **No promises of results.** Sales, followers and rankings are reported, not promised. A sales target is the client's number; the plan builds and measures the pipeline toward it.
- **Leave personal life out.** Family posts, grief, health and similar are never quoted or described, even when public.
- **Local units and money.** Feet and dollars for US clients; metres and rand for South Africa. Show foreign prices with the exchange rate and its date and source.
- **Other agencies.** If another agency runs the client's website or social accounts, phase one only touches what we control. Shared platforms go through the client later.

## Step 1: Research (about 1–2 hours)

Work in the built-in browser for anything behind a sign-in or that blocks fetching. LinkedIn needs the user signed in once in the browser pane.

1. **The client:** brokerage or agency profile, portal profiles (for estate agents: Property24, Private Property, SA Hometraders, MyProperty), personal website, Google name search, LinkedIn (profile, experience, recent activity, followers), Facebook, Instagram, YouTube, TikTok.
2. **Listings and track record:** count listings for sale and sold from the agency profile, with towns and price ranges. Don't call sold flags a sales rate: profiles don't show dates.
3. **Profile problems:** old agency pages still live, duplicate profiles, wrong names on buttons, broken WhatsApp links. A `wa.me` link needs the international number without the leading 0.
4. **Comparison set:** three people or firms in the same market who market under their own names. Use the same measures for each: portal listings, website yes or no, Facebook, Instagram, YouTube uploads in the last 12 months, and anything notable (radio slots, rankings they claim, quoted as their claim).
5. **Searches:** 6–9 Google searches buyers use (name, "estate agent <area>", "sell my house <area>", "moving to <area>", valuation). For each, note who is on page 1 and whether the client or any peer appears.

Ways to get counts reliably, run from a tab already open on that site:

- **Instagram:** fetch `/<handle>/` and read the `og:description` meta (followers, following, posts).
- **Facebook:** fetch `/<page>/` and read `og:description` (followers).
- **YouTube:** fetch the channel page for `externalId` and subscribers, then `/feeds/videos.xml?channel_id=<id>` for titles, dates and views. The feed holds only the latest 15, so 15 in the last 12 months means "15+".
- **Google:** fetch `/search?hl=en&gl=<country>&num=20&q=...` and read the result titles and links.

## Step 2: Score

Score each measure against the comparison-set median: 100 at or above the median, proportional below, 0 when absent. Leave anything not checked out of the overall. Category weights and the scoring code are in the reference `build.py` files; keep the same weights so scores compare across clients. Write the rule for each measure as a comment in the script.

## Step 3: Build the audit

1. Copy the closer reference client: `audits/clients/morne-koen/` for a person against peers, `audits/clients/jace-kizzier/` for a brand against firms.
2. Rename it to the new slug and add the client's logo next to `build.py`. If there is no logo, build a plain wordmark of the name as in Morne's script.
3. Replace the data: date, facts list, scorecard rows, exhibits, gaps, sources, 3D brands, searches, platforms and stops. Keep the section order: Current State, track record, What customers search, Website and profiles, Social and video, What is holding <name> back, the plan summary, How results are measured, About this audit.
4. 3D settings: `scene: 'marina'` for boats, `'city'` for anything else; `planDays` 90 or 180; the `labels` text matches the plan length.
5. Run `python3 audits/clients/<slug>/build.py`. Output goes to `audits/out/<slug>/`, which is not committed.

## Step 4: Plan file and plan pages

Follow `plans/README.md`. In short:

1. Copy `plans/clients/_template/` to `plans/clients/<slug>/` and add the logo.
2. Fill in `plan.json`: `days` (90 or 180), phases with one `"launch": true`, every week's tasks and outputs, the launch playbook and shot list, approvals, themes, profiles, boundaries, tools and measures. Add a `target` section when the client states a sales goal, with its assumptions labelled.
   - For metric countries, set `guide.distanceShort` and `guide.distanceLong`.
   - When articles go somewhere other than LinkedIn, set `articlesLabel`.
3. Run `npm run plans -- <slug>`. The build stops on leftover TODOs, unknown phases or totals that don't match the weeks.

Planning defaults from the reference clients:

- **Volume:** about 4 long-form videos, 16 shorts and 2 articles a month, from one 45-minute recording a month. Every new listing gets a walkthrough from the client's phone footage.
- **Week 1:**
  - A 5–10 minute calibration clip on five topics from the questionnaire.
  - Sample edits within 48 hours.
  - A 20-minute dashboard call.
- **Approvals:**
  - Thursday preview link, approve by Sunday evening.
  - Changes come back in one business day; no reply means no post.
  - A same-day fast lane during events.
  - Automatic approval phases in after the first month, starting with shorts cut from already-approved videos.
- **Launch moment:** one event the market already watches. FLIBS for yacht brokers; the holiday season and open houses for coastal estate agents.
- **Client's time:** about an hour a month, plus about 10 minutes a week for approvals.
- **Clients who won't film:** recording becomes optional. The week-1 calibration clip becomes a starter pack of five written or voice-note answers, and each month's recording becomes about 12 answers in writing or by voice note, or guides they already have. Videos are narrated (a voice they choose, on-screen text, graphics, licensed footage) and the narrator never speaks as the client. Set `copy` and the `calibration` extras in `plan.json`, as in `plans/clients/pearce-placements/`.

## Step 5: Plan document (Claude Docs)

Create it in Claude Docs, then upload the OneUpAI logo and place it above the title. Client-copy sections, in order:

1. **The goal:** what we commit to, what they commit to, and what we don't promise.
2. **Where you start:** the audit in a table against the peers, plus two standout findings.
3. **Your target, worked back:** only when the client stated a goal.
4. **Your focus:** one line used everywhere, the four themes with shares, and what stays off these channels.
5. **At a glance:** a drawn roadmap of the phases, with the launch phase highlighted.
6. **Month one:** a checklist of the home base we build.
7. **What goes out every month:** a table.
8. **Your part:** a time table and the approval rules.
9. **How we measure progress:** today against the final day.
10. **Your investment:** standard rate against their rate, monthly and for the full term, in their currency with a dated exchange rate. Add a one-sale illustration with its assumptions stated.
11. **This week:** a checklist ending with the dashboard call.

## Step 6: Check before sending

- [ ] Every figure matches its source page; peers' figures are dated
- [ ] No personal or family details; no promised results
- [ ] Open each HTML file at desktop width (1280) and phone width (390): no horizontal scroll, no console errors
- [ ] Open the plan pages inside a sandboxed iframe (like the Claude preview): no errors
- [ ] In the 3D voyage: the launch week, the last week and a few check marks work, and check marks carry over to the checklist page
- [ ] The two plan files sit in the same folder, because they link to each other by name

## Step 7: Send

- **Files:**
  - The audit report and 3D audit.
  - The two plan pages, kept together.
  - The plan doc's link.
- **First-steps email to the client:**
  - The plan link for review, asking for any changes.
  - What the calibration clip is and why, with its due date.
  - A short checklist of this week's other asks.
  - Two time options for the dashboard call.
  - Kept short: the client should find it easy, not overwhelming.

## Files in this repo

| Path | What it is |
| --- | --- |
| `audits/clients/<slug>/build.py` | One client's audit report and 3D audit, data and all |
| `audits/out/` | Built audits (not committed) |
| `plans/` | Plan-page generator; see `plans/README.md` |
| `plans/assets/report.css` | The audit-report design, shared by audits and plan pages |
| `renderer/` | The 3D audit renderer (`npm run build:report` after changing it) |
