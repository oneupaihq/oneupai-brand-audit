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


def table(head, rows, cls='', left=()):
    """Short values (numbers, yes/no, names) are centred; columns listed in `left` hold sentences and stay left-aligned."""
    al = lambda i: ' class="l"' if i in left else ''
    h = ''.join(f'<th scope="col"{al(i)}>{c}</th>' for i, c in enumerate(head))
    b = ''.join('<tr>' + ''.join((f'<th scope="row">{c}</th>' if i == 0 else f'<td{al(i)}>{c}</td>') for i, c in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="tw"><table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def exhibit(n, title, body, source):
    return f'<figure class="ex"><figcaption><span class="exn">Exhibit {n}</span>{title}</figcaption>{body}<p class="src">{source}</p></figure>'


def section(n, title, line, body, why):
    return (f'<section><div class="sh"><span class="sn">{n}</span><h2>{title}</h2></div><p class="line">{line}</p>{body}'
            f'<div class="why"><b>Why this matters</b><p>{why}</p></div></section>')


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
# category searches = page-1 appearances in 15 web searches (excluding the name search) vs median 1 (YPI 4, Seven Seas 1, M&M 1);
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
    ['<b>Category searches</b>', 'Page-1 appearances in 15 web searches', '0 of 15', '1 of 15', sc(0)],
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
 <li><b>Not found in category searches.</b> Pearce Placements owns its name search but appears in none of fifteen searches captains and crew use worldwide, from "yacht crew recruitment agency" to "yacht crew agency Antibes" and "yacht stewardess jobs".</li>
</ol>
{SCORE}
<div class="call"><b>The opportunity:</b> The large agencies win on audience size, but most of their YouTube advice for captains is 10 to 14 years old and the crew-career searches belong to individual creators. A recruiter who has worked interior, deck and galley, publishing clear answers on hiring and careers every week, can own the space between them: the agency captains trust to hire and crew trust to represent them.</div>'''

s2 = exhibit(2, 'What Pearce Placements offers, and the proof shown', table(
    ['Item', 'What the website shows', 'Gap'],
    [['Tide Placements', 'Pay as you go: the fee is one month\'s gross salary, paid on hire', 'The page is a form with 17 words of text'],
     ['Anchor Premium', 'Annual subscription; tiers by crew size; discounted rates', 'Prices not shown; the page is a form with 27 words of text'],
     ['Crew Hub', 'Seven partners (ISWAN, Nautilus International, Standard Bank, Crewdentials and others); sample SEA and MLC downloads', '633 words: the most useful page on the site'],
     ['Crew portal', 'Registration through Crewdentials', '–'],
     ['Compliance', 'MLC 2006-aligned; no fees charged to crew', 'Not explained anywhere a captain would search for it'],
     ['Proof', 'No testimonials, case studies or placement numbers', 'One public job post found: Chief Engineer, 43m sailing yacht, on Yotspot (June 4, 2026)']], left=(1, 2)),
    f'Source: pearceplacements.com pages and a web search for "Pearce Placements", {DATE}.') + '''
<ol class="facts">
 <li><b>A fair model, not explained.</b> No fees to crew and a one-month fee on hire are clear selling points. Neither has a page that answers a captain's questions about cost, guarantees or compliance.</li>
 <li><b>No proof yet.</b> Captains choosing an agency look for placements made and captains who vouch for it. None are published.</li>
</ol>'''

Q = lambda t: f'<span class="kw">{t}</span>'
s3 = exhibit(3, 'Where Pearce Placements appears in web searches, worldwide', table(
    ['Search', 'Intent', 'What page 1 shows', 'Pearce', 'Firms on page 1'],
    [[Q('pearce placements'), 'Brand', 'pearceplacements.com and a Yotspot job post', Y, D],
     [Q('yacht crew recruitment agency'), 'Hiring', 'Tiger Recruitment, Meridian, YPI CREW, Crew Network, Seven Seas, YOA, Bespoke Crew, Morgan &amp; Mallet, Marinescence', N, 'YPI CREW, Seven Seas, Morgan &amp; Mallet'],
     [Q('superyacht crew recruitment agency'), 'Hiring', 'SuperyachtNews directory profiles, Faststream, Quay Group, Crew Pacific, news of a new agency', N, 'None'],
     [Q('yacht captain recruitment agency'), 'Hiring', 'Tiger Recruitment, Quay Group, Wilson Halligan, Abacus &amp; March', N, 'None'],
     [Q('MLC compliant yacht crew agency, no fees for crew'), 'Hiring', 'yachtcrew.uk, Crew Network, YPI CREW, Bespoke Crew, MYS', N, 'YPI CREW'],
     [Q('how to hire yacht crew'), 'Advice', 'Guides from Lighthouse Careers ("How to Hire a Captain: 2026 Guide"), Quarterdeck, Oceanside, Yachtly Crew', N, 'None'],
     [Q('yacht crew placement fee'), 'Advice', 'A YachtBuyer guide, YachtForums threads, Quarterdeck help pages, a Breeze Yachting salary guide', N, 'None'],
     [Q('yacht crew agency Antibes'), 'Hub', 'Dockwalk\'s agency list, Yachting Pages directory, Bluewater, Fraser (TCN Antibes), N&amp;J Crew', N, 'None'],
     [Q('yacht crew agency Palma de Mallorca'), 'Hub', 'Mallorca.com listings (Abeam Crew, The Crew Network, Luxury Yacht Group, Van Allen), Dockwalk\'s agency list', N, 'None'],
     [Q('yacht crew agency Fort Lauderdale'), 'Hub', 'The Crew Network, Dockwalk\'s agency list, Fraser (TCN), Yachting Pages directory', N, 'None'],
     [Q('yacht crew agency UK'), 'Hub', 'Tiger Recruitment, a Flying Fish list, 19 London, Superyacht Crew UK, Saltwater, Crew &amp; Concierge, Winch, J4Crew', N, 'None'],
     [Q('yacht crew agency Australia'), 'Hub', 'Crew Pacific, Superyacht Crew International, Yachting Pages directory, MYS Australia', N, 'None'],
     [Q('yacht crew recruitment South Africa'), 'Hub', 'LinkedIn jobs, Hire Resolve, Yachting Pages Cape Town, YOA, a Naviteach top-10 list', N, 'None'],
     [Q('yacht stewardess jobs'), 'Crew jobs', 'YaCrew job board, Lighthouse Careers guides, YPI CREW\'s stewardess jobs page, Dockwalk career advice', N, 'YPI CREW'],
     [Q('yacht deckhand jobs no experience'), 'Crew jobs', 'Travel blogs, a GetMyBoat guide, YaCrew listings, Yotspot FAQs', N, 'None'],
     [Q('yacht chef jobs'), 'Crew jobs', 'YPI CREW\'s chef jobs and guide pages, Lighthouse Careers, YaCrew, Only Chefs', N, 'YPI CREW']], left=(2,)),
    f'Source: web searches on {DATE}, run through a web search tool because the Google results page asked for a CAPTCHA; results may differ by country. Across the 15 category searches, Pearce Placements appears in none, YPI CREW in 4, Seven Seas and Morgan &amp; Mallet in 1 each. Whether Pearce Placements is listed in the Dockwalk and Yachting Pages directories was not checked.') + '''
<ol class="facts">
 <li><b>Hub searches go to directories.</b> For Antibes, Palma, Fort Lauderdale and Australia, page 1 is mostly Dockwalk\'s and Yachting Pages\' agency lists. A listing in each is the quickest way onto those pages.</li>
 <li><b>Advice searches go to guides.</b> "How to hire yacht crew" and "placement fee" are answered by guides from Lighthouse Careers, Quarterdeck and YachtBuyer, not by agencies\' service pages. Articles that answer these questions can compete.</li>
 <li><b>Job searches go to job pages.</b> YPI CREW ranks with a page per role (stewardess, chef). Pearce Placements has no page per role yet.</li>
</ol>''' + exhibit(4, 'What ranks on YouTube, search by search', table(
    ['Search', 'Top results (views, age)', 'Agencies in the top 6', 'Newest agency video'],
    [[Q('yacht crew recruitment'), 'YPI CREW holds 5 of the top 6: "Tell Me About Yourself" 82,021 (14 yrs); "Interview with a superyacht captain" 36,922 (4 yrs)', 'YPI CREW', '4 yrs'],
     [Q('yacht crew interview questions'), 'YPI CREW: 36,921 (4 yrs), 23,040 (13 yrs), 19,257 (14 yrs), 7,820 (11 yrs); Flying Fish 14,162 (6 yrs)', 'YPI CREW', '4 yrs'],
     [Q('how to hire yacht crew'), 'Emery Wallerich, "Yacht crew hiring do\'s &amp; don\'ts" 1,756 (4 months); YPI CREW 6,780 (10 yrs); Work on a Superyacht', 'YPI CREW', '10 yrs'],
     [Q('yacht crew agency'), 'Work on a Superyacht 28,788 (5 yrs); Morgan &amp; Mallet 321 (2 yrs); YPI CREW 6,780 (10 yrs)', 'Morgan &amp; Mallet, YPI CREW', '2 yrs'],
     [Q('yacht crew retention'), 'YPI CREW 36,921 (4 yrs); Yachting International Radio 2,638 and 2,934 (4 and 7 months); Reardon Yacht Consulting 442', 'YPI CREW', '4 yrs'],
     [Q('MLC 2006 yacht crew'), 'YPI CREW 1,360 (13 yrs); Steering Mariners 39,899 (7 yrs); exam-prep channels', 'YPI CREW', '13 yrs'],
     [Q('first yacht job'), 'Jared Watney 164,904 (9 yrs); Work on a Superyacht 114,821 (5 yrs); Emery Wallerich 80,300 (3 yrs); Chase Lemacks 72,742 (2 yrs)', 'None', D],
     [Q('how to become a yacht deckhand'), 'Work on a Superyacht 114,816 and 96,567 (5 yrs); Chase Lemacks 72,724 (2 yrs); Erik Valent 18,255 (3 yrs)', 'None', D],
     [Q('how to become a yacht stewardess'), 'Baker Manning 26,443 (7 yrs); Start Yachting 17,368 (5 yrs); Chase Lemacks 72,724 (2 yrs)', 'None', D],
     [Q('how to become a yacht chef'), 'TheCrewChef 1,290,446 (4 yrs); The Yacht Chef 3,006 (3 months)', 'None', D],
     [Q('superyacht crew salary'), 'Jared Watney 752,076 (8 yrs); Super Yacht Captain 302,559 (2 yrs); Yacht News 83,338 (3 yrs)', 'None', D],
     [Q('yacht CV tips'), 'Work on a Superyacht 15,752 (6 yrs); The Saffa 1,665 (5 yrs); CaptLiamDevlin 1,109 (1 yr); Emery Wallerich 744 (3 months)', 'None', D]], left=(1,)),
    f'Source: YouTube searches on {DATE}; views and ages as YouTube showed them that day. "Agencies" means recruitment agencies; Flying Fish is a training school with a crew service.') + '''
<ol class="facts">
 <li><b>Agencies only appear on recruitment searches, with old videos.</b> YPI CREW\'s videos rank for recruitment, interviews, retention and MLC 2006; most are 10 to 14 years old and the newest is 4 years old. The only recent hiring video is a crew creator\'s, 4 months old, with 1,756 views.</li>
 <li><b>Career searches have big audiences and no recruiter.</b> First-job, deckhand, stewardess, chef and salary searches are led by crew creators with 17,000 to 1.29 million views. No agency appears in the top 6 for any of them.</li>
 <li><b>The CV search is the easiest to win.</b> The top "yacht CV tips" video has 15,752 views and is 6 years old; recent entries have under 2,000. A recruiter who reads CVs every day is the natural voice for it.</li>
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
     ['Technical', 'Wix; a meta description on every page; sitemap updated Oct 21, 2026', 'Only basic WebSite schema; footer reads "© 2025 Pearce Placement"; credits Strategytask']], left=(1, 2)),
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
    ('Not found in category searches.', 'Zero of fifteen, worldwide. What ranks instead is directory listings, guides that answer the question, and a page per role.'),
    ('Small typos on key pages.', '"RECRUTING ?" on the placement page and "Recruiment" in the FAQ title. Small, but captains notice them.'),
    ('No route between the site and social.', 'The website has no links to Instagram or LinkedIn, so visitors who like what they read have nowhere to follow.'),
]
s6 = '<ol class="gaps">' + ''.join(f'<li><b>{a}</b> {b}</li>' for a, b in gaps) + '</ol>'

s7 = '''<div class="tl" style="grid-template-columns:repeat(4,1fr)">
<div class="ph"><b>Weeks 1–3</b><span>Website fixes and service pages, YouTube and Facebook set up, starter pack of answers, first videos</span></div>
<div class="ph"><b>Weeks 4–7</b><span>Hiring authority: interviewing, fees, compliance, keeping crew, CVs</span></div>
<div class="ph"><b>Weeks 8–9</b><span>Year-end posts and the Med season hiring guide, ready for January</span></div>
<div class="ph p3"><b>Weeks 10–13</b><span>Med season hiring: the guide to captains, first-job advice to crew, day-90 report</span></div></div>''' + exhibit(7, 'Every month, from month one and continuing after day 90', table(
    ['What', 'Each month', 'Made with'],
    [['Long-form videos on the Pearce Placements YouTube channel', '4', 'Narrated from Lucy\'s answers and guides; no filming needed'],
     ['Short captioned clips for LinkedIn, Instagram, Facebook and YouTube', '16', 'OneUpShorts'],
     ['Articles on the website, shared on LinkedIn', '2', 'Lucy\'s written and voice-note answers'],
     ['Role posts for open positions', 'Each role', 'Your job briefs, with the captain\'s permission'],
     ['Weekly LinkedIn posts in Lucy\'s name', '4', 'Cut from each video'],
     ['Website, service pages and profile upkeep', 'Ongoing', 'OneUpAI']], left=(2,)),
    'Proposed volumes; the full plan, week by week, is in Pearce Placements, Your 90-Day Plan. Topics are agreed with Lucy and set each month from her answers. After day 90 the same output continues on a set monthly rhythm.')

def fcard(t, items):
    return f'<div class="fc"><b>{t}</b><ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul></div>'


STAGES = [('1', 'Found', 'Views, impressions, search positions'), ('2', 'Watch and read', 'Watch time, article reads, follows'),
          ('3', 'Visit the site', 'Visits by source'), ('4', 'Become a lead', 'Inquiries and registrations by source'), ('5', 'Hire or get placed', 'Roles taken on, placements')]
CAPT = [fcard('Hiring videos and articles', ['YouTube: interview questions, the fee, MLC 2006, Med season planning', 'LinkedIn posts in Lucy\'s name', 'Google: "how to hire yacht crew"']),
        fcard('A useful answer', ['Long-form video, chaptered', 'The matching article on the website']),
        fcard('Service pages', ['Tide Placements and Anchor Premium, written out', 'Med season hiring guide']),
        fcard('Captain lead', ['Guide request', 'Placement inquiry or Anchor Premium inquiry', 'WhatsApp message']),
        fcard('Role filled', ['Role brief from Lucy', 'Placement, then a testimonial request'])]
CREW = [fcard('Career shorts and role posts', ['Instagram, Facebook, LinkedIn, YouTube Shorts', 'YouTube: "yacht CV tips", first job, interviews']),
        fcard('A recruiter\'s view', ['CV and interview videos', 'First-job advice for the Med season']),
        fcard('Crew pages', ['Yacht CV checklist', 'Crew Jobs &amp; Guidance', 'Role pages']),
        fcard('Crew lead', ['Registration through the Crewdentials portal', 'Application to a posted role']),
        fcard('Crew placed', ['Shortlisted for a captain\'s role', 'Placement, then a testimonial request'])]
lane = lambda name, sub, cards: f'<div class="flane"><div class="fname"><b>{name}</b><span>{sub}</span></div><div class="fsteps">' + ''.join(cards) + '</div></div>'
FUNNEL = exhibit(8, 'The 90-day funnel: how viewers become leads', '<div class="funnel"><div class="fhead"><div></div><div class="fsteps">' + ''.join(
    f'<div class="fs"><span class="fn">{n}</span><b>{t}</b><span class="fm">{m}</span></div>' for n, t, m in STAGES) + '</div></div>'
    + lane('Captains and management companies', 'They pay the placement fee', CAPT)
    + lane('Crew', 'They fill the roles; no fees are charged to crew', CREW)
    + '<div class="floop"><b>Both sides feed each other.</b> Registered crew are the pool Lucy places from; each placement becomes a testimonial and a case study (with permission), which feeds new videos and articles at stage 1.</div></div>',
    'Each stage is measured from the start, so the monthly report shows where people drop off. No figures are projected: the counts at each stage are measured, not promised.')

s7 += FUNNEL

s8 = exhibit(9, 'How results are measured', table(
    ['Level', 'Measures', 'How often'],
    [['Published', 'Videos, shorts, articles and role posts that went out', 'Weekly'],
     ['Found', 'Category searches; YouTube views and subscribers; followers on each platform', 'Monthly'],
     ['Contacted', 'Captain and management-company inquiries, Anchor Premium inquiries, crew registrations, and where each came from', 'Weekly'],
     ['Hired', 'Roles taken on and placements made', 'Monthly, from your own numbers']], left=(1,)),
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
    ('Current State', 'A credible founder and a fair offer, with almost no public presence yet.', s1,
     'Captains choose an agency they trust, and crew register with one they have heard of. Today Pearce Placements is hard to find or check for anyone who does not already know Lucy, so most of the market never gets to see the offer.'),
    ('Offer and proof', 'Two clear ways to hire and no fees to crew; nothing yet that shows the work.', s2,
     'Pay on hire and no fees to crew are real reasons to choose Pearce Placements, but only when they are explained and backed by proof. Written service pages and testimonials turn the offer into a reason to inquire.'),
    ('What captains and crew search', 'Fifteen web searches and twelve YouTube searches worldwide: Pearce Placements appears only for its own name.', s3,
     'Captains and crew start with a search. Each search Pearce Placements is missing from sends them to a directory, a job board or another agency. The open ground (hiring advice, CVs, retention and MLC 2006) is where the plan starts.'),
    ('Website and profiles', 'Twelve pages with a solid Crew Hub, two near-empty service pages and an empty blog.', s4,
     'Every video and post sends people to the website. If the service pages say almost nothing and the blog is empty, that traffic leaves without inquiring.'),
    ('Social and video', 'The three firms have tens of thousands of followers; Pearce Placements is starting from close to zero.', s5,
     'The firms\' audiences took years to build and will not be matched in 90 days. What can be built now is a library of useful videos that keeps being found in search, where audience size matters less than the answer.'),
    ('What is holding Pearce Placements back', 'Seven gaps, most important first.', s6,
     'Most of these gaps are fixed in month one and take little of Lucy\'s time. Fixing them first means the videos that follow lead to pages that turn visitors into inquiries.'),
    ('A proposed 90-day plan', 'A starting point to agree with Lucy: month one builds the base; months two and three put her advice in front of captains and crew every week, leading into the Med season hiring window.', s7,
     'The plan puts Lucy\'s knowledge in front of captains and crew every week without her filming, and every piece points to one next step. The push is timed for January, just before the February to May hiring window.'),
    ('How results are measured', 'Four levels, from content published to placements, tracked against this baseline.', s8,
     'Measuring each level shows where the plan is working and where to change it, so decisions come from Pearce Placements\' own numbers rather than guesses.'),
    ('About this audit', f'A baseline audit from public sources, checked by hand on {DATE}.', s9,
     'Every figure can be checked against its source, so the starting point is agreed before the work begins and progress is measured against the same numbers.'),
]
body = ''.join(section(i + 1, t, l, b, w) for i, (t, l, b, w) in enumerate(SECTIONS))
report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pearce Placements · Presence Audit</title>
<style>{CSS}
.clogo {{ width: auto; height: 104px; max-width: 62vw; object-fit: contain; }}
.tw tbody td {{ text-align: center; }}
.tw td.l, .tw thead th.l {{ text-align: left; }}
.kw {{ font-weight: 600; white-space: nowrap; }}
.why {{ margin: 18px 0 2px; padding: 14px 16px; border-radius: 12px; background: #f3f6fa; border: 1px solid #dfe6ee; }}
.why b {{ display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--navy); margin-bottom: 4px; }}
.why p {{ margin: 0; }}
.funnel {{ display: grid; gap: 10px; }}
.fhead, .flane {{ display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: stretch; }}
.fsteps {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }}
.fs {{ text-align: center; padding: 4px 4px 8px; border-bottom: 2px solid var(--goldfill); }}
.fs b {{ display: block; color: var(--navy); font-size: 14px; }}
.fs .fn {{ display: inline-block; width: 22px; height: 22px; line-height: 22px; border-radius: 50%; background: var(--goldfill); color: #2a1d00; font-weight: 800; font-size: 12px; margin-bottom: 4px; }}
.fs .fm {{ display: block; font-size: 12px; color: #5d6878; margin-top: 2px; }}
.fname {{ background: var(--navy); color: #fff; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: center; }}
.fname span {{ font-size: 12.5px; opacity: .85; margin-top: 4px; }}
.fc {{ position: relative; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 10px 11px; font-size: 13px; }}
.fc b {{ display: block; color: var(--navy); margin-bottom: 4px; }}
.fc ul {{ margin: 0; padding-left: 16px; }}
.fc li {{ margin: 0 0 3px; }}
.fsteps .fc:not(:last-child)::after {{ content: '\\203A'; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); font-size: 20px; font-weight: 800; color: var(--gold); }}
.floop {{ margin-left: 160px; background: #fbf7ef; border-left: 3px solid var(--goldfill); border-radius: 0 10px 10px 0; padding: 10px 14px; font-size: 14px; }}
@media (max-width: 760px) {{
 .fhead {{ display: none; }}
 .flane {{ grid-template-columns: 1fr; }}
 .fsteps {{ grid-template-columns: 1fr; }}
 .fsteps .fc:not(:last-child)::after {{ content: '\\2193'; right: auto; left: 50%; top: auto; bottom: -15px; transform: translateX(-50%); font-size: 15px; }}
 .floop {{ margin-left: 0; }}
}}
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
     'videoNote': 'YouTube: 1.75K subscribers; 3 uploads in the last 12 months, latest Feb 24, 2026. Its most-viewed advice videos are 10 to 14 years old.',
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
    kw('how to hire yacht crew', None, 'client', 'None of the four: guides from Lighthouse Careers, Quarterdeck, Oceanside, Yachtly Crew'),
    kw('yacht crew placement fee', None, 'client', 'None of the four: YachtBuyer, YachtForums, Quarterdeck'),
    kw('mlc compliant yacht crew agency', 'a', 'client', 'yachtcrew.uk, Crew Network, YPI CREW, Bespoke, MYS'),
    kw('yacht crew agency antibes', None, 'client', 'None of the four: Dockwalk and Yachting Pages agency lists'),
    kw('yacht crew agency palma', None, 'client', 'None of the four: Mallorca.com listings, Dockwalk'),
    kw('yacht crew agency fort lauderdale', None, 'client', 'None of the four: The Crew Network, Dockwalk, Yachting Pages'),
    kw('yacht stewardess jobs', 'a', 'client', 'YaCrew, Lighthouse Careers, YPI CREW job page'),
    kw('yacht cv tips (YouTube)', None, 'client', 'Crew creators; top video 15,752 views, 6 years old'),
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
     'tp': 'After the plan: Lucy\'s advice every week on YouTube, LinkedIn, Instagram and Facebook, all pointing to the website.', 'bp': 'One set of answers a month, written or by voice note, feeds the month of videos and shorts.'},
    {'key': 'kw', 'label': 'Searches', 't': 'The name search is theirs. Agency, hiring and career searches show other agencies and creators.',
     'b': 'Each tower is a search. Its color is whichever of the four appears; grey means none of them.',
     'tp': 'The plan targets hiring advice, MLC 2006, CV and role searches first, plus directory listings for the crew hubs.', 'bp': 'Gold caps are the searches the plan targets.'},
    {'key': 'store', 'label': 'Uploads', 't': 'No YouTube uploads, so no windows are lit.',
     'b': 'The 12 lit windows are the last 12 months; a lit window means a YouTube upload that month.',
     'tp': 'Weekly videos light every window from here on.', 'bp': 'Hiring guides, interview questions, crew careers and Lucy\'s market notes.'},
    {'key': 'reviews', 'label': 'Proof', 't': 'No testimonials, case studies or placements described on the website.',
     'b': 'Reviews were not checked for the firms, so no crowds are shown.',
     'tp': 'After each placement, the captain and the crew member are asked for a short testimonial.', 'bp': 'Published only with their permission; no vessel names unless they agree.'},
    {'key': 'video', 'label': 'Video', 't': 'No channel. The agency advice videos that rank are mostly 10 to 14 years old.',
     'b': 'YPI CREW posted 3 videos in the last 12 months; Morgan & Mallet posts automated job ads; Seven Seas has no channel.',
     'tp': 'Narrated videos answer captains\' and crew questions every week.', 'bp': 'Made by OneUpAI from Lucy\'s answers and guides; she never has to appear on camera.'},
    {'key': 'comp', 'label': 'Firms', 't': 'The large agencies lead on audience, not on current advice.',
     'b': "The people walking in are each agency's share of presence among the four, based on the areas checked.",
     'tp': 'With the plan, attention shifts toward Pearce Placements.', 'bp': 'An illustration based on the areas checked; inquiries are measured monthly.'},
    {'key': 'plan', 'label': '90-day plan', 't': 'The 90-day plan', 'b': '', 'tp': 'The 90-day plan', 'bp': '',
     'list': ['Website fixed: service pages, typos, social links', 'YouTube channel and Facebook page set up',
              'Starter pack, then one set of answers a month', '4 long-form videos and 16 shorts a month',
              'Hiring guides for captains; career advice for crew', 'A Med season hiring guide in January',
              'Testimonials after each placement', 'Day-90 report, then a monthly rhythm']},
]
D = {'version': 1, 'planDays': 90, 'scene': 'marina', 'sample': False, 'generatedAt': '2026-10-26T17:00:00.000Z',
     'client': {'name': 'Pearce Placements', 'industry': 'Yacht crew recruitment', 'market': 'Yacht crew recruitment · worldwide', 'initials': 'PP', 'logo': LOGO},
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
