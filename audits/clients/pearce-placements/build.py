"""Pearce Placements: written presence audit + 3D view. Every figure was collected from public pages on October 26, 2026 (see SOURCES)."""
import base64, html, json
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]          # .../oneupai-brand-audit
HERE = Path(__file__).resolve().parent              # this client's folder

OUT = str(REPO / 'audits' / 'out' / 'pearce-placements') + '/'
Path(OUT).mkdir(parents=True, exist_ok=True)
CSS = (REPO / 'plans' / 'assets' / 'report.css').read_text()
LOGO_ONEUP = 'data:image/svg+xml;base64,' + base64.b64encode((REPO / 'plans' / 'assets' / 'oneupai-logo.svg').read_bytes()).decode()
WORDMARK = '''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="200" viewBox="0 0 720 200"><rect width="720" height="200" fill="#ffffff"/>
<text x="360" y="104" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="60" font-weight="800" fill="#0f2c4a" letter-spacing="2">PEARCE PLACEMENTS</text>
<rect x="250" y="124" width="220" height="4" fill="#e8a92e"/>
<text x="360" y="162" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="22" font-weight="700" fill="#b87c0b" letter-spacing="4">YACHT CREW RECRUITMENT</text></svg>'''
(HERE / 'logo.svg').write_text(WORDMARK)
LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(WORDMARK.encode()).decode()
DATE = 'October 26, 2026'
Y, N, U, D = '<span class="ok">Yes</span>', '<b class="r">No</b>', 'Not checked', '–'


def table(head, rows, cls=''):
    h = ''.join(f'<th scope="col">{c}</th>' for c in head)
    b = ''.join('<tr>' + ''.join((f'<th scope="row">{c}</th>' if i == 0 else f'<td>{c}</td>') for i, c in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="tw"><table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def exhibit(n, title, body, source):
    return f'<figure class="ex"><figcaption><span class="exn">Exhibit {n}</span>{title}</figcaption>{body}<p class="src">{source}</p></figure>'


def section(n, title, line, body):
    return f'<section><div class="sh"><span class="sn">{n}</span><h2>{title}</h2></div><p class="line">{line}</p>{body}</section>'


def kpis(items):
    return '<div class="kpis">' + ''.join(f'<div class="kpi {"neg" if c else "pos"}"><div class="kn {c}">{n}</div><div class="kl">{l}</div></div>' for n, l, c in items) + '</div>'


def sc(v):
    if v is None:
        return U
    return f'<b class="r">{v}</b>' if v < 50 else f'<span class="ok">{v}</span>'


# ---------------------------------------------------------------- scoring
W = {'map': 2, 'profile': 2, 'reviews': 3, 'website': 2, 'rankings': 3, 'video': 3, 'ai': 3, 'social': 2, 'links': 2, 'ads': 1}
CATS = [('map', 'Map & local search', False), ('profile', 'LinkedIn company page', True), ('reviews', 'Reviews & testimonials', False), ('website', 'Website articles', True),
        ('rankings', 'Category searches', True), ('video', 'Video (own channel)', True), ('ai', 'AI assistants', False), ('social', 'Instagram', True),
        ('links', 'Facebook audience', True), ('ads', 'Paid ads', False)]
# Rules, each against the median of the three firms (YPI CREW, Seven Seas Recruitment, Morgan & Mallet International):
# LinkedIn company page = followers vs median 39K (39K, 114K, 38K);
# website articles = a blog with published posts, median yes (all three yes; Pearce's blog is empty);
# category searches = page-1 appearances in 5 web searches (excluding the name search) vs median 1 (YPI 2, Seven Seas 1, M&M 1);
# video = YouTube uploads in the last 12 months vs median 3 (3, 0, 15+);
# Instagram = followers vs median 15K (33K, 15K, 2,537); Facebook = followers vs median 41K (61K, 41K, 8.1K). Capped at 100, 0 when absent.
cap = lambda v, m: min(100, round(v / m * 100))


def vec(**kw):
    return [kw.get(k) for k, _, _ in CATS]


def overall(s):
    num = sum(v * W[k] for (k, _, _), v in zip(CATS, s) if v is not None)
    den = sum(W[k] for (k, _, _), v in zip(CATS, s) if v is not None)
    return round(num / den)


P_now = vec(profile=cap(36, 39000), website=0, rankings=0, video=0, social=cap(141, 15000), links=0)
# day 90: articles and videos are published by the plan; followers and rankings are measured, not projected, so they stay at today's score
P_plan = vec(profile=cap(36, 39000), website=100, rankings=0, video=100, social=cap(141, 15000), links=0)
YP = vec(profile=100, website=100, rankings=100, video=100, social=100, links=100)
SS = vec(profile=100, website=100, rankings=100, video=0, social=100, links=100)
MM = vec(profile=cap(38, 39), website=100, rankings=100, video=100, social=cap(2537, 15000), links=cap(8.1, 41))
OV, PL = overall(P_now), overall(P_plan)

# ---------------------------------------------------------------- report
k = kpis([('2008', 'Lucy Pearce has worked in yachting since 2008, across interior, deck and galley', ''),
          ('0', 'Fees charged to crew; placement fee for vessels is one month\'s gross salary', ''),
          ('141', 'Instagram followers, against 2,537 to 33K for the three firms compared', 'r'),
          ('0', 'Blog posts on the website, YouTube videos and Facebook pages found', 'r')])
SCORE = exhibit(1, 'Scorecard', table(['Area', 'Measure', 'Pearce Placements', 'Firm median', 'Score'], [
    ['<b>LinkedIn company page</b>', 'Followers', '36', '39K', sc(0)],
    ['<b>Website articles</b>', 'A blog with published posts', '<b class="r">Empty</b>', 'Yes (3 of 3)', sc(0)],
    ['<b>Category searches</b>', 'Page-1 appearances in 5 web searches', '0 of 5', '1 of 5', sc(0)],
    ['<b>Video (own channel)</b>', 'YouTube uploads, last 12 months', '<b class="r">No channel</b>', '3', sc(0)],
    ['<b>Instagram</b>', 'Followers', '141 (1 post)', '15K', sc(cap(141, 15000))],
    ['<b>Facebook audience</b>', 'Page followers', '<b class="r">No page found</b>', '41K', sc(0)],
    ['Reviews, AI assistants, map, ads', 'Testimonials; AI answers; Google profile; paid ads', U, D, U]]),
    'Firms: YPI CREW (Antibes), Seven Seas Recruitment (London) and Morgan &amp; Mallet International (Miami, LA, London, Dubai, French Riviera), three established yacht crew agencies. A score of 100 means at or above their median; areas marked "Not checked" are left out of the overall score.')
s1 = k + f'''
<ol class="facts">
 <li><b>A founder who has done the jobs she places.</b> Lucy Pearce is a 200GT Yachtmaster who has worked in yachting since 2008 across interior, deck and galley, with a background in Psychology &amp; Communication Science. That is the agency's strongest asset, and it appears only on the About page and her LinkedIn profile.</li>
 <li><b>A clear, crew-friendly offer.</b> Two ways to hire (Tide Placements, pay on hire; Anchor Premium, an annual subscription), MLC 2006-aligned, and no fees ever charged to crew. The Crew Hub links seven partners, including ISWAN and Nautilus International.</li>
 <li><b>A small audience.</b> 141 Instagram followers with 1 post, 36 followers on the LinkedIn company page and 599 on Lucy's own LinkedIn profile. The three firms compared have 2,537 to 33K on Instagram and 38K to 114K on LinkedIn.</li>
 <li><b>Nothing to watch or read yet.</b> No YouTube channel, no Facebook page found, and the website blog says "Check back soon". The LinkedIn company page has just started: two articles in the past week.</li>
 <li><b>Not found in category searches.</b> Pearce Placements owns its name search but appears in none of five searches captains and crew use, such as "yacht crew recruitment agency" and "yacht crew recruitment South Africa".</li>
</ol>
{SCORE}
<div class="call"><b>The opportunity:</b> The large agencies win on audience size, but their YouTube advice for captains is more than ten years old and the crew-career searches belong to individual creators. A recruiter who has worked interior, deck and galley, explaining hiring and careers on camera every week, can own the space between them: the agency captains trust to hire and crew trust to represent them.</div>'''

s2 = exhibit(2, 'What Pearce Placements offers, and the proof shown', table(
    ['Item', 'What the website shows', 'Gap'],
    [['Tide Placements', 'Pay as you go: the fee is one month\'s gross salary, paid on hire', 'The page is a form with 17 words of text'],
     ['Anchor Premium', 'Annual subscription; tiers by crew size; discounted rates', 'Prices not shown; the page is a form with 27 words of text'],
     ['Crew Hub', 'Seven partners (ISWAN, Nautilus International, Standard Bank, Crewdentials and others); sample SEA and MLC downloads', '633 words: the most useful page on the site'],
     ['Crew portal', 'Registration through Crewdentials', '–'],
     ['Compliance', 'MLC 2006-aligned; no fees charged to crew', 'Not explained anywhere a captain would search for it'],
     ['Proof', 'No testimonials, case studies or placement numbers', 'One public job post found: Chief Engineer, 43m sailing yacht, on Yotspot (June 4, 2026)']]),
    f'Source: pearceplacements.com pages and a web search for "Pearce Placements", {DATE}.') + '''
<ol class="facts">
 <li><b>A fair model, not explained.</b> No fees to crew and a one-month fee on hire are clear selling points. Neither has a page that answers a captain's questions about cost, guarantees or compliance.</li>
 <li><b>No proof yet.</b> Captains choosing an agency look for placements made and captains who vouch for it. None are published.</li>
</ol>'''

s3 = exhibit(3, 'Where Pearce Placements appears in web searches', table(
    ['Search', 'What page 1 shows', 'Pearce on page 1'],
    [['pearce placements', 'pearceplacements.com and a Yotspot job post', Y],
     ['yacht crew recruitment agency', 'Tiger Recruitment, Meridian, YPI CREW, Crew Network, Seven Seas, YOA, Bespoke Crew, Morgan &amp; Mallet, Marinescence', N],
     ['yacht crew agency UK', 'Tiger Recruitment, a Flying Fish list, 19 London, Superyacht Crew UK, Saltwater, Crew &amp; Concierge, Winch, J4Crew', N],
     ['how to hire yacht crew (captain guide, placement fee)', 'Lighthouse Careers ("How to Hire a Captain: 2026 Guide"), Quarterdeck, Oceanside, Yachtly Crew', N],
     ['yacht crew recruitment South Africa', 'LinkedIn jobs, Hire Resolve, Yachting Pages Cape Town, YOA, a Naviteach top-10 list', N],
     ['MLC compliant yacht crew agency, no fees for crew', 'yachtcrew.uk, Crew Network, YPI CREW, Bespoke Crew, MYS', N]]),
    f'Source: web searches on {DATE} (the Google results page asked for a CAPTCHA, so these were run through a web search tool). YPI CREW appears in 2 of the 5 category searches; Seven Seas and Morgan &amp; Mallet in 1 each.') + exhibit(4, 'What ranks on YouTube for yacht crew topics', table(
    ['Video', 'Channel', 'Views', 'Who it serves'],
    [['"Yacht Crew Recruitment Interview Questions \'Tell Me About Yourself\'"', 'YPI CREW (over ten years old)', '82,021', 'Crew'],
     ['"Interview with a superyacht captain"', 'YPI CREW (over ten years old)', '36,915', 'Captains and crew'],
     ['"How to Recruit Yacht Crew in a Candidate Short Market"', 'YPI CREW (over ten years old)', '6,780', 'Captains'],
     ['"How To Get A Job On A Yacht With NO EXPERIENCE"', 'Work on a Superyacht', '114,816', 'Crew'],
     ['A yacht job guide; an STCW overview', 'Jared Watney', '164,901; 59,850', 'Crew'],
     ['"How Much Do SuperYacht Crew Get PAID?"', 'Super Yacht Captain', '302,555', 'Crew'],
     ['Day-in-the-life videos', 'Lost_Lauryn; TheCrewChef', '413,099; 888,687', 'Crew'],
     ['An agency video for "yacht crew agency antibes"', 'Morgan &amp; Mallet', '534', 'Captains']]),
    f'Source: YouTube searches for agency, hiring and crew-career terms, {DATE}. Views as shown on YouTube that day.') + '''
<ol class="facts">
 <li><b>The hiring side is open.</b> The agency videos that answer captains\' questions are more than ten years old. No agency publishes current advice on hiring, interviewing or keeping crew.</li>
 <li><b>The career side is crowded, but not by recruiters.</b> Crew-career searches belong to crew creators with 100K+ views. A recruiter\'s view of CVs, interviews and what captains ask for is missing.</li>
</ol>'''

s4 = exhibit(5, 'The website, page by page', table(
    ['Page', 'What it shows', 'Gap'],
    [['Home', '545 words; H1 "RECRUITMENT AGENCY"; title "Yacht Crew Recruitment &amp; Jobs | Pearce Placements"; one embedded video', 'The H1 doesn\'t say yacht crew; no testimonials; no social links'],
     ['Yacht Placement Service', 'Overview of the two ways to hire', 'Heading "RECRUTING ?" is misspelled'],
     ['Tide Placements; Anchor Premium', 'Forms', '17 and 27 words: nothing for search engines or captains to read'],
     ['Crew Hub', '633 words, partners, SEA and MLC samples', 'Strongest page; not linked from social'],
     ['Crew Jobs &amp; Guidance', '261 words', 'Short for the most-searched topic in the industry'],
     ['FAQ', '344 words', 'Page title spelled "Recruiment"'],
     ['Blog', '"Check back soon"', 'No posts'],
     ['Technical', 'Wix; a meta description on every page; sitemap updated Oct 21, 2026', 'Only basic WebSite schema; footer reads "© 2025 Pearce Placement"; credits Strategytask']]),
    f'Source: pearceplacements.com, read page by page on {DATE}.')

s5 = exhibit(6, 'Social and video against three established agencies', table(
    ['Platform', 'Pearce Placements', 'YPI CREW', 'Seven Seas Recruitment', 'Morgan &amp; Mallet'],
    [['Base', 'UK registered office; founder in Ballito, South Africa', 'Antibes; since 2002', 'London; 9-person team', 'Miami, LA, London, Dubai, French Riviera; household, hospitality and yacht staffing'],
     ['Instagram followers (posts)', '141 (1)', '33K (1,973)', '15K (1,486)', '2,537 (802)'],
     ['Facebook followers', '<b class="r">No page found</b>', '61K', '41K', '8.1K'],
     ['LinkedIn company followers', '36', '39K', '114K', '38K'],
     ['Founder on LinkedIn', 'Lucy Pearce: 599 followers, mostly reposts', D, D, D],
     ['YouTube', '<b class="r">No channel</b>', '1.75K subscribers; 3 uploads in 12 months, latest Feb 24, 2026', 'None found', '4.82K subscribers; 15+ uploads in 12 months, automated job ads with few views'],
     ['TikTok', 'None', '2 followers, 0 videos (not confirmed)', '463 followers, 10 videos', '1,081 followers, 319 videos'],
     ['Website articles', 'Blog empty', 'Monthly market overviews', 'Latest post Dec 12, 2025', 'Posts, undated'],
     ['Proof on the website', 'None', 'Lloyd\'s MLC audit', 'MCA/MLC badges; 5 anonymous testimonials', '–']]),
    f'Figures read from each public profile on {DATE}. YouTube uploads counted from each channel\'s feed, which holds the latest 15. These are presence measures, not a ranking of each firm\'s business.')

gaps = [
    ('No proof.', 'No testimonials, case studies or placements described. Captains choosing an agency have nothing to go on beyond the offer.'),
    ('The founder is hidden.', 'Lucy\'s time at sea since 2008 is the agency\'s difference, and it appears only on the About page and LinkedIn.'),
    ('Nothing to watch or read.', 'No YouTube channel, an empty blog and one Instagram post. There is no reason to follow the agency yet.'),
    ('Service pages that say almost nothing.', 'The two ways to hire are forms with 17 and 27 words. Search engines and captains can\'t tell what they include.'),
    ('Not found in category searches.', 'Zero of five. The agencies that appear publish pages and guides that answer the search.'),
    ('Small typos on key pages.', '"RECRUTING ?" on the placement page and "Recruiment" in the FAQ title. Small, but captains notice them.'),
    ('No route between the site and social.', 'The website has no links to Instagram or LinkedIn, so visitors who like what they read have nowhere to follow.'),
]
s6 = '<ol class="gaps">' + ''.join(f'<li><b>{a}</b> {b}</li>' for a, b in gaps) + '</ol>'

s7 = '''<div class="tl" style="grid-template-columns:repeat(4,1fr)">
<div class="ph"><b>Weeks 1–3</b><span>Website fixes and service pages, YouTube and Facebook set up, calibration clip, first recording</span></div>
<div class="ph"><b>Weeks 4–7</b><span>Hiring authority: interview questions, fees, MLC 2006, why crew leave, the CV checklist</span></div>
<div class="ph"><b>Weeks 8–9</b><span>Year-end posts and the Med season hiring guide, ready for January</span></div>
<div class="ph p3"><b>Weeks 10–13</b><span>Med season hiring: the guide to captains, first-job advice to crew, day-90 report</span></div></div>''' + exhibit(7, 'Every month, from month one and continuing after day 90', table(
    ['What', 'Each month', 'Made with'],
    [['Long-form videos on the Pearce Placements YouTube channel', '4', 'Lucy\'s recordings, edited by OneUpAI'],
     ['Short captioned clips for LinkedIn, Instagram, Facebook and YouTube', '16', 'OneUpShorts'],
     ['Articles on the website, shared on LinkedIn', '2', 'Lucy\'s recorded answers'],
     ['Role posts for open positions', 'Each role', 'Your job briefs, with the captain\'s permission'],
     ['Weekly LinkedIn posts in Lucy\'s name', '4', 'Cut from each video'],
     ['Website, service pages and profile upkeep', 'Ongoing', 'OneUpAI']]),
    'Full plan, week by week: Pearce Placements, Your 90-Day Plan. After day 90 the same output continues on a set monthly rhythm.')

s8 = exhibit(8, 'How results are measured', table(
    ['Level', 'Measures', 'How often'],
    [['Published', 'Videos, shorts, articles and role posts that went out', 'Weekly'],
     ['Found', 'Category searches; YouTube views and subscribers; followers on each platform', 'Monthly'],
     ['Contacted', 'Captain and management-company inquiries, Anchor Premium inquiries, crew registrations, and where each came from', 'Weekly'],
     ['Hired', 'Roles taken on and placements made', 'Monthly, from your own numbers']]),
    'Placements and fees are reported, not promised; the plan measures the pipeline that leads to them.')

SOURCES = [
    ('Pearce Placements website (all pages)', 'https://www.pearceplacements.com/'),
    ('Instagram: @pearceplacements', 'https://www.instagram.com/pearceplacements/'),
    ('LinkedIn: Pearce Placements company page', 'https://www.linkedin.com/company/pearceplacements/'),
    ('LinkedIn: Lucy Pearce (profile and activity)', 'https://www.linkedin.com/in/lucy-pearce-05856b80/'),
    ('YPI CREW: website, Instagram, Facebook, LinkedIn, YouTube', 'https://www.ypicrew.com/'),
    ('Seven Seas Recruitment: website, Instagram, Facebook, LinkedIn, TikTok', 'https://www.sevenseasrecruitment.com/'),
    ('Morgan &amp; Mallet International: website, Instagram, Facebook, LinkedIn, YouTube, TikTok', 'https://www.morganmallet.agency/'),
    ('YPI CREW: What are the main yachting seasons', 'https://ypicrew.com/what-are-the-main-yachting-seasons'),
]
s9 = f'<p>A baseline audit from public sources, checked by hand on {DATE}. Figures are as published; anything not verified is marked "Not checked" or "–" rather than estimated. Checks that found nothing (Facebook, YouTube and TikTok under "pearceplacements") are reported as not found. The three firms are established yacht crew agencies; their figures come from their public profiles and are not a ranking of their businesses.</p><ul class="sources">' + ''.join(
    f'<li><a href="{u}">{n}</a></li>' for n, u in SOURCES) + f'<li>Yotspot job post by Pearce Placements: Chief Engineer, 43m sailing yacht, posted June 4, 2026 (found by web search)</li><li>Web searches and YouTube searches on {DATE} (Exhibits 3 and 4)</li></ul>'

SECTIONS = [
    ('Current State', 'A credible founder and a fair offer, with almost no public presence yet.', s1),
    ('Offer and proof', 'Two clear ways to hire and no fees to crew; nothing yet that shows the work.', s2),
    ('What captains and crew search', 'The name search is theirs; category searches and YouTube advice belong to others, and the hiring side is out of date.', s3),
    ('Website and profiles', 'Twelve pages with a solid Crew Hub, two near-empty service pages and an empty blog.', s4),
    ('Social and video', 'The three firms have tens of thousands of followers; Pearce Placements is starting from close to zero.', s5),
    ('What is holding Pearce Placements back', 'Seven gaps, most important first.', s6),
    ('90 days to an established voice', 'Month one builds the base; months two and three put Lucy in front of captains and crew every week, leading into the Med season hiring window.', s7),
    ('How results are measured', 'Four levels, from content published to placements, tracked against this baseline.', s8),
    ('About this audit', f'A baseline audit from public sources, checked by hand on {DATE}.', s9),
]
body = ''.join(section(i + 1, t, l, b) for i, (t, l, b) in enumerate(SECTIONS))
report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pearce Placements · Presence Audit</title>
<style>{CSS}
.clogo {{ width: auto; height: 104px; max-width: 62vw; object-fit: contain; }}
.tw tbody td {{ text-align: left; }}
.line {{ white-space: normal; }}
@media (max-width: 760px) {{ .tl {{ grid-template-columns: 1fr 1fr !important; }} .clogo {{ height: 64px; }} }}
</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="{LOGO}" alt="Pearce Placements"><img class="olog" src="{LOGO_ONEUP}" alt="OneUpAI"></div>
 <p class="kicker">Presence audit · yacht crew recruitment · founder Lucy Pearce</p>
 <h1>Pearce Placements</h1>
 <p class="meta">Prepared for <b>Lucy Pearce, Pearce Placements</b> · Prepared by <b>Nick Zarzycki, OneUpAI</b> · {DATE}</p>
 <span class="status">Baseline audit</span>
</div></header>
<main>{body}</main>
<footer><span>Prepared by Nick Zarzycki, OneUpAI · nz@oneupai.com</span><span>Confidential · Pearce Placements</span></footer>
</body></html>'''
open(OUT + 'pearce-placements-presence-audit-report.html', 'w').write(report)


# ---------------------------------------------------------------- 3D
def P(id, name, users, label, color, kind, status, plan, fit, comps, content, note, fix):
    return dict(id=id, name=name, users=users, usersLabel=label, color=color, kind=kind, status=status, planStatus=plan, fit=fit, comps=comps, content=content, note=note, fix=fix)


NOTE = f'Position from one web search on {DATE}. Monthly search volumes are measured in the full audit.'
kw = lambda term, owner, plan_owner, order: {'term': term, 'volume': None, 'owner': owner, 'video': None, 'videoOwner': None, 'planOwner': plan_owner, 'evidence': [], 'note': NOTE, 'rows': [['Page 1', order]]}
z = [0] * 12
ypi_months = [0] * 12
ypi_months[3] = 1  # Feb 2026 upload; 3 uploads in the last 12 months (Nov 2025 – Oct 2026), months of the other two not recorded

brands = [
    {'id': 'client', 'name': 'Pearce Placements', 'color': '#e8a92e', 'client': True, 'scores': P_now, 'months': z, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': OV,
     'videoNote': 'No YouTube channel found under "pearceplacements". One video is embedded on the home page.',
     'rows': [['Instagram', '141 followers, 1 post'], ['LinkedIn company page', '36 followers'], ["Lucy Pearce's LinkedIn", '599 followers'], ['Facebook', 'No page found'], ['Website blog', 'Empty'], ['Category searches', '0 of 5']],
     'proposed': {'scores': P_plan, 'overall': PL, 'months': [1] * 12, 'reviews': None, 'domains': None, 'speed': None, 'ads': None,
                  'rows': [['YouTube', '4 long-form videos a month'], ['Shorts', '16 a month'], ['Website', '2 articles a month; service pages rewritten'], ['Followers, searches, placements', 'Measured monthly, not projected']]}},
    {'id': 'a', 'name': 'YPI CREW', 'color': '#4a7fe0', 'scores': YP, 'months': ypi_months, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(YP),
     'videoNote': 'YouTube: 1.75K subscribers; 3 uploads in the last 12 months, latest Feb 24, 2026. Its most-viewed advice videos are over ten years old.',
     'rows': [['Base', 'Antibes, since 2002'], ['Instagram', '33K followers'], ['Facebook', '61K followers'], ['LinkedIn', '39K followers'], ['Website', 'Monthly market overviews']]},
    {'id': 'b', 'name': 'Seven Seas Recruitment', 'color': '#8d69d8', 'scores': SS, 'months': z, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(SS),
     'videoNote': 'No YouTube channel found. TikTok: 463 followers, 10 videos.',
     'rows': [['Base', 'London'], ['Instagram', '15K followers'], ['Facebook', '41K followers'], ['LinkedIn', '114K followers']]},
    {'id': 'c', 'name': 'Morgan & Mallet', 'color': '#2fa58d', 'scores': MM, 'months': [1] * 12, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(MM),
     'videoNote': 'YouTube: 4.82K subscribers; 15+ uploads in the last 12 months, mostly automated job-ad videos with few views.',
     'rows': [['Offices', 'Miami, LA, London, Dubai, French Riviera'], ['Instagram', '2,537 followers'], ['Facebook', '8.1K followers'], ['LinkedIn', '38K followers'], ['TikTok', '1,081 followers, 319 videos']]},
]
kws = [
    kw('pearce placements', 'client', 'client', 'pearceplacements.com and a Yotspot job post'),
    kw('yacht crew recruitment agency', 'a', 'client', 'Tiger, Meridian, YPI CREW, Crew Network, Seven Seas, YOA, Bespoke, Morgan & Mallet'),
    kw('yacht crew agency uk', None, 'client', 'None of the four: Tiger, 19 London, Superyacht Crew UK and others'),
    kw('how to hire yacht crew', None, 'client', 'None of the four: Lighthouse Careers, Quarterdeck, Oceanside, Yachtly Crew'),
    kw('yacht crew recruitment south africa', None, 'client', 'None of the four: LinkedIn jobs, Hire Resolve, Yachting Pages Cape Town'),
    kw('mlc compliant yacht crew agency', 'a', 'client', 'yachtcrew.uk, Crew Network, YPI CREW, Bespoke, MYS'),
    kw('yacht crew interview questions (YouTube)', 'a', 'client', 'YPI CREW, 82,021 views, over ten years old'),
    kw('how to get a job on a yacht (YouTube)', None, 'client', 'Crew creators: Work on a Superyacht, Jared Watney'),
]
plats = [
    P('linkedin', 'LinkedIn', 3.1e8, 'monthly users (est.)', '#2f6fb0', 'content', 'active', 'active', 'High', ['a', 'b', 'c'], ['Hiring advice', 'Market notes', 'Role posts'],
      'Company page 36 followers, two articles in the past week; Lucy 599 followers, mostly reposts. Firms: 38K to 114K.', 'Weekly posts from Lucy and the company page'),
    P('youtube', 'YouTube', 2.5e9, 'monthly users (est.)', '#e0473d', 'mixed', 'none', 'active', 'High', ['a', 'c'], ['Hiring guides', 'Interview questions', 'Crew careers'],
      'No channel. YPI CREW: 3 uploads in 12 months; Morgan & Mallet: automated job ads.', '4 long-form videos a month'),
    P('instagram', 'Instagram', 3.0e9, 'monthly users', '#d0458f', 'content', 'active', 'active', 'High', ['a', 'b', 'c'], ['Shorts', 'Role posts'],
      '141 followers, 1 post. Firms: 2,537 to 33K.', '16 shorts a month'),
    P('facebook', 'Facebook', 3.1e9, 'monthly users (est.)', '#3b67c9', 'content', 'none', 'active', 'Medium', ['a', 'b', 'c'], ['Role posts', 'Crew advice'],
      'No page found. Firms: 8.1K to 61K.', 'A business page posting weekly'),
    P('google', 'Google Search', None, 'Agency and hiring searches', '#4f7de0', 'search', 'active', 'active', 'High', ['a', 'b', 'c'], ['yacht crew recruitment agency', 'how to hire yacht crew', 'yacht crew recruitment south africa'],
      'Name search only. 0 of 5 category searches.', 'Service pages, hiring guide and 2 articles a month'),
    P('chatgpt', 'AI assistants', 9.0e8, 'ChatGPT weekly users alone', '#2f8a6d', 'search', 'unknown', 'unknown', 'High', [], ['Which yacht crew agency should I use?'],
      'Not checked in this manual audit.', 'Question shorts and website answers'),
]
qs = ['Which yacht crew agency should I use?', 'How do I hire a stewardess for the Med season?', 'Which crew agencies charge no fees to crew?', 'How do I get my first yacht job?']
stops = [
    {'key': 'overview', 'label': 'Overview', 't': f'Pearce Placements scores {OV} on the areas checked, against three established yacht crew agencies.',
     'b': 'Gold is Pearce Placements. The areas checked are LinkedIn, website articles, category searches, YouTube, Instagram and Facebook. A score of 100 means at or above the median of the three firms. Click anything for details.',
     'tp': f'With the YouTube channel and website articles live: {PL} on the same areas.', 'bp': 'Followers, search positions and placements are not projected; the monthly report measures them.'},
    {'key': 'graph', 'label': 'Audience', 't': 'A small audience on Instagram and LinkedIn; no Facebook page or YouTube channel.',
     'b': 'Sphere size is audience size. A gold path means Pearce Placements is active there; dashed means absent or not checked.',
     'tp': 'After the plan: Lucy on camera every week on YouTube, LinkedIn, Instagram and Facebook, all pointing to the website.', 'bp': 'One recording a month feeds the month of videos and shorts.'},
    {'key': 'kw', 'label': 'Searches', 't': 'The name search is theirs. Agency, hiring and career searches show other agencies and creators.',
     'b': 'Each tower is a search. Its color is whichever of the four appears; grey means none of them.',
     'tp': 'The plan targets hiring, MLC and South Africa searches, and the YouTube hiring questions, first.', 'bp': 'Gold caps are the searches the plan targets.'},
    {'key': 'store', 'label': 'Uploads', 't': 'No YouTube uploads, so no windows are lit.',
     'b': 'The 12 lit windows are the last 12 months; a lit window means a YouTube upload that month.',
     'tp': 'Weekly videos light every window from here on.', 'bp': 'Hiring guides, interview questions, crew careers and Lucy\'s market notes.'},
    {'key': 'reviews', 'label': 'Proof', 't': 'No testimonials, case studies or placements described on the website.',
     'b': 'Reviews were not checked for the firms, so no crowds are shown.',
     'tp': 'After each placement, the captain and the crew member are asked for a short testimonial.', 'bp': 'Published only with their permission; no vessel names unless they agree.'},
    {'key': 'video', 'label': 'Video', 't': 'No channel. The agency advice videos that rank are over ten years old.',
     'b': 'YPI CREW posted 3 videos in the last 12 months; Morgan & Mallet posts automated job ads; Seven Seas has no channel.',
     'tp': 'Lucy answers captains\' and crew questions on camera every week.', 'bp': 'Edited by OneUpAI from her recordings.'},
    {'key': 'comp', 'label': 'Firms', 't': 'The large agencies lead on audience, not on current advice.',
     'b': "The people walking in are each agency's share of presence among the four, based on the areas checked.",
     'tp': 'With the plan, attention shifts toward Pearce Placements.', 'bp': 'An illustration based on the areas checked; inquiries are measured monthly.'},
    {'key': 'plan', 'label': '90-day plan', 't': 'The 90-day plan', 'b': '', 'tp': 'The 90-day plan', 'bp': '',
     'list': ['Website fixed: service pages, typos, social links', 'YouTube channel and Facebook page set up',
              'Calibration clip, then one recording a month', '4 long-form videos and 16 shorts a month',
              'Hiring guides for captains; career advice for crew', 'A Med season hiring guide in January',
              'Testimonials after each placement', 'Day-90 report, then a monthly rhythm']},
]
D = {'version': 1, 'planDays': 90, 'scene': 'marina', 'sample': False, 'generatedAt': '2026-10-26T17:00:00.000Z',
     'client': {'name': 'Pearce Placements', 'industry': 'Yacht crew recruitment', 'market': 'Yacht crew recruitment · UK & South Africa', 'initials': 'PP', 'logo': LOGO},
     'categories': [{'key': k, 'label': l, 'weight': W[k], 'checked': c} for k, l, c in CATS],
     'brands': brands, 'keywords': kws,
     'ai': {'questions': qs, 'headline': qs[0], 'rows': [], 'clientNamed': 0, 'total': 0, 'projectedNamed': None},
     'map': {'n': 5, 'keyword': 'yacht crew agency', 'home': [2, 2], 'grid': [[None] * 5 for _ in range(5)], 'planGrid': [[None] * 5 for _ in range(5)], 'labels': [], 'checked': False},
     'platforms': plats, 'stops': stops, 'details': {}, 'evidence': {},
     'labels': {'planOn': '90-day plan: on', 'planOff': 'Show the 90-day plan', 'scoreToday': 'Score on the areas checked', 'scorePlan': "With the plan's channel and articles live", 'scoreRow': 'Score on the areas checked'},
     'chip': f'Baseline audit · public data, {DATE}'}
tpl = (REPO / 'renderer' / 'template.html').read_text()
js = (REPO / 'public' / 'report' / 'app.js').read_text().replace('</script', '<\\/script')
e = html.escape
out = (tpl.replace('{{TITLE}}', e('Pearce Placements · Presence audit')).replace('{{CLIENT}}', e('Pearce Placements')).replace('{{MARKET}}', e(D['client']['market'])).replace('{{CHIP}}', e(D['chip']))
       .replace('<script src="/report/app.js?v={{VERSION}}" defer></script>', '<script>' + js + '</script>').replace('{{DATA}}', json.dumps(D).replace('<', '\\u003c')))
assert '{{' not in out
open(OUT + 'pearce-placements-presence-audit-3d.html', 'w').write(out)
print('Pearce', OV, '->', PL, '| firms', [b['overall'] for b in brands[1:]])
