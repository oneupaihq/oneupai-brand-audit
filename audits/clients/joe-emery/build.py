"""Joe Emery (#joeemerywrites, J W Emery Ltd): brief written presence audit, no 3D view.
Styled in Joe's own brand: Poppins (the font in his framework document), his "e" logo and its teal.
Every figure was collected from public pages on October 29, 2026 (see SOURCES); the framework
and the discovery call come from Joe's document "7-Step Strategic Communications Framework"."""
import base64
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

OUT = str(REPO / 'audits' / 'out' / 'joe-emery') + '/'
Path(OUT).mkdir(parents=True, exist_ok=True)
CSS = (REPO / 'plans' / 'assets' / 'report.css').read_text()
LOGO_ONEUP = 'data:image/svg+xml;base64,' + base64.b64encode((REPO / 'plans' / 'assets' / 'oneupai-logo.svg').read_bytes()).decode()
LOGO = 'data:image/png;base64,' + base64.b64encode((HERE / 'logo.png').read_bytes()).decode()
DATE = 'October 29, 2026'


def table(head, rows, cls='', left=()):
    """Short values are centred; columns listed in `left` hold sentences and stay left-aligned."""
    al = lambda i: ' class="l"' if i in left else ''
    h = ''.join(f'<th scope="col"{al(i)}>{c}</th>' for i, c in enumerate(head))
    b = ''.join('<tr>' + ''.join((f'<th scope="row">{c}</th>' if i == 0 else f'<td{al(i)}>{c}</td>') for i, c in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="tw"><table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def exhibit(n, title, body, source):
    return f'<figure class="ex"><figcaption><span class="exn">Exhibit {n}</span>{title}</figcaption>{body}<p class="src">{source}</p></figure>'


def section(n, sid, title, line, body, why=None):
    w = f'<div class="why"><b>Why this matters</b><p>{why}</p></div>' if why else ''
    return f'<section id="{sid}"><div class="sh"><span class="sn">{n}</span><h2>{title}</h2></div><p class="line">{line}</p>{body}{w}</section>'


def kpis(items):
    return '<div class="kpis">' + ''.join(f'<div class="kpi {"neg" if c else "pos"}"><div class="kn {c}">{n}</div><div class="kl">{l}</div></div>' for n, l, c in items) + '</div>'


pill = lambda t, c: f'<span class="pill {c}">{t}</span>'
GOOD, BAD, MID = (lambda t: pill(t, 'good')), (lambda t: pill(t, 'bad')), (lambda t: pill(t, 'mid'))
Q = lambda t: f'<span class="kw">{t}</span>'

# ---------------------------------------------------------------- 1. services
STEPS = table(['Step', 'What Joe delivers', 'What it gives the client'], [
    ['1 · Discover', 'Interview synthesis and strategic positioning', 'Finds the gaps and unclear thinking, and where communication may be costing leads, trust or revenue'],
    ['2 · Define', 'Brand and marketing foundations', 'Defines the offer, audience, positioning and differentiation; one clear marketing direction'],
    ['3 · Clarify', 'Messaging playbook', 'The core messages that build trust and bring enquiries; keeps websites, proposals and campaigns aligned'],
    ['4 · Explain', 'Internal story deck', 'One shared story for leadership, sales and marketing; stronger pitches and presentations'],
    ['5 · Sound', 'Tone of voice guide', 'A clear, credible and distinctive voice that everyone in the business can follow'],
    ['6 · Write', 'Style guide', 'Practical writing standards for clarity, readability and consistency'],
    ['7 · Sell', 'Website copy', 'The website written from the strategy: clear value, trust built, objections answered, visitors moved to act']],
    cls='steps', left=(1, 2))

GROUPS = [
    ('Websites', ['Website copy', 'Landing pages', 'Product descriptions']),
    ('Campaigns', ['Email campaigns', 'Online and offline ads', 'TV and radio ads', 'Social media']),
    ('Sales and corporate', ['Brochures and leaflets', 'Presentations', 'Case studies', 'White papers', 'Bid writing', 'Press releases']),
    ('Thought leadership', ['Thought leadership', 'Speeches', 'Ghostwriting', 'Editing', 'Animated video scripts']),
]
SERVICES = '<div class="svc">' + ''.join(f'<div class="card"><b>{t}</b><ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul></div>' for t, items in GROUPS) + '</div>'

START = table(['Way in', 'How it works', 'Where it is offered'], [
    ['Free content review', 'Send "AUDIT" by LinkedIn message or email', 'His LinkedIn About section'],
    ['Strategic discovery call', '45 minutes, booked online', 'His framework document'],
    ['Direct contact', 'Email or phone', 'The Contact page on his website']], left=(1, 2))

s_services = f'''<p>Joe works strategy first. Before writing, he builds each client a <b>7-Step Strategic Communications Framework©</b> that sets their positioning, messaging and tone of voice. Then he turns it into the website and everything that follows from it.</p>
{exhibit(1, 'The 7-Step Strategic Communications Framework©', STEPS, "Source: Joe's framework document. Each step comes with a real-world example for clients to review.")}
{exhibit(2, 'Writing services', SERVICES, f'Source: the services listed on jwemeryltd.com and his LinkedIn profile (Copywriting, Content Marketing, Writing, Editing, Ghostwriting, Social Media Marketing), {DATE}.')}
{exhibit(3, 'How clients start', START, 'Source: LinkedIn profile, jwemeryltd.com and the framework document.')}
<ol class="facts">
 <li><b>Proof he can point to.</b> Client logos on his website include Credit Suisse, M&amp;G Investments, the NHS and HM Government. A LinkedIn recommendation from Tor Rézon of Wilde Blooms Collective (September 14, 2026) says the framework "completely changed how I see my business".</li>
</ol>'''
w_services = 'The framework is a clear, structured offer that sets Joe apart from writers who sell by the word. Today it lives in a document and his LinkedIn About section. His website does not mention it, and its two service pages carry no text.'

# ---------------------------------------------------------------- 2. current state
k = kpis([('69,459', 'Followers on Joe\'s LinkedIn profile, posting several times a day', ''),
          ('3', 'National broadcasters he has appeared on: GB News, LBC and BBC Radio 4', ''),
          ('11', 'Gambling posts published on his website since July 22, 2026', 'r'),
          ('0 of 5', 'Copywriting searches where he appears on page 1', 'r')])

PRESENCE = exhibit(4, 'Presence at a glance', table(
    ['Channel', 'Address', 'Audience', 'Latest activity', 'Status'],
    [['LinkedIn profile', 'joeemerywrites-forbondfansonly', '69,459 followers', '10 posts in 2 days', GOOD('Strong')],
     ['Website (the address he shares)', 'joeemerywrites.co.uk', '–', 'Certificate expired Sep 9, 2024', BAD('Security warning')],
     ['Website (where it forwards)', 'jwemeryltd.com', '–', 'Gambling post, Aug 3, 2026', BAD('Gambling posts')],
     ['LinkedIn company page', '#joeemerywrites', '776 followers', 'No posts shown', MID('Dormant')],
     ['Facebook page', 'Joe Emery Writes', '502 followers', 'Not checked', MID('Low')],
     ['Instagram', '@joeemerywrites', '310 followers, 16 posts', '–', MID('Not linked from site')],
     ['X', '@joeemerywrites', '178 followers, 766 posts', 'Nov 2, 2025', MID('Dormant')],
     ['YouTube', 'No copywriting channel found', '–', '–', BAD('None')],
     ['For Bond Fans Only', 'forbondfansonly.com', '1,063 Instagram · 482 YouTube', 'News post, Oct 9, 2026', GOOD('Active')]]),
    f'Counts as shown on each platform on {DATE}. For Bond Fans Only is the James Bond fan club Joe edits; its YouTube channel\'s latest upload is February 26, 2024.')

s_state = k + f'''
<ol class="facts">
 <li><b>A real audience on LinkedIn.</b> 69,459 followers and 500+ connections. His most-reacted recent post drew 1,190 reactions and 115 comments.</li>
 <li><b>Credentials most copywriters can't show.</b> Interviews with Dame Joanna Lumley, Julian Glover CBE and director John Glen; a lecture on copywriting at DHBW Heilbronn; and 2025 appearances on GB News, LBC and BBC Radio 4.</li>
 <li><b>The website works against him.</b> The address on his LinkedIn, Facebook, X and email shows a security warning, and the site it forwards to is showing gambling posts on its home page.</li>
 <li><b>Known for the job market, not for copywriting.</b> His recent LinkedIn posts and his press coverage are about job seekers and the job market. None of his 10 most recent posts is about his copywriting work.</li>
 <li><b>Not found when buyers search.</b> He owns searches for his business names but appears in none of five searches a client would use to find a copywriter in London or the UK.</li>
</ol>
{PRESENCE}'''
w_state = 'Joe already has what most freelancers lack: a large, engaged audience and national media credits. Today, though, a prospect who clicks through from LinkedIn meets a security warning or gambling posts before they see his work.'

# ---------------------------------------------------------------- 3. website
s_web = exhibit(5, 'Website issues, most urgent first', table(
    ['Issue', 'What we found', 'Effect'],
    [['Gambling posts', '11 casino posts (July 22 to August 3, 2026) published under a second user account; 6 of them listed on the home page. Google has indexed at least 5.', 'Visitors and Google see a copywriter\'s site selling casinos'],
     ['Spam categories', '215 blog categories, 209 of them empty, most named after betting brands and other spam terms', 'A common sign of a compromised WordPress site'],
     ['Expired certificate', 'https://joeemerywrites.co.uk shows a security warning; its certificate expired on September 9, 2024 and names cpanel.joeemerywrites.co.uk', 'Browsers show a full-page warning for the address on his profiles'],
     ['Two addresses', 'http://joeemerywrites.co.uk forwards to jwemeryltd.com; every profile still lists joeemerywrites.co.uk', 'Visits and search value split across two names'],
     ['Empty service pages', 'The Copywriting and Content writing pages show a heading, sample images and contact details, with no description of the service', 'Nothing for clients or Google to read'],
     ['Framework missing', 'No mention of the 7-step framework, the free "AUDIT" review or the discovery call', 'His strongest offer is not on his own site'],
     ['Out-of-date software', 'WordPress 6.5.5 (June 2024); user accounts are listed publicly by the site', 'Raises the chance of further break-ins'],
     ['Out-of-date claims', '"LinkedIn audience of 37,000+" (now 69,459); brochure from 2024; no mention of his 2025 media appearances', 'Undersells him'],
     ['Stray page', 'A blank page titled "dof", published February 4, 2026', 'Minor; part of the same clean-up']], left=(1, 2)),
    f'Source: joeemerywrites.co.uk and jwemeryltd.com, the site\'s public WordPress data, and Google, {DATE}. www.forbondfansonly.com, the address on his LinkedIn profile, also shows a certificate error; forbondfansonly.com works.')
w_web = 'A client who checks Joe\'s site before hiring him is judging his attention to detail. A security warning or a page of casino posts can end that decision in seconds, and the casino pages also risk Google treating the site as spam.'

# ---------------------------------------------------------------- 4. search
s_search = exhibit(6, 'What Google shows (UK)', table(
    ['Search', 'Joe on page 1', 'What leads'],
    [[Q('joe emery writes'), GOOD('#1'), 'jwemeryltd.com, then his LinkedIn profile and Facebook page'],
     [Q('J W Emery Ltd'), GOOD('#1'), 'jwemeryltd.com with five page links'],
     [Q('"Joe Emery" copywriter'), GOOD('#1'), 'LinkedIn profile first; website 4th; 5 of 8 results are about his job search'],
     [Q('Joe Emery'), MID('#2'), 'LinkedIn profile 2nd; most other results are about other people named Joe Emery, including a footballer'],
     [Q('copywriter London'), BAD('No'), 'Job boards; Caroline Gibson; The Word Man'],
     [Q('freelance copywriter London'), BAD('No'), 'Caroline Gibson; Luke Leighfield; The Word Man'],
     [Q('website copywriter UK'), BAD('No'), 'Mike Peake; Brand New Copy (Jamie Thomson); Jenny Lucas'],
     [Q('brand messaging strategist UK'), BAD('No'), 'Profound; Brand New Copy; Rowdy Studio'],
     [Q('tone of voice copywriter'), BAD('No'), 'Ash Billinghay; Nick Parker; Stephen Marsh']], left=(2,)),
    f'Google searches with the region set to the UK, {DATE}. Results vary by location and account.')
w_search = 'People who already know Joe can find him. People looking for a copywriter cannot: the searches he would want to win go to freelancers with service pages written for those exact terms.'

# ---------------------------------------------------------------- 5. social
s_social = exhibit(7, 'His 10 most recent LinkedIn posts', table(
    ['Topic', 'Posts', 'Example'],
    [['Posts written for job seekers', '5', 'A developer, a student and a social media manager looking for work'],
     ['Polls', '3', 'AI, happiness, the clocks going back'],
     ['The job market', '2', 'A rejection from a writing job; the darker months'],
     ['His copywriting work', '<b class="r">0</b>', '–']], left=(2,)),
    'LinkedIn profile, posts from October 27 to 29, 2026. Reactions on these posts ranged from 15 to 1,190.') + '''
<ol class="facts">
 <li><b>The audience follows the cause.</b> His posts for job seekers draw the strongest response; Google shows one of his job-search posts with 74,200+ reactions.</li>
 <li><b>The business pages are quiet.</b> The #joeemerywrites company page (776 followers) shows no posts, X has been quiet since November 2, 2025, and Instagram has 16 posts. There is no YouTube channel for his writing.</li>
</ol>'''
w_social = 'The audience is already there. What it rarely sees is Joe at work: the framework, the before-and-after copy and the results for clients. Pointing part of that reach at his own services is the shortest route to enquiries.'

# ---------------------------------------------------------------- 6. fixes
s_fix = '''<ol class="gaps">
 <li><b>Clean and secure the website.</b> Delete the 11 gambling posts, the spam categories and any account Joe doesn't recognise; change every password; update WordPress, the theme and plugins; and run a malware scan. Then ask Google to drop the casino pages through Search Console.</li>
 <li><b>Use one address everywhere.</b> Renew the certificate on joeemerywrites.co.uk or forward it securely to jwemeryltd.com, and fix www.forbondfansonly.com. Then update LinkedIn, Facebook, X and Instagram to the same address.</li>
 <li><b>Put the framework on the website.</b> A page for the 7 steps with the free "AUDIT" review and the discovery call, plus the 69K audience, the GB News, LBC and BBC Radio 4 appearances and two or three client results.</li>
 <li><b>Write the service pages.</b> Website copywriting, tone of voice and brand messaging, each with examples, so the site can compete for the searches in Exhibit 6.</li>
 <li><b>Give his own work a regular place in the feed.</b> A weekly post and video on the framework, a client brief or a before-and-after, shared on the company page and YouTube as well.</li>
</ol>'''
w_fix = 'The first two fixes protect the reputation Joe has already built; the last three turn his LinkedIn reach into enquiries for his services.'

# ---------------------------------------------------------------- 7. next steps
s_next = table(['Step', 'Who', 'When'], [
    ['Secure the website: remove the gambling posts, spam categories and unknown accounts; update and scan', 'OneUpAI, with WordPress admin access, or Joe\'s developer', 'This week'],
    ['Choose one web address to keep: joeemerywrites.co.uk or jwemeryltd.com', 'Joe', 'This week'],
    ['30-minute call to go through this audit and the proposed 90-day plan', 'Joe and Nick', 'Week of November 2'],
    ['Share access: WordPress, Google Search Console, the LinkedIn company page', 'Joe', 'Before the plan starts'],
    ['Agree the plan; week 1 starts', 'Joe and OneUpAI', 'Monday, November 9, 2026']], left=(0, 1)) + \
    '<p class="src">The proposed 90-day plan covers the fixes above and a weekly content schedule that promotes Joe\'s services only.</p>'

# ---------------------------------------------------------------- 8. about
SOURCES = [
    ('Website (secure address)', 'https://www.joeemerywrites.co.uk/'),
    ('Website (current)', 'https://jwemeryltd.com/'),
    ('LinkedIn profile', 'https://www.linkedin.com/in/joeemerywrites-forbondfansonly/'),
    ('LinkedIn company page', 'https://www.linkedin.com/company/joeemerywrites/'),
    ('Facebook page', 'https://www.facebook.com/joeemerywrites'),
    ('Instagram', 'https://www.instagram.com/joeemerywrites/'),
    ('X', 'https://x.com/joeemerywrites'),
    ('For Bond Fans Only', 'https://forbondfansonly.com/'),
    ('For Bond Fans Only on YouTube', 'https://www.youtube.com/channel/UCYB95XERhOi9KVUOf4YulRQ'),
]
s_about = (f'<p>A brief audit: one visit to each public channel, nine Google searches, and a check of the website\'s certificate and public WordPress data, all on {DATE}. '
           'Joe\'s services come from his website, his LinkedIn profile and his framework document. Nothing was estimated; anything not checked is marked so. '
           'It does not cover Google Business Profile, reviews, paid ads or AI assistants.</p>'
           '<ul class="soft">' + ''.join(f'<li>{n}: <a href="{u}">{u}</a></li>' for n, u in SOURCES) + '</ul>')

SECTIONS = [
    ('services', 'What Joe offers', 'Strategy first, then the words: the 7-step framework and the writing that follows it.', s_services, w_services),
    ('state', 'Current state', 'A large LinkedIn audience and real credentials, held back by the website.', s_state, w_state),
    ('website', 'The website', 'The address on his profiles shows a security warning; the site behind it is showing gambling posts.', s_web, w_web),
    ('search', 'Search', 'He owns his name; he is missing from the searches clients use.', s_search, w_search),
    ('social', 'Social', 'LinkedIn carries the brand; the feed is about job seekers, not his work.', s_social, w_social),
    ('fixes', 'What to fix first', 'Five steps, most urgent first.', s_fix, w_fix),
    ('next', 'Next steps', 'Secure the site this week, then agree the 90-day plan.', s_next, None),
    ('about', 'About this audit', f'Public pages only, checked on {DATE}.', s_about, None),
]
body = ''.join(section(i + 1, sid, t, l, b, w) for i, (sid, t, l, b, w) in enumerate(SECTIONS))
nav = '<nav class="jump" aria-label="Sections">' + ''.join(f'<a href="#{sid}">{t}</a>' for sid, t, *_ in SECTIONS[:-1]) + '</nav>'

BRAND = '''
:root { --bg: #f3f8f8; --paper: #ffffff; --ink: #22303a; --navy: #1b2b33; --line: #dde7e8; --gold: #08807c; --goldfill: #0edbd6; --good: #13795b; --bad: #c2463a; }
body { font-family: "Poppins", "Helvetica Neue", Arial, sans-serif; font-size: 15.5px; line-height: 1.6; }
h1, h2, .kn { font-weight: 600; letter-spacing: -.01em; }
.hero { background: linear-gradient(160deg, #0edbd6 0%, #8beee9 52%, #eefcfb 100%); padding: 32px 16px 40px; }
.brandmark { display: inline-flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px; padding: 12px 20px 12px 12px; box-shadow: 0 6px 20px rgba(8,60,70,.12); }
.brandmark img { width: 64px; height: 64px; display: block; }
.brandmark b { display: block; font-size: 22px; font-weight: 600; color: var(--navy); line-height: 1.2; }
.brandmark span { display: block; font-size: 13px; color: #55666e; }
.kicker { color: #0b3b40; letter-spacing: .12em; font-weight: 600; }
h1 { color: var(--navy); }
.meta, .meta b { color: #12343a; }
.status { color: #08504d; background: #e3fbfa; border-color: #a5ece8; }
.jump { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; overflow-x: auto; padding: 10px 16px; background: rgba(243,248,248,.94); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); justify-content: center; }
.jump a { flex: none; font-size: 13px; font-weight: 500; text-decoration: none; color: var(--navy); background: #fff; border: 1px solid var(--line); border-radius: 99px; padding: 5px 12px; }
.jump a:hover { border-color: var(--goldfill); }
section { border-radius: 14px; padding: 26px 28px; scroll-margin-top: 64px; }
.sh { align-items: center; }
.sn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--goldfill); color: #06302e; font-size: 15px; font-weight: 700; flex: none; }
h2 { font-size: 21px; }
.line { white-space: normal; font-weight: 500; color: #34454e; margin: 8px 0 18px; }
.kpi.pos { background: #e8fbfa; border-color: #b3efec; }
.kpi.pos .kn { color: var(--gold); }
.facts li { border-left-color: var(--goldfill); background: #f2fbfb; }
.call { background: #e8fbfa; border-color: #b3efec; }
figcaption { letter-spacing: .08em; font-weight: 600; }
.exn { color: var(--gold); }
.tw { border: 1px solid var(--line); border-radius: 12px; }
table { font-size: 14px; }
thead th { background: #f2f7f7; font-weight: 600; color: #3b4c55; }
th, td { padding: 10px 12px; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.tw tbody td { text-align: center; vertical-align: middle; }
.tw tbody th { vertical-align: middle; }
.tw td.l, .tw thead th.l { text-align: left; }
table.steps tbody th { white-space: nowrap; color: var(--gold); }
.kw { font-weight: 600; white-space: nowrap; }
.pill { display: inline-block; font-size: 12px; font-weight: 600; border-radius: 99px; padding: 2px 10px; white-space: nowrap; }
.pill.good { background: #e3f6ee; color: #0f6b4f; }
.pill.bad { background: #fdecea; color: #a8362b; }
.pill.mid { background: #f1f4f5; color: #4a5a62; }
.svc { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.svc .card { background: #fff; border: 1px solid var(--line); border-top: 3px solid var(--goldfill); border-radius: 12px; padding: 14px 16px; }
.svc .card b { display: block; color: var(--navy); margin-bottom: 6px; }
.svc ul { margin: 0; padding-left: 18px; font-size: 14px; }
.svc li { margin: 0 0 3px; }
.gaps li::marker { color: var(--gold); }
.why { margin: 20px 0 2px; padding: 14px 16px; border-radius: 12px; background: #f2f7f7; border: 1px solid var(--line); }
.why b { display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--gold); margin-bottom: 4px; }
.why p { margin: 0; }
.soft { padding-left: 20px; } .soft li { margin: 0 0 6px; overflow-wrap: anywhere; }
@media (max-width: 860px) { .svc { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) {
 .kpis { grid-template-columns: 1fr 1fr; }
 .brandmark { gap: 10px; padding: 8px 14px 8px 8px; min-width: 0; } .brandmark img { width: 44px; height: 44px; } .brandmark b { font-size: 16px; } .brandmark span { font-size: 11.5px; }
 .olog { height: 24px; }
 thead th { white-space: normal; }
 .kw, table.steps tbody th, .pill { white-space: normal; }
 section { padding: 20px 16px; }
 .jump { justify-content: flex-start; }
}
@media (max-width: 520px) { .svc { grid-template-columns: 1fr; } }
@media print { .jump { display: none; } section { break-inside: avoid-page; } }
'''

report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Joe Emery · Presence Audit</title>
<style>{CSS}{BRAND}</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><div class="brandmark"><img src="{LOGO}" alt=""><div><b>#joeemerywrites</b><span>Joe Emery · J W Emery Ltd</span></div></div><img class="olog" src="{LOGO_ONEUP}" alt="OneUpAI"></div>
 <p class="kicker">Presence audit · copywriter and messaging strategist · London</p>
 <h1>Joe Emery</h1>
 <p class="meta">Prepared for <b>Joe Emery, J W Emery Ltd</b> · Prepared by <b>Nick Zarzycki, OneUpAI</b> · {DATE}</p>
 <span class="status">Brief audit</span>
</div></header>
{nav}
<main>{body}</main>
<footer><span>Prepared by Nick Zarzycki, OneUpAI · nz@oneupai.com</span><span>Confidential · Joe Emery</span></footer>
</body></html>'''
open(OUT + 'joe-emery-presence-audit-report.html', 'w').write(report)
print('wrote', OUT + 'joe-emery-presence-audit-report.html', len(report) // 1024, 'KB')
