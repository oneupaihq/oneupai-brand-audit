"""Joe Emery (#joeemerywrites, J W Emery Ltd): brief written presence audit, no 3D view and no plan.
Every figure was collected from public pages on October 29, 2026 (see SOURCES)."""
import base64
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

OUT = str(REPO / 'audits' / 'out' / 'joe-emery') + '/'
Path(OUT).mkdir(parents=True, exist_ok=True)
CSS = (REPO / 'plans' / 'assets' / 'report.css').read_text()
LOGO_ONEUP = 'data:image/svg+xml;base64,' + base64.b64encode((REPO / 'plans' / 'assets' / 'oneupai-logo.svg').read_bytes()).decode()
WORDMARK = '''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="200" viewBox="0 0 720 200"><rect width="720" height="200" fill="#ffffff"/>
<text x="360" y="104" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="64" font-weight="800" fill="#0f2c4a" letter-spacing="2">JOE EMERY</text>
<rect x="250" y="124" width="220" height="4" fill="#e8a92e"/>
<text x="360" y="162" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="22" font-weight="700" fill="#b87c0b" letter-spacing="4">COPYWRITER · LONDON</text></svg>'''
(HERE / 'logo.svg').write_text(WORDMARK)
LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(WORDMARK.encode()).decode()
DATE = 'October 29, 2026'
Y, N = '<span class="ok">Yes</span>', '<b class="r">No</b>'


def table(head, rows, cls='', left=()):
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


Q = lambda t: f'<span class="kw">{t}</span>'

# ---------------------------------------------------------------- 1. current state
k = kpis([('69,459', 'Followers on Joe\'s LinkedIn profile, posting several times a day', ''),
          ('3', 'National broadcasters he has appeared on: GB News, LBC and BBC Radio 4', ''),
          ('11', 'Gambling posts published on his website since July 22, 2026', 'r'),
          ('0 of 5', 'Copywriting searches where he appears on page 1', 'r')])

PRESENCE = exhibit(1, 'Presence at a glance', table(
    ['Channel', 'Address', 'Audience', 'Latest activity', 'Status'],
    [['<b>LinkedIn profile</b>', 'joeemerywrites-forbondfansonly', '69,459 followers', '10 posts in the past 2 days', '<span class="ok">Strong</span>'],
     ['<b>Website (the address he shares)</b>', 'joeemerywrites.co.uk', '–', 'Certificate expired Sep 9, 2024', '<b class="r">Security warning</b>'],
     ['<b>Website (where it forwards)</b>', 'jwemeryltd.com', '–', 'Gambling post, Aug 3, 2026', '<b class="r">Gambling posts</b>'],
     ['<b>LinkedIn company page</b>', '#joeemerywrites', '776 followers', 'No posts shown', 'Dormant'],
     ['<b>Facebook page</b>', 'Joe Emery Writes', '502 followers', 'Not checked', 'Low'],
     ['<b>Instagram</b>', '@joeemerywrites', '310 followers, 16 posts', '–', 'Not linked from website'],
     ['<b>X</b>', '@joeemerywrites', '178 followers, 766 posts', 'Nov 2, 2025', 'Dormant'],
     ['<b>YouTube</b>', 'No copywriting channel found', '–', '–', N],
     ['<b>For Bond Fans Only</b>', 'forbondfansonly.com', '1,063 Instagram · 482 YouTube', 'News post, Oct 9, 2026', 'Active']]),
    f'Counts as shown on each platform on {DATE}. For Bond Fans Only is the James Bond fan club Joe edits; its YouTube channel\'s latest upload is February 26, 2024.')

s1 = k + f'''
<ol class="facts">
 <li><b>A real audience on LinkedIn.</b> 69,459 followers and 500+ connections. His most-reacted recent post drew 1,190 reactions and 115 comments. His About section is clear: brand and messaging strategist and lead copywriter, a 7-step framework, and a free content review for anyone who sends "AUDIT".</li>
 <li><b>Credentials most copywriters can't show.</b> Interviews with Dame Joanna Lumley, Julian Glover CBE and director John Glen; clients listed on his site include Credit Suisse, the NHS and HM Government; a lecture on copywriting at DHBW Heilbronn; and 2025 appearances on GB News, LBC and BBC Radio 4.</li>
 <li><b>The website works against him.</b> The address on his LinkedIn, Facebook, X and email shows a security warning, and the site it forwards to is showing gambling posts on its home page.</li>
 <li><b>Known for the job market, not for copywriting.</b> His recent LinkedIn posts and his press coverage are about job seekers and the job market. None of the 10 most recent posts is about his copywriting work.</li>
 <li><b>Not found when buyers search.</b> He owns searches for his business names but appears in none of five searches a client would use to find a copywriter in London or the UK.</li>
</ol>
{PRESENCE}'''
w1 = 'Joe already has what most freelancers lack: a large, engaged audience and national media credits. The gaps are fixable, but today a prospect who clicks through from LinkedIn meets a security warning or gambling posts before they see his work.'

# ---------------------------------------------------------------- 2. website
s2 = exhibit(2, 'Website issues, most urgent first', table(
    ['Issue', 'What we found', 'Effect'],
    [['<b>Gambling posts</b>', '11 casino posts (July 22 to August 3, 2026) published under a second user account; 6 of them listed on the home page. Google has indexed at least 5.', 'Visitors and Google see a copywriter\'s site selling casinos'],
     ['<b>Spam categories</b>', '215 blog categories, 209 of them empty, most named after betting brands and other spam terms', 'A common sign of a compromised WordPress site'],
     ['<b>Expired certificate</b>', 'https://joeemerywrites.co.uk shows a security warning; its certificate expired on September 9, 2024 and names cpanel.joeemerywrites.co.uk', 'Browsers show a full-page warning for the address on his profiles'],
     ['<b>Two addresses</b>', 'http://joeemerywrites.co.uk forwards to jwemeryltd.com; every profile still lists joeemerywrites.co.uk', 'Visits and search value split across two names'],
     ['<b>Out-of-date software</b>', 'WordPress 6.5.5 (June 2024); user accounts are listed publicly by the site', 'Raises the chance of further break-ins'],
     ['<b>Out-of-date claims</b>', '"LinkedIn audience of 37,000+" (now 69,459); brochure from 2024; no mention of his 2025 media appearances', 'Undersells him'],
     ['<b>Different message</b>', 'Site: "The right words can make you a millionaire". LinkedIn: "Your words are losing you sales. I fix that", the 7-step framework and the free "AUDIT" offer', 'The offer people respond to on LinkedIn is missing from the site'],
     ['<b>Stray page</b>', 'A blank page titled "dof", published February 4, 2026', 'Minor; part of the same clean-up']], left=(1, 2)),
    f'Source: joeemerywrites.co.uk and jwemeryltd.com, its public WordPress data, and Google, {DATE}. www.forbondfansonly.com, the address on his LinkedIn profile, also shows a certificate error; forbondfansonly.com works.')
w2 = 'A client who checks Joe\'s site before hiring him is judging his attention to detail. A security warning or a page of casino posts can end that decision in seconds, and the casino pages also risk Google treating the site as spam.'

# ---------------------------------------------------------------- 3. search
s3 = exhibit(3, 'What Google shows (UK)', table(
    ['Search', 'Joe on page 1', 'What leads'],
    [[Q('joe emery writes'), '<span class="ok">#1</span>', 'jwemeryltd.com, then his LinkedIn profile and Facebook page'],
     [Q('J W Emery Ltd'), '<span class="ok">#1</span>', 'jwemeryltd.com with five page links'],
     [Q('"Joe Emery" copywriter'), '<span class="ok">#1</span>', 'LinkedIn profile first; website 4th; 5 of 8 results are about his job search'],
     [Q('Joe Emery'), '#2', 'LinkedIn profile 2nd; most other results are about other people named Joe Emery, including a footballer'],
     [Q('copywriter London'), N, 'Job boards; Caroline Gibson; The Word Man'],
     [Q('freelance copywriter London'), N, 'Caroline Gibson; Luke Leighfield; The Word Man'],
     [Q('website copywriter UK'), N, 'Mike Peake; Brand New Copy (Jamie Thomson); Jenny Lucas'],
     [Q('brand messaging strategist UK'), N, 'Profound; Brand New Copy; Rowdy Studio'],
     [Q('tone of voice copywriter'), N, 'Ash Billinghay; Nick Parker; Stephen Marsh']], left=(2,)),
    f'Google searches with the region set to the UK, {DATE}. Results vary by location and account.')
w3 = 'People who already know Joe can find him. People looking for a copywriter cannot: the searches he would want to win go to freelancers with service pages built for those exact terms, while his own site offers one copywriting page and one content-writing page.'

# ---------------------------------------------------------------- 4. social
s4 = exhibit(4, 'His 10 most recent LinkedIn posts', table(
    ['Topic', 'Posts', 'Example'],
    [['Posts written for job seekers', '5', 'A developer, a student and a social media manager looking for work'],
     ['Polls', '3', 'AI, happiness, the clocks going back'],
     ['The job market', '2', 'A rejection from a writing job; the darker months'],
     ['His copywriting work', '<b class="r">0</b>', '–']], left=(2,)),
    f'LinkedIn profile, posts from October 27 to 29, 2026. Reactions on these posts ranged from 15 to 1,190.') + '''
<ol class="facts">
 <li><b>The audience follows the cause.</b> His posts for job seekers draw the strongest response; Google shows one of his job-search posts with 74,200+ reactions.</li>
 <li><b>The business pages are quiet.</b> The #joeemerywrites company page (776 followers) shows no posts, X has been quiet since November 2, 2025, and Instagram has 16 posts. There is no YouTube channel for his writing.</li>
</ol>'''
w4 = 'The audience is already there. What it rarely sees is Joe at work: the briefs, the before-and-after copy and the results for clients. A share of that reach pointed at his own services is the shortest route to enquiries.'

# ---------------------------------------------------------------- 5. fixes
s5 = '''<ol class="gaps">
 <li><b>Clean and secure the website this week.</b> Delete the 11 gambling posts, the spam categories and any account Joe doesn't recognise; change every password; update WordPress, the theme and plugins; and run a malware scan. Then ask Google to drop the casino pages through Search Console.</li>
 <li><b>Use one address everywhere.</b> Renew the certificate on joeemerywrites.co.uk or forward it securely to jwemeryltd.com, and fix www.forbondfansonly.com. Then update LinkedIn, Facebook, X and Instagram to the same address.</li>
 <li><b>Bring the site up to date with LinkedIn.</b> Lead with the message and the free "AUDIT" offer that work on LinkedIn, add the 7-step framework, the 69K audience, the GB News, LBC and BBC Radio 4 appearances, and two or three client results.</li>
 <li><b>Add pages for the searches clients use.</b> Website copywriting, tone of voice, and brand messaging, each with examples, so the site can compete for the five searches in Exhibit 3.</li>
 <li><b>Give his own work a regular place in the feed.</b> One post a week on a client brief or a before-and-after, alongside the job-seeker posts, and the same post on the company page.</li>
</ol>'''
w5 = 'The first two fixes protect the reputation Joe has already built; the last three turn his LinkedIn reach into enquiries for his writing.'

# ---------------------------------------------------------------- 6. about
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
s6 = '<p>This is a brief audit: one visit to each public channel, nine Google searches and a check of the website\'s certificate and public WordPress data, all on ' + DATE + '. Nothing was estimated; anything not checked is left out. It does not cover Google Business Profile, reviews, paid ads or AI assistants.</p>' + \
     '<ul class="soft">' + ''.join(f'<li>{n}: <a href="{u}">{u}</a></li>' for n, u in SOURCES) + '</ul>'

SECTIONS = [
    ('Current state', 'A large LinkedIn audience and real credentials, held back by the website.', s1, w1),
    ('The website', 'The address on his profiles shows a security warning; the site behind it is showing gambling posts.', s2, w2),
    ('Search', 'He owns his name; he is missing from the searches clients use.', s3, w3),
    ('Social', 'LinkedIn carries the brand; the feed is about job seekers, not his work.', s4, w4),
    ('What to fix first', 'Five steps, most urgent first.', s5, w5),
]
body = ''.join(section(i + 1, t, l, b, w) for i, (t, l, b, w) in enumerate(SECTIONS))
body += f'<section><div class="sh"><span class="sn">{len(SECTIONS) + 1}</span><h2>About this audit</h2></div><p class="line">Public pages only, checked on {DATE}.</p>{s6}</section>'

report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Joe Emery · Presence Audit</title>
<style>{CSS}
.clogo {{ width: auto; height: 104px; max-width: 62vw; object-fit: contain; }}
.tw tbody td {{ text-align: center; }}
.tw td.l, .tw thead th.l {{ text-align: left; }}
.kw {{ font-weight: 600; white-space: nowrap; }}
.why {{ margin: 18px 0 2px; padding: 14px 16px; border-radius: 12px; background: #f3f6fa; border: 1px solid #dfe6ee; }}
.why b {{ display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--navy); margin-bottom: 4px; }}
.why p {{ margin: 0; }}
.soft {{ padding-left: 20px; }} .soft li {{ margin: 0 0 6px; overflow-wrap: anywhere; }}
.line {{ white-space: normal; }}
@media (max-width: 760px) {{ .kpis {{ grid-template-columns: 1fr 1fr; }} .clogo {{ height: 64px; }} .kw {{ white-space: normal; }} section {{ padding: 20px 16px; }} }}
</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="{LOGO}" alt="Joe Emery"><img class="olog" src="{LOGO_ONEUP}" alt="OneUpAI"></div>
 <p class="kicker">Presence audit · copywriter and messaging strategist · London</p>
 <h1>Joe Emery</h1>
 <p class="meta">Prepared for <b>Joe Emery, J W Emery Ltd</b> · Prepared by <b>Nick Zarzycki, OneUpAI</b> · {DATE}</p>
 <span class="status">Brief audit</span>
</div></header>
<main>{body}</main>
<footer><span>Prepared by Nick Zarzycki, OneUpAI · nz@oneupai.com</span><span>Confidential · Joe Emery</span></footer>
</body></html>'''
open(OUT + 'joe-emery-presence-audit-report.html', 'w').write(report)
print('wrote', OUT + 'joe-emery-presence-audit-report.html', len(report) // 1024, 'KB')
