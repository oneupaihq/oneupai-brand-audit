"""Builds the two written audits and two 3D (marina) views for Jace Yachting / Jace Kizzier.
Every figure below was collected from public sources on September 29, 2026 (see SOURCES)."""
import base64, html, json, copy
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]          # .../oneupai-brand-audit
HERE = Path(__file__).resolve().parent              # this client's folder

OUT = str(REPO / 'audits' / 'out' / 'jace-kizzier') + '/'
Path(OUT).mkdir(parents=True, exist_ok=True)
CSS = (REPO / 'plans' / 'assets' / 'report.css').read_text()
LOGO_ONEUP = 'data:image/svg+xml;base64,' + base64.b64encode((REPO / 'plans' / 'assets' / 'oneupai-logo.svg').read_bytes()).decode()
LOGO_JACE = 'data:image/png;base64,' + base64.b64encode((HERE / 'logo.png').read_bytes()).decode()
DATE = 'September 29, 2026'
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


def bars(rows, top):
    return '<div class="bars">' + ''.join(
        f'<div class="br"><span class="bn">{n}</span><span class="bt"><i class="{"k" if k else "g"}" style="width:{max(v / top * 100, 0.6 if v else 0):.1f}%"></i></span><span class="bv">{v:,}</span></div>' for n, v, k in rows) + '</div>'


def timeline(a, b, c):
    return f'<div class="tl"><div class="ph p1"><b>Days 1–30</b><span>{a}</span></div><div class="ph p2"><b>Days 31–60</b><span>{b}</span></div><div class="ph p3"><b>Days 61–90</b><span>{c}</span></div></div>'


def plan_table(n, rows):
    return exhibit(n, '90-day execution plan', table(['Action', 'Timing', 'Delivered by', 'Measured by'], rows, 'plan'),
                   'Sized to the Technology Partner scope: up to 4 long-form videos, 16 short clips and 2 articles a month. After day 90 the work continues at the same pace, and a monthly audit shows what moved.')


def scorecard(n, who, med_label, rows):
    body = table(['Area', 'Measure', who, med_label, 'Score'], rows)
    return exhibit(n, 'Scorecard', body, 'A score of 100 means at or above the median of the comparison set. Areas marked "Not checked" are left out of the overall score.')


def sc(v):
    if v is None:
        return U
    return f'<b class="r">{v}</b>' if v < 50 else f'<span class="ok">{v}</span>'


def page(title, kicker, name, sections, footer_name, status):
    body = ''.join(section(i + 1, t, l, b) for i, (t, l, b) in enumerate(sections))
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>{title}</title>
<style>{CSS}
.clogo {{ width: auto; height: 118px; max-width: 62vw; object-fit: contain; }}
.decide {{ background: #fff7e3; border: 1px solid #f0d9a8; border-radius: 12px; padding: 14px 16px; margin: 4px 0 18px; }}
.decide b.t {{ display: block; color: var(--gold); font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }}
</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="{LOGO_JACE}" alt="Jace Yachting"><img class="olog" src="{LOGO_ONEUP}" alt="OneUpAI"></div>
 <p class="kicker">{kicker}</p>
 <h1>{name}</h1>
 <p class="meta">Prepared for <b>Jace Kizzier</b> · Prepared by <b>Nick Zarzycki, OneUpAI</b> · {DATE}</p>
 <span class="status">{status}</span>
</div></header>
<main>{body}</main>
<footer><span>Prepared by Nick Zarzycki, OneUpAI · nz@oneupai.com</span><span>Confidential · {footer_name}</span></footer>
</body></html>'''


# ---------------------------------------------------------------- shared facts
DECIDE = '''<div class="decide"><b class="t">Decision for this meeting</b>Which name leads: <b>Jace Kizzier</b>, <b>Jace Yachting</b>, or both? Jace's LinkedIn calls Jace Yachting "my personal brand". One practical option: channels named "Jace Kizzier | Jace Yachting", so both name searches find them. The plan below works either way; only the channel names change.</div>'''

SRC_COMMON = [
    ('jaceyachting.com: home, About Jace, Videos, Sell, Featured Yachts, News, sitemap and WordPress post index', 'https://jaceyachting.com/'),
    ('Denison Yachting broker profile: Jace Kizzier', 'https://www.denisonyachtsales.com/broker/jace-kizzier'),
    ('Denison: 161′ Trinity 2007 sold by Jace Kizzier [LA DEA II], Nov 26, 2025', 'https://www.denisonyachtsales.com/2025/11/161-trinity-2007-la-dea-ii-sold/'),
    ('Denison: 116 Lazzara 2009 sold by Jace Kizzier [QTR], Dec 1, 2023', 'https://www.denisonyachtsales.com/2023/12/116-lazzara-2009-sold-by-jace-kizzier-qtr/'),
    ('Denison: 118 Trinity 1999 sold by Jace Kizzier [SUMMER LOVE], Jun 19, 2023', 'https://www.denisonyachtsales.com/2023/06/118-trinity-1999-sold-by-jace-kizzier-summer-love/'),
    ('Denison: 105′ Numarine 2021 sold by Jace Kizzier [ZARANIA], Dec 15, 2022', 'https://www.denisonyachtsales.com/news/105-numarine-2021-sold-by-jace-kizzier-zarania'),
    ('Denison: 105′ Numarine 2021 sold by Alex Clarke + Jace Kizzier [7 DIAMONDS], Jun 1, 2021', 'https://www.denisonyachtsales.com/2021/06/105-numarine-2021-expedition-yacht-sold-by-alex-clarke-jace-kizzier/'),
    ('Instagram @jace.yachting, including the BENEDETTA sale post of Sep 16, 2026', 'https://www.instagram.com/jace.yachting/'),
    ('Instagram @jaceyachting (private account, not confirmed as Jace\'s)', 'https://www.instagram.com/jaceyachting/'),
    ('Facebook page: Jace Yachting', 'https://www.facebook.com/profile.php?id=61573035192564'),
    ('YouTube: the five Denison Yachting videos embedded on jaceyachting.com (view counts on Sep 29, 2026)', 'https://www.youtube.com/@DenisonYachting'),
    ('YouTube: Paragon Motor Yachts channel (@motoryachtforsale)', 'https://www.youtube.com/@motoryachtforsale'),
    ('LinkedIn: Jace Kizzier (follower count as shown in Google results)', 'https://www.linkedin.com/in/jace-kizzier-8250905/'),
]

# ======================================================================
# REPORT A: JACE YACHTING (the website brand)
# ======================================================================
W = {'map': 2, 'profile': 2, 'reviews': 3, 'website': 2, 'rankings': 3, 'video': 3, 'ai': 3, 'social': 2, 'links': 2, 'ads': 1}
CATS_A = [('map', 'Map & local search', False), ('profile', 'Google profile', True), ('reviews', 'Reviews', True), ('website', 'Website', True),
          ('rankings', 'Search rankings', True), ('video', 'Video', True), ('ai', 'AI assistants', False), ('social', 'Social', True),
          ('links', 'Sites linking in', False), ('ads', 'Paid ads', False)]


def vec(cats, **kw):
    return [kw.get(k) for k, _, _ in cats]


def overall(cats, s):
    num = sum(v * W[k] for (k, _, _), v in zip(cats, s) if v is not None)
    den = sum(W[k] for (k, _, _), v in zip(cats, s) if v is not None)
    return round(num / den)


# Rules (medians of the three firms): Google reviews 31; site checks passed 4 of 6; non-brand searches on page 1: 3 of 9;
# YouTube uploads since Jul 8, 2026: 15+ each; Instagram followers 75,000.
A_client = vec(CATS_A, profile=0, reviews=0, website=25, rankings=0, video=0, social=1)
A_plan = vec(CATS_A, profile=100, reviews=0, website=100, rankings=0, video=100, social=1)
A_way = vec(CATS_A, profile=100, reviews=74, website=100, rankings=33, video=100, social=24)
A_nj = vec(CATS_A, profile=100, reviews=100, website=100, rankings=100, video=100, social=100)
A_den = vec(CATS_A, profile=100, reviews=100, website=100, rankings=100, video=100, social=100)
A_ov = overall(CATS_A, A_client); A_pl = overall(CATS_A, A_plan)

a_k = kpis([('78', 'Articles published on jaceyachting.com in the last 12 months', ''),
            ('0 of 9', 'Non-brand Google searches where the site is on page 1', 'r'),
            ('0', 'Social profiles linked from the website', 'r'),
            ('428', 'Instagram followers at @jace.yachting; the firms checked have 18K–84K', 'r')])
a_s1 = DECIDE + a_k + f'''
<ol class="facts">
 <li><b>Publishing is a real strength.</b> 138 articles since August 2024, 78 of them in the last 12 months, plus four free guides: trans-ocean crossings, ownership costs, insurance and compliance.</li>
 <li><b>The site is <span class="r">not found</span> by buyers who don't already know the name.</b> It ranks 1st for "Jace Yachting" with sitelinks, but it's on page 1 for none of the 9 other searches checked.</li>
 <li><b>Searches for Jace's own listings land on Denison.</b> For "118 trinity yacht for sale", Denison's DIRT POOR page ranks 1st and Denison's walkthrough video 3rd. jaceyachting.com doesn't appear.</li>
 <li><b>Site and social accounts are <span class="r">not connected</span>.</b> No page checked links to Instagram, Facebook or LinkedIn, and none has a meta description or business schema.</li>
 <li><b>All of the video is borrowed.</b> The 5 videos on the site are Denison Yachting uploads, with about 133,000 combined views. Jace Yachting has no YouTube channel.</li>
</ol>
{scorecard(1, 'Jace Yachting', 'Firm median', [
    ['<b>Google profile</b>', 'Business profile on Google', '<b class="r">None found</b>', 'Yes', sc(0)],
    ['<b>Reviews</b>', 'Google reviews', '0', '31', sc(0)],
    ['<b>Website</b>', 'Site checks passed (of 6)', '1', '4', sc(25)],
    ['<b>Search rankings</b>', 'Non-brand searches on page 1 (of 9)', '0', '3', sc(0)],
    ['<b>Video</b>', 'YouTube uploads since July 8, 2026', '0', '15+', sc(0)],
    ['<b>Social</b>', 'Instagram followers', '428', '75,000', sc(1)],
    ['AI assistants', 'Named in ChatGPT, Claude, Gemini answers', U, D, U],
    ['Map, links, ads', 'Map grid, sites linking in, search ads', U, D, U]])}
<div class="call"><b>The opportunity:</b> the content engine already runs. Aim it at the searches buyers make, add video on a channel Jace owns, and connect the site to the social accounts. The same monthly output then builds search visibility, not just a news feed.</div>'''

a_s2 = exhibit(2, f'Google reviews, {DATE}', bars([('Denison Yachting (Fort Lauderdale)', 85, False), ('Northrop &amp; Johnson (Fort Lauderdale)', 31, False),
                                                   ('Worth Avenue Yachts (West Palm Beach)', 23, False), ('Jace Yachting', 0, True)], 85),
               'Source: Google business profiles. No Google profile was found for Jace Yachting or Jace Kizzier.') + exhibit(3, 'Reputation and proof', table(
    ['Business', 'Google reviews', 'Google rating', 'Facebook reviews', 'Sales announced publicly'],
    [['<b>Jace Yachting</b>', '<b class="r">No profile</b>', D, '0 ("Not yet rated")', '<b>6 since 2021</b>'],
     ['Worth Avenue Yachts', '23', '4.6', U, U],
     ['Northrop &amp; Johnson', '31', '4.8', U, U],
     ['Denison Yachting', '85', '4.7', U, U]]),
    "Sales announced publicly: 5 on Denison's news pages (2021–2025) and 1 on Instagram (BENEDETTA, Sep 2026). Each closing is a ready story for a short video, with the client's permission.")

a_s3 = exhibit(4, 'Page 1 results for 10 buyer and seller searches', table(
    ['Search', 'Highest of the four', 'Jace Yachting on page 1'],
    [['yacht broker palm beach', 'Worth Avenue Yachts, 1st; Northrop &amp; Johnson, 3rd', N],
     ['yacht broker fort lauderdale', 'Northrop &amp; Johnson, 4th', N],
     ['superyacht broker florida', 'None of the four', N],
     ["118 trinity yacht for sale <i>(Jace's listing)</i>", "Denison, 1st; Denison's DIRT POOR video, 3rd", N],
     ["dirt poor yacht <i>(Jace's listing)</i>", 'Denison, 4th', N],
     ["1997 offshore 48 sedan for sale <i>(Jace's listing)</i>", 'Denison, 3rd', N],
     ['paragon yacht for sale', 'Northrop &amp; Johnson, 4th', N],
     ['how much does it cost to own a yacht', 'None of the four', N + ' · the site has a free guide on this'],
     ['sell my yacht florida', 'None of the four', N],
     ['jace yachting <i>(brand name)</i>', 'Jace Yachting, 1st, with sitelinks', Y]]),
    f'Source: Google searches on {DATE}; page 1 = the first 8–10 organic results. Results vary by location and person. Monthly search volumes need the full audit.')

a_s4 = exhibit(5, 'Website checks against the three firms', table(
    ['Check', 'Jace Yachting', 'Worth Avenue', 'N&amp;J', 'Denison'],
    [['Meta descriptions', '<b class="r">None</b> on 7 pages', Y, Y, Y],
     ['Business schema for search engines', N, Y, Y, Y],
     ['Links to social profiles', '<b class="r">None</b>', Y, Y, Y],
     ['Video on the homepage', Y + ' · 5, all Denison uploads', Y, 'Not found', 'Not found'],
     ['Tap-to-call link', '<b class="r">+561.677.0674, no +1</b>', Y, Y, Y],
     ['FAQ for buyers and sellers', N, N, N, U],
     ['Articles in the last 12 months', '<b>78</b>', U, U, U]]),
    f'Source: company homepages and jaceyachting.com pages, {DATE}.') + '''
<ol class="facts">
 <li><b>Contact details differ.</b> The site lists 561-677-0674 and jace@jaceyachting.com. Denison's profile, the Instagram sale post and Denison's videos list 949-292-4583, and the videos give JK@DenisonYachting.com.</li>
 <li><b>"Recently Sold" links carry another broker's tag.</b> All 8 links in the homepage feed end in <i>?b=matthew-stone</i>. Worth confirming with Denison how inquiries from these links are credited.</li>
 <li><b>The site doesn't show which listings are Jace's.</b> The homepage features 6 yachts for sale; Denison lists 2 as Jace's own (DIRT POOR and ISLAND GIRL).</li>
 <li><b>Images lack descriptions.</b> 15 of the 20 homepage images have no alt text, which search engines read.</li>
</ol>'''

a_s5 = exhibit(6, 'Presence by platform', table(
    ['Platform', 'Jace Yachting today', 'The three firms', 'Priority'],
    [['Google Search &amp; Maps', '1st for its name; 0 of 9 other searches; no business profile', 'Worth Avenue 1st for "yacht broker palm beach"', '<b>High</b>'],
     ['YouTube', "<b class=\"r\">No channel.</b> Site videos are on Denison's channel", '12.2K, 9.19K and 273K subscribers; each posted 15+ videos since July 8', '<b>High</b>'],
     ['Instagram', '@jace.yachting: 428 followers, 131 posts; 12 posts from Aug 20 to Sep 24', '18K, 75K and 84K followers', '<b>High</b>'],
     ['Facebook', 'Page "Jace Yachting": 308 followers, 0 reviews; repeats the Instagram posts', U, 'Medium'],
     ['TikTok', '<b class="r">No account found</b>', '1,316, 6,691 and 11,100 followers', 'Medium'],
     ['LinkedIn', "Jace's profile, 510+ followers; not linked from the site", U, 'Medium'],
     ['AI assistants', U, U, '<b>High</b>']]),
    'Firms in order: Worth Avenue Yachts, Northrop &amp; Johnson, Denison Yachting. The Instagram handle @jaceyachting (no dot) belongs to a private account with 0 posts and a bio offering the page for sale; who owns it was not confirmed.')

a_gaps = [
    ('Not found beyond the brand name.', 'On page 1 for 0 of 9 non-brand searches, including searches for Jace\'s own listings.'),
    ("Listing searches go to Denison's pages.", "Buyers searching DIRT POOR or the Offshore 48 reach Denison's pages and video, not jaceyachting.com."),
    ('No video channel of its own.', "Five site videos, about 133,000 views, all on Denison's channel. The three firms each posted 15+ videos since July 8."),
    ('The site and the social accounts are not connected.', 'No links out to Instagram, Facebook or LinkedIn, and no meta descriptions or business schema.'),
    ('No Google profile and no reviews.', 'Nothing to show when a buyer searches locally or checks reputation. The six public sales are a ready source of proof.'),
    ('Content is mostly other companies\' news.', "83 of 138 articles are industry news. On Instagram, Jace's own BENEDETTA sale post drew 25 likes; news posts drew 2 to 13."),
    ('Mixed contact details.', 'Two phone numbers and two emails in public, and the site\'s tap-to-call link lacks the +1 country code.'),
    ('Housekeeping.', 'The "Recently Sold" links carry another broker\'s tag, and the @jaceyachting Instagram handle is held by a private account.'),
]
a_s6 = '<ol class="gaps">' + ''.join(f'<li><b>{a}</b> {b}</li>' for a, b in a_gaps) + '</ol>'

a_plan = [
    ['Fix the tap-to-call link; add meta descriptions, business schema and links to Instagram, Facebook, LinkedIn and YouTube', 'Days 1–30', 'OneUpAI service', 'Site checks passed'],
    ['One phone number and email on the site, Denison profile and every social account', 'Days 1–30', 'Jace + OneUpAI', 'Consistent contact details'],
    ['Create the YouTube channel and TikTok account; resolve the @jaceyachting Instagram handle', 'Days 1–30', 'OneUpAI service', 'Channels live'],
    ["Google business profile for Jace Yachting, if Denison's policy allows", 'Days 1–30', 'OneUpAI service + Jace', 'Profile views, calls'],
    ['Walkthroughs of DIRT POOR and ISLAND GIRL on Jace\'s channel, embedded on their pages', 'Days 1–30', 'OneUpTours', 'Views; listing searches'],
    ['Replace the "Recently Sold" feed with Jace\'s own sold pages, one per closing', 'Days 1–30', 'OneUpAI service', 'Sold pages live'],
    ['4 long-form videos a month: walkthroughs, market updates, sold stories', 'Days 31–60', 'OneUpTours, OneUpArticles', 'Views, subscribers'],
    ['16 short clips a month answering buyer and seller questions, cut from long-form and selfie takes', 'Days 31–60', 'Shorts agent (question)', 'Views; AI answers naming Jace'],
    ['Short series from the 4 free guides: ownership costs, insurance, compliance, ocean crossings', 'Days 31–60', 'Shorts agent (question)', '"Cost to own a yacht" searches'],
    ['2 articles a month aimed at searches, e.g. selling a yacht in Florida, Trinity and Paragon guides, with video', 'Days 31–60', 'OneUpArticles', 'Searches on page 1'],
    ['Every video posted to YouTube, Instagram, TikTok, Facebook and LinkedIn, with search terms in captions', 'Days 31–60', 'OneUp posting step', 'Posts and views per platform'],
    ['Sold story after each closing, with the client\'s permission', 'Days 61–90', 'Shorts agent (testimonial)', 'Engagement, inquiries'],
    ['Fort Lauderdale International Boat Show coverage', 'Days 61–90', 'OneUpMoments', 'Views, leads'],
    ['Ask past buyers and sellers for a Google review', 'Days 61–90', 'Jace + OneUpAI', 'Google reviews'],
]
a_s7 = timeline('Foundations: fix the site, open the channels, one set of contact details', 'Weekly pace: 4 long-form videos, 16 shorts and 2 articles a month', 'Compound: sold stories, the boat show, reviews') + plan_table(7, a_plan)

MEASURE = lambda n, extra: exhibit(n, 'Measurement framework', table(
    ['Level', 'What is measured', 'Source'],
    [['<b>Output</b>', 'Videos, shorts and articles published, by platform', 'OneUp platform records'],
     ['<b>Visibility</b>', extra, 'Monthly audit against this baseline'],
     ['<b>Engagement</b>', 'Views, followers, website visits by source, profile calls', 'YouTube, Instagram, TikTok, Google Analytics'],
     ['<b>Leads</b>', 'Inquiries by source, listings won, closings', "Jace's CRM and Denison records"]]),
    'Next step: a full audit adding monthly search volumes and what ChatGPT, Claude and Gemini say when buyers ask for a broker.')

a_s8 = MEASURE(8, 'Page 1 searches, followers by platform, Google profile and reviews, AI answers')
SRC_A = SRC_COMMON + [('Worth Avenue Yachts', 'https://www.worthavenueyachts.com/'), ('Northrop &amp; Johnson', 'https://www.northropandjohnson.com/'),
                      ('Denison Yachting', 'https://www.denisonyachtsales.com/')]
a_s9 = f'<p>A baseline audit from public sources, checked on {DATE}. Figures are as published; anything not verified is marked "Not checked" or "–" rather than estimated. The comparison set is the three firms found on page 1 for Palm Beach and Fort Lauderdale broker searches, including Denison, Jace\'s brokerage. Instagram, YouTube and TikTok figures were read from each public profile.</p><ul class="sources">' + ''.join(
    f'<li><a href="{u}">{n}</a></li>' for n, u in SRC_A) + f'<li>Google searches on {DATE} (Exhibit 4)</li></ul>'

A_sections = [
    ('Current State', 'Strong, steady publishing, but the site is found only by people who already know the name.', a_s1),
    ('Reputation', 'Six publicly announced sales, but no Google profile and no reviews to show buyers.', a_s2),
    ('What customers search', 'First for its own name; not on page 1 for any of the 9 other searches checked.', a_s3),
    ('Website', 'The content is there. What\'s missing is the basic wiring that helps search engines and people find it.', a_s4),
    ('Social, video and AI platforms', 'Active on Instagram and Facebook; no YouTube channel or TikTok of its own.', a_s5),
    ('What is holding Jace Yachting back', 'Eight gaps, most important first.', a_s6),
    ('90-day execution to get Jace Yachting more buyers and sellers', 'Month one fixes the foundations; months two and three run the weekly video and article pace.', a_s7),
    ('How results are measured', 'Four levels, from content published to closings, tracked monthly against this baseline.', a_s8),
    ('About this audit', f'A baseline audit from public sources, checked by hand on {DATE}.', a_s9),
]
open(OUT + 'jace-yachting-presence-audit-report.html', 'w').write(page('Jace Yachting · Online Presence Audit', 'Online presence audit · the website brand · Palm Beach &amp; Fort Lauderdale, FL', 'Jace Yachting', A_sections, 'Jace Yachting', 'Baseline audit'))

# ======================================================================
# REPORT B: JACE KIZZIER (the subject-matter expert)
# ======================================================================
CATS_B = [('map', 'Map & local search', False), ('profile', 'Google profile', False), ('reviews', 'Reviews', False), ('website', 'Website', False),
          ('rankings', 'Name search', True), ('video', 'Video (own channel)', True), ('ai', 'AI assistants', False), ('social', 'Instagram', True),
          ('links', 'Sites linking in', False), ('ads', 'Paid ads', False)]
# Rules: name search = share of the top results for "<name> yacht broker" about the broker (all 100);
# video = YouTube uploads in the last 12 months vs peer median 15 (Wayne Lea 12 -> 80);
# Instagram = followers vs peer median 14,923 (Luis Perez 20,000; James Carter 9,845; Wayne Lea's linked account not found).
B_client = vec(CATS_B, rankings=100, video=0, social=3)
B_plan = vec(CATS_B, rankings=100, video=100, social=3)
B_lp = vec(CATS_B, rankings=100, video=100, social=100)
B_jc = vec(CATS_B, rankings=100, video=100, social=66)
B_wl = vec(CATS_B, rankings=100, video=80)
B_ov = overall(CATS_B, B_client); B_pl = overall(CATS_B, B_plan)

b_k = kpis([('25+', 'Years in luxury yachting; co-founder of Paragon Motor Yachts', ''),
            ('6', 'Sales announced publicly since 2021, up to a 161′ Trinity', ''),
            ('0', 'Videos on a channel of his own; 5 name him on Denison\'s', 'r'),
            ('9 of 9', 'Top Google results for "Jace Kizzier yacht broker" that are about him', '')])
b_s1 = DECIDE + b_k + f'''
<ol class="facts">
 <li><b>Credentials few brokers have.</b> Co-founder of Paragon Motor Yachts, he oversaw the design, construction and delivery of seven mega yachts. He covers the full ownership cycle: build management, transport, customs, crew, insurance and brokerage.</li>
 <li><b>A public track record.</b> Denison has announced 5 of his sales since 2021: two 105′ Numarines, a 118′ Trinity, a 116′ Lazzara and the 161′ Trinity LA DEA II (November 2025). He announced a sixth, BENEDETTA, on Instagram in September 2026.</li>
 <li><b>His expertise is <span class="r">not on camera</span> under his own name.</b> He has no YouTube channel, TikTok or personal Instagram. The 5 walkthroughs that name him are on Denison's channel, with about 133,000 combined views.</li>
 <li><b>Peers are building personal audiences.</b> Luis Perez, CPYB, has 20K Instagram followers and 186 YouTube videos. James Carter has 10,100 TikTok and 9,845 Instagram followers. Wayne Lea has 642 YouTube videos.</li>
 <li><b>His name search is fully his.</b> The top 9 results cover his Denison profile, jaceyachting.com, LinkedIn (510+ followers), Instagram and Denison's LA DEA II post.</li>
</ol>
{scorecard(1, 'Jace Kizzier', 'Peer median', [
    ['<b>Name search</b>', 'Top results about him, "&lt;name&gt; yacht broker"', '9 of 9', 'All', sc(100)],
    ['<b>Video (own channel)</b>', 'YouTube uploads, last 12 months', '0', '15', sc(0)],
    ['<b>Instagram</b>', 'Followers (@jace.yachting; no personal account found)', '428', '14,923', sc(3)],
    ['TikTok', 'Followers', '<b class="r">No account found</b>', 'Only James Carter: 10,100', U],
    ['Public sales record', 'Sales announced publicly', '<b>6</b>', 'Not counted', U],
    ['AI assistants, reviews', 'AI answers; Google reviews', U, D, U]])}
<div class="call"><b>The opportunity:</b> a builder-turned-broker can answer questions most brokers can't: what a refit really costs, how a build goes wrong, what to check on a 20-year-old Trinity. Putting Jace on camera answering them, on channels in his name, builds the audience his peers already have.</div>'''

b_s2 = exhibit(2, 'Sales announced publicly', table(
    ['Date', 'Yacht', 'Jace\'s role', 'Where announced'],
    [['Sep 2026', '70′ Viking 2012 · BENEDETTA', 'Represented the buyers', 'Instagram @jace.yachting'],
     ['Nov 2025', '161′ Trinity 2007 · LA DEA II', 'Introduced the buyer', 'Denison news'],
     ['Dec 2023', '116′ Lazzara 2009 · QTR', 'Represented the buyer', 'Denison news'],
     ['Jun 2023', '118′ Trinity 1999 · SUMMER LOVE', 'Represented the buyer', 'Denison news'],
     ['Dec 2022', '105′ Numarine 2021 · ZARANIA', 'Represented the seller', 'Denison news'],
     ['Jun 2021', '105′ Numarine 2021 · 7 DIAMONDS', 'Introduced the buyer', 'Denison news']]),
    'Source: Denison Yachting news pages and Instagram. No Google reviews and no press or podcast interviews were found for Jace Kizzier.') + '''
<ol class="facts">
 <li><b>Two current listings on Denison:</b> DIRT POOR (118′ Trinity 1999, $2,290,000) and ISLAND GIRL (48′ Offshore 1997, $330,000).</li>
 <li><b>Proof that performs:</b> the BENEDETTA post is the most-liked of the last 12 on @jace.yachting (25 likes and 3 comments, against 2 to 13 likes for industry-news posts).</li>
</ol>'''

b_s3 = exhibit(3, 'Where Jace appears in Google results', table(
    ['Search', 'Who appears', 'Jace on page 1'],
    [['jace kizzier yacht broker', 'Denison profile, jaceyachting.com, LinkedIn, Denison\'s LA DEA II post: 9 of 9 about him', Y],
     ['paragon motor yachts <i>(he co-founded it)</i>', 'YachtWorld, Boat International, Worth Avenue Yachts, SuperYacht Times', N],
     ['trinity yacht broker <i>(he has sold 2 Trinitys)</i>', 'United Yacht Sales, Denison "Sell your Trinity", Moran, YachtWorld', N],
     ['yacht new build broker <i>(his build background)</i>', 'Northrop &amp; Johnson, Moran, RJC, Curtis Stokes', N],
     ['how much does it cost to own a yacht', 'Reddit, Windward, Tiara, Moran, YachtWorld', N]]),
    f'Source: Google searches on {DATE}. The topics where his experience is strongest are the ones where he has no content.')

b_s4 = exhibit(4, 'Where Jace is represented online', table(
    ['Page', 'What it shows', 'Gap'],
    [['Denison broker profile', 'Bio, 2 listings, cell (949) 292-4583', 'No link to jaceyachting.com or LinkedIn'],
     ['jaceyachting.com About page', 'Full bio, 2 walkthrough videos, 561 number', 'No link to LinkedIn or Instagram; tap-to-call lacks +1'],
     ['LinkedIn', '"Luxury Yacht Broker", 510+ followers; calls Jace Yachting his personal brand', 'Activity not checked'],
     ['YATCO broker page', 'Jace Kizzier, Denison Yachting, Palm Beach Gardens', D],
     ['Paragon Motor Yachts YouTube', '124 subscribers, 4 videos; last upload April 2015', 'Dormant']]),
    f'Source: the pages listed, {DATE}.')

b_s5 = exhibit(5, 'Personal presence against three Florida brokers', table(
    ['Platform', 'Jace Kizzier', 'Luis Perez, CPYB', 'James Carter', 'Wayne Lea'],
    [['YouTube subscribers', '<b class="r">No channel</b>', '792', '269', '359'],
     ['YouTube videos', "0 (5 on Denison's)", '186', '126', '642'],
     ['Uploads, last 12 months', '<b class="r">0</b>', '15+', '15+', '12'],
     ['Instagram followers', '428 (@jace.yachting)', '20,000', '9,845', 'Linked account not found'],
     ['TikTok followers', '<b class="r">No account found</b>', 'Not found', '10,100', U],
     ['LinkedIn followers', '510+', U, U, U]]),
    'Peers: Luis Perez, CPYB (@yachtbrokerlp); James Carter, founder of Wave Marine Group, "South Florida" (@jamescarteryachting); Wayne Lea, Florida broker of 25+ years (@YourYachtAgent). Figures from each public profile.')

b_gaps = [
    ('No channel in his own name.', "Denison's channel holds the views on walkthroughs that name him (about 133,000). A viewer who likes Jace can't follow Jace."),
    ('No personal social audience.', 'No personal Instagram or TikTok found. Peers have 10K–20K followers on those platforms.'),
    ('His strongest topics have no content from him.', 'Paragon, Trinity and new-build searches show other brokers, even though he co-founded Paragon and has sold two Trinitys.'),
    ('His record is scattered.', "Five sales on Denison's news pages, one on Instagram, none as a story in his own voice."),
    ('Profiles don\'t point to each other.', "Denison's profile doesn't link to jaceyachting.com; the site doesn't link to LinkedIn."),
    ('Two phone numbers and two emails.', '949-292-4583 and JK@DenisonYachting.com on Denison; 561-677-0674 and jace@jaceyachting.com on the site.'),
    ('No press, podcasts or reviews found.', 'Nothing a buyer can find that shows other people vouching for him.'),
]
b_s6 = '<ol class="gaps">' + ''.join(f'<li><b>{a}</b> {b}</li>' for a, b in b_gaps) + '</ol>'

b_plan = [
    ['Decide the lead name, then open YouTube, Instagram and TikTok under it', 'Days 1–30', 'Jace + OneUpAI', 'Channels live'],
    ['One recording session: Jace answers 20 buyer, seller and owner questions on camera', 'Days 1–30', 'Jace + OneUpAI', 'Raw footage for 2 months of shorts'],
    ['Link Denison profile, jaceyachting.com, LinkedIn and socials to each other; one phone and email', 'Days 1–30', 'OneUpAI service', 'Consistent profiles'],
    ['Walkthroughs of DIRT POOR and ISLAND GIRL presented by Jace, on his channel', 'Days 1–30', 'OneUpTours', 'Views; listing inquiries'],
    ['"The builder\'s view": Paragon and seven mega-yacht builds, told by Jace', 'Days 31–60', 'Shorts agent (question), OneUpArticles', 'Paragon and new-build searches'],
    ['16 short clips a month from the session and selfie takes', 'Days 31–60', 'Shorts agent (question)', 'Followers, views'],
    ['Sold stories in his own words: LA DEA II, QTR, BENEDETTA and each new closing', 'Days 31–60', 'Shorts agent (testimonial)', 'Engagement, inquiries'],
    ['Weekly LinkedIn post from each long-form video, for owners and industry contacts', 'Days 31–60', 'OneUp posting step', 'LinkedIn followers, messages'],
    ['2 articles a month under his byline: Trinity buying guide, what a refit costs', 'Days 61–90', 'OneUpArticles', 'Searches on page 1'],
    ['Fort Lauderdale International Boat Show: Jace on the docks', 'Days 61–90', 'OneUpMoments', 'Views, leads'],
    ['Pitch 2 yachting podcasts or publications for an interview', 'Days 61–90', 'Jace + OneUpAI', 'Press mentions'],
]
b_s7 = timeline('Foundations: choose the name, open the channels, record the first session', 'Weekly pace: Jace on camera, shorts, sold stories, LinkedIn', 'Compound: bylined articles, the boat show, press') + plan_table(6, b_plan)
b_s8 = MEASURE(7, 'Followers and views by platform, name and topic searches, press mentions, AI answers')
SRC_B = SRC_COMMON + [('YATCO broker page: Jace Kizzier', 'https://www.yatco.com/broker/jace-kizzier-denison-yachting-palm-beach-gardens-florida-26790/'),
                      ('Luis Perez, CPYB: YouTube and Instagram', 'https://www.youtube.com/@yachtbrokerlp'),
                      ('James Carter: YouTube, Instagram and TikTok', 'https://www.youtube.com/@jamescarteryachting'),
                      ('Wayne Lea: YouTube', 'https://www.youtube.com/@YourYachtAgent')]
b_s9 = f'<p>A baseline audit from public sources, checked on {DATE}. Figures are as published; anything not verified is marked "Not checked" or "–" rather than estimated. The comparison set is three Florida yacht brokers who market under their own names; their figures were read from their public profiles and are not a ranking of their businesses.</p><ul class="sources">' + ''.join(
    f'<li><a href="{u}">{n}</a></li>' for n, u in SRC_B) + f'<li>Google searches on {DATE} (Exhibit 3)</li></ul>'

B_sections = [
    ('Current State', 'Deep credentials and a public sales record, with almost no audience of his own.', b_s1),
    ('Reputation', 'Six sales announced publicly since 2021, mostly on Denison\'s pages.', b_s2),
    ('What customers search', 'His name search is fully his; his expert topics show other brokers.', b_s3),
    ('Website and profiles', 'Four profiles describe him well but don\'t point to each other.', b_s4),
    ('Social, video and AI platforms', 'Peers publish weekly under their own names; Jace has no channel of his own.', b_s5),
    ('What is holding Jace back', 'Seven gaps, most important first.', b_s6),
    ('90-day execution to get Jace Kizzier more clients', 'Month one puts Jace on camera; months two and three turn his experience into weekly content.', b_s7),
    ('How results are measured', 'Four levels, from content published to closings, tracked monthly against this baseline.', b_s8),
    ('About this audit', f'A baseline audit from public sources, checked by hand on {DATE}.', b_s9),
]
open(OUT + 'jace-kizzier-expert-presence-audit-report.html', 'w').write(page('Jace Kizzier · Expert Presence Audit', 'Expert presence audit · yacht broker, Denison Yachting · South Florida', 'Jace Kizzier', B_sections, 'Jace Kizzier', 'Baseline audit'))

# ======================================================================
# 3D DATA
# ======================================================================
LOGO_3D = LOGO_JACE
z = [0] * 12


def P(id, name, users, label, color, kind, status, plan, fit, comps, content, note, fix):
    return dict(id=id, name=name, users=users, usersLabel=label, color=color, kind=kind, status=status, planStatus=plan, fit=fit, comps=comps, content=content, note=note, fix=fix)


def write3d(D, fn, title):
    tpl = (REPO / 'renderer' / 'template.html').read_text()
    js = (REPO / 'public' / 'report' / 'app.js').read_text().replace('</script', '<\\/script')
    e = html.escape
    out = (tpl.replace('{{TITLE}}', e(title)).replace('{{CLIENT}}', e(D['client']['name'])).replace('{{MARKET}}', e(D['client']['market'])).replace('{{CHIP}}', e(D['chip']))
           .replace('<script src="/report/app.js?v={{VERSION}}" defer></script>', '<script>' + js + '</script>').replace('{{DATA}}', json.dumps(D).replace('<', '\\u003c')))
    assert '{{' not in out
    open(OUT + fn, 'w').write(out)


def base(name, market, cats, brands, kws, plats, stops, qs, chip):
    n = 5; grid = [[None] * n for _ in range(n)]
    return {'version': 1, 'scene': 'marina', 'sample': False, 'generatedAt': '2026-09-29T18:00:00.000Z',
            'client': {'name': name, 'industry': 'Yacht brokerage', 'market': market, 'initials': 'JY', 'logo': LOGO_3D},
            'categories': [{'key': k, 'label': l, 'weight': W[k], 'checked': c} for k, l, c in cats],
            'brands': brands, 'keywords': kws,
            'ai': {'questions': qs, 'headline': qs[0], 'rows': [], 'clientNamed': 0, 'total': 0, 'projectedNamed': None},
            'map': {'n': n, 'keyword': 'yacht broker palm beach', 'home': [2, 2], 'grid': grid, 'planGrid': grid, 'labels': [], 'checked': False},
            'platforms': plats, 'stops': stops, 'details': {}, 'evidence': {},
            'labels': {'planOn': '90-day plan: on', 'planOff': 'Show the 90-day plan', 'scoreToday': 'Score on the areas checked', 'scorePlan': "With the plan's channels, fixes and videos live", 'scoreRow': 'Score on the areas checked'},
            'chip': chip}


NOTE = f'Position from one Google search on {DATE}. Monthly search volumes are measured in the full audit.'


def kw(term, owner, plan_owner, order):
    return {'term': term, 'volume': None, 'owner': owner, 'video': None, 'videoOwner': None, 'planOwner': plan_owner, 'evidence': [], 'note': NOTE, 'rows': [['Page 1', order]]}


# ---------- A: Jace Yachting vs the firms
A_brands = [
    {'id': 'client', 'name': 'Jace Yachting', 'color': '#e8a92e', 'client': True, 'scores': A_client, 'months': z, 'reviews': 0, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': A_ov,
     'videoNote': "No YouTube channel. The 5 videos on the site are Denison Yachting uploads (about 133,000 combined views).",
     'rows': [['Google reviews', 'No Google profile found'], ['Articles, last 12 months', '78'], ['Instagram followers', '428'], ['YouTube channel', 'None'], ['Links from the site to social', 'None'], ['Non-brand searches on page 1', '0 of 9']],
     'proposed': {'scores': A_plan, 'overall': A_pl, 'months': [1] * 12, 'reviews': 0, 'domains': None, 'speed': None, 'ads': None,
                  'rows': [['Google profile', 'Live (if Denison allows)'], ['Site checks passed', '6 of 6'], ['YouTube uploads in 90 days', 'Up to 12 long-form + 48 shorts'], ['Articles a month', '2 aimed at searches'], ['Rankings, followers, reviews', 'Measured monthly, not projected']]}},
    {'id': 'a', 'name': 'Worth Avenue Yachts', 'color': '#4a7fe0', 'scores': A_way, 'months': z, 'monthsChecked': False, 'reviews': 23, 'rating': 4.6, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_A, A_way),
     'videoNote': 'YouTube: 12.2K subscribers, 592 videos; 15 uploads between Aug 18 and Sep 29, 2026.',
     'rows': [['Google reviews', '23 at 4.6 (West Palm Beach)'], ['Instagram followers', '18K'], ['YouTube subscribers', '12.2K'], ['TikTok followers', '1,316'], ['Non-brand searches on page 1', '1 of 9']]},
    {'id': 'b', 'name': 'Northrop & Johnson', 'color': '#8d69d8', 'scores': A_nj, 'months': z, 'monthsChecked': False, 'reviews': 31, 'rating': 4.8, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_A, A_nj),
     'videoNote': 'YouTube: 9.19K subscribers, 582 videos; 15 uploads between Jul 8 and Sep 28, 2026.',
     'rows': [['Google reviews', '31 at 4.8 (Fort Lauderdale)'], ['Instagram followers', '75K'], ['YouTube subscribers', '9.19K'], ['TikTok followers', '6,691'], ['Non-brand searches on page 1', '4 of 9']]},
    {'id': 'c', 'name': 'Denison Yachting', 'color': '#2fa58d', 'scores': A_den, 'months': z, 'monthsChecked': False, 'reviews': 85, 'rating': 4.7, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_A, A_den),
     'videoNote': "YouTube: 273K subscribers; 15 uploads between Aug 10 and Sep 28, 2026. Hosts the 5 videos on jaceyachting.com.",
     'rows': [['Google reviews', '85 at 4.7 (Fort Lauderdale)'], ['Instagram followers', '84K'], ['YouTube subscribers', '273K'], ['TikTok followers', '11,100'], ['Non-brand searches on page 1', "3 of 9, all Jace's listings"]]},
]
A_kws = [
    kw('yacht broker palm beach', 'a', 'a', 'Worth Avenue Yachts 1st, Northrop & Johnson 3rd; Jace Yachting not on page 1'),
    kw('yacht broker fort lauderdale', 'b', 'b', 'Northrop & Johnson 4th; Jace Yachting not on page 1'),
    kw('118 trinity yacht for sale', 'c', 'client', "Denison's DIRT POOR page 1st and its video 3rd; this is Jace's listing, but jaceyachting.com is not on page 1"),
    kw('1997 offshore 48 sedan for sale', 'c', 'client', "Denison 3rd; Jace's ISLAND GIRL listing; jaceyachting.com not on page 1"),
    kw('paragon yacht for sale', 'b', 'b', 'Northrop & Johnson 4th; Jace Yachting not on page 1'),
    kw('how much does it cost to own a yacht', None, 'client', 'None of the four. jaceyachting.com offers a free ownership-cost guide that does not rank'),
    kw('sell my yacht florida', None, 'client', 'None of the four'),
    kw('jace yachting', 'client', 'client', 'Jace Yachting 1st with sitelinks (the brand name)'),
]
A_plats = [
    P('google', 'Google Search & Maps', None, 'Where most broker searches start', '#4f7de0', 'search', 'active', 'active', 'High', ['a', 'b', 'c'], ['yacht broker palm beach', '118 trinity yacht for sale', 'sell my yacht florida'],
      '1st for "Jace Yachting"; not on page 1 for 9 other searches. No Google business profile found.', 'Meta descriptions, schema, sold pages and a Google profile (OneUpAI service)'),
    P('youtube', 'YouTube', 2.5e9, 'monthly users (est.)', '#e0473d', 'mixed', 'none', 'active', 'High', ['a', 'b', 'c'], ['Listing walkthroughs', 'Market updates', 'Sold stories'],
      "No channel. The 5 site videos are Denison uploads. The three firms each posted 15+ videos since July 8.", 'Walkthroughs and 4 long-form videos a month (OneUpTours)'),
    P('instagram', 'Instagram', 3.0e9, 'monthly users', '#d0458f', 'content', 'active', 'active', 'High', ['a', 'b', 'c'], ['Sold posts', 'Listing reels'],
      '@jace.yachting: 428 followers, 131 posts, 12 posts from Aug 20 to Sep 24. Not linked from the website.', '16 shorts a month with search terms in captions (OneUp posting step)'),
    P('tiktok', 'TikTok', 2.0e9, 'monthly users (est.)', '#1f2a33', 'content', 'none', 'active', 'Medium', ['a', 'b', 'c'], ['Yacht tours', 'Buyer questions'],
      'No account found. Firms: 1,316, 6,691 and 11,100 followers.', 'Vertical cut of every short (OneUp posting step)'),
    P('facebook', 'Facebook', 3.1e9, 'monthly users (est.)', '#3b67c9', 'content', 'active', 'active', 'Medium', [], ['Sold posts', 'Boat show recaps'],
      'Page "Jace Yachting": 308 followers, 0 reviews; repeats the Instagram posts.', 'Same posts, plus boat show recaps (OneUpMoments)'),
    P('linkedin', 'LinkedIn', 3.1e8, 'monthly users (est.)', '#2f6fb0', 'content', 'active', 'active', 'Medium', [], ['Market updates', 'Owner insights'],
      "Jace's profile, 510+ followers; not linked from the website.", 'Weekly post from each long-form video'),
    P('chatgpt', 'AI assistants', 9.0e8, 'ChatGPT weekly users alone', '#2f8a6d', 'search', 'unknown', 'unknown', 'High', [], ['Who is a good yacht broker in Palm Beach?'],
      'Not checked in this manual audit.', 'Question shorts and FAQ pages (Shorts agent, question preset)'),
]
A_qs = ['Who is a good yacht broker in Palm Beach?', 'How much does it cost to own a 100-foot yacht?', 'How do I sell my yacht in Florida?', 'Who can manage a new yacht build?']
A_stops = [
    {'key': 'overview', 'label': 'Overview', 't': f'Jace Yachting scores {A_ov} on the areas checked, against Palm Beach and Fort Lauderdale firms that hold page 1.',
     'b': 'Gold is Jace Yachting. The other three are the firms found on page 1 for broker searches, including Denison, Jace\'s brokerage. A score of 100 means at or above their median. Click anything for details.',
     'tp': f"With the plan's channels, site fixes and videos live: {A_pl} on the same areas.", 'bp': 'Rankings, followers and reviews are not projected; the monthly audit measures them.'},
    {'key': 'graph', 'label': 'Audience', 't': 'Active on Instagram and Facebook. No YouTube channel or TikTok, and the website links to none of its accounts.',
     'b': 'Sphere size is audience size. A gold path means Jace Yachting is active there; dashed means absent or not checked. Click a sphere for details.',
     'tp': 'After the plan: active on YouTube, Instagram, TikTok, Facebook and LinkedIn, all linked from the site.', 'bp': 'One walkthrough becomes a YouTube video, 4 shorts, a Reel, a TikTok, a LinkedIn post and an article.'},
    {'key': 'kw', 'label': 'Searches', 't': 'First for its own name only. Searches for Jace\'s own listings land on Denison.',
     'b': 'Each tower is a search. Its color is whichever of the four appears highest; grey means none of them. Search volumes are measured in the full audit.',
     'tp': "The plan targets Jace's listings, selling, and ownership-cost searches first.", 'bp': 'Gold caps are the searches the plan targets.'},
    {'key': 'store', 'label': 'On deck', 't': 'No YouTube channel, so no portholes are lit.',
     'b': 'The 12 portholes along the hull are the last 12 months; a lit porthole means a YouTube upload that month on a channel Jace Yachting owns.',
     'tp': 'Up to 4 long-form videos and 16 shorts a month light every porthole.', 'bp': 'Walkthroughs, market updates, sold stories and buyer questions.'},
    {'key': 'reviews', 'label': 'Reviews', 't': 'No Google profile, so no reviews. Six sales have been announced publicly since 2021.',
     'b': 'The people on each pier are its Google review count: Denison 85, Northrop & Johnson 31, Worth Avenue Yachts 23.',
     'tp': 'A Google profile and review requests to past buyers and sellers.', 'bp': 'Each closing becomes a sold story, with the client\'s permission.'},
    {'key': 'video', 'label': 'Video', 't': "5 videos on the site, about 133,000 views, all on Denison's channel.",
     'b': 'The firms publish weekly: each posted 15+ videos since July 8, 2026.',
     'tp': 'A Jace Yachting channel with walkthroughs of DIRT POOR and ISLAND GIRL first.', 'bp': 'Made by OneUpTours and the Shorts agent.'},
    {'key': 'comp', 'label': 'Competition', 't': 'The firms hold page 1 for Palm Beach and Fort Lauderdale broker searches.',
     'b': "The people walking in are each business's share of presence among the four, based on the areas checked.",
     'tp': 'With the plan, people switch to Jace Yachting.', 'bp': 'Follow the gold paths: an illustration based on the areas checked. Inquiries are measured monthly.'},
    {'key': 'plan', 'label': '90-day plan', 't': 'The 90-day plan', 'b': '', 'tp': 'The 90-day plan', 'bp': '',
     'list': ['Fix the tap-to-call link; add meta descriptions, schema and social links', 'One phone number and email everywhere', 'YouTube channel and TikTok; resolve the @jaceyachting handle',
              'Google profile, if Denison allows', 'Walkthroughs of DIRT POOR and ISLAND GIRL (OneUpTours)', '4 long-form videos, 16 shorts and 2 articles a month',
              'Short series from the 4 free guides (Shorts agent)', 'Sold stories, boat show coverage and review requests']},
]
DA = base('Jace Yachting', 'Palm Beach & Fort Lauderdale, FL', CATS_A, A_brands, A_kws, A_plats, A_stops, A_qs, f'Baseline audit · public data, {DATE}')
write3d(DA, 'jace-yachting-presence-audit-3d.html', 'Jace Yachting · Presence audit')

# ---------- B: Jace Kizzier vs peer brokers
B_brands = [
    {'id': 'client', 'name': 'Jace Kizzier', 'color': '#e8a92e', 'client': True, 'scores': B_client, 'months': z, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': B_ov,
     'videoNote': "No channel of his own. 5 walkthroughs naming him are on Denison's channel (about 133,000 views).",
     'rows': [['Sales announced publicly', '6 since 2021'], ['YouTube channel', 'None'], ['Instagram followers', '428 (@jace.yachting)'], ['TikTok', 'No account found'], ['LinkedIn followers', '510+'], ['Name search', '9 of 9 results about him']],
     'proposed': {'scores': B_plan, 'overall': B_pl, 'months': [1] * 12, 'reviews': None, 'domains': None, 'speed': None, 'ads': None,
                  'rows': [['Channels', 'YouTube, Instagram, TikTok in the lead name'], ['On camera', '4 long-form + 16 shorts a month'], ['Sold stories', 'Each closing, in his words'], ['Followers', 'Measured monthly, not projected']]}},
    {'id': 'a', 'name': 'Luis Perez, CPYB', 'color': '#4a7fe0', 'scores': B_lp, 'months': z, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_B, B_lp),
     'videoNote': 'YouTube: 792 subscribers, 186 videos; latest upload Sep 9, 2026.',
     'rows': [['YouTube', '792 subscribers, 186 videos'], ['Instagram followers', '20K'], ['TikTok', 'Not found (@yachtbrokerlp)']]},
    {'id': 'b', 'name': 'James Carter', 'color': '#8d69d8', 'scores': B_jc, 'months': z, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_B, B_jc),
     'videoNote': 'YouTube: 269 subscribers, 126 videos; latest upload Feb 11, 2026.',
     'rows': [['YouTube', '269 subscribers, 126 videos'], ['Instagram followers', '9,845'], ['TikTok followers', '10,100']]},
    {'id': 'c', 'name': 'Wayne Lea', 'color': '#2fa58d', 'scores': B_wl, 'months': z, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(CATS_B, B_wl),
     'videoNote': 'YouTube: 359 subscribers, 642 videos; 12 uploads in the last 12 months.',
     'rows': [['YouTube', '359 subscribers, 642 videos'], ['Instagram', 'Linked account not found'], ['Experience', 'Florida broker 25+ years']]},
]
B_kws = [
    kw('jace kizzier yacht broker', 'client', 'client', '9 of 9 results are about Jace'),
    kw('luis perez yacht broker', 'a', 'a', 'Results about Luis Perez'),
    kw('james carter yacht broker', 'b', 'b', 'Results about James Carter'),
    kw('wayne lea yacht broker', 'c', 'c', 'Results about Wayne Lea'),
    kw('paragon motor yachts', None, 'client', 'None of the four. Jace co-founded Paragon Motor Yachts'),
    kw('trinity yacht broker', None, 'client', 'None of the four. Jace has sold two Trinitys and lists a third'),
    kw('yacht new build broker', None, 'client', "None of the four. Jace's build background"),
    kw('how much does it cost to own a yacht', None, 'client', 'None of the four'),
]
B_plats = [
    P('youtube', 'YouTube', 2.5e9, 'monthly users (est.)', '#e0473d', 'mixed', 'none', 'active', 'High', ['a', 'b', 'c'], ['Builder\'s view', 'Walkthroughs presented by Jace'],
      "No channel of his own. 5 walkthroughs name him on Denison's channel. Paragon Motor Yachts channel dormant since 2015.", 'Channel in the lead name; 4 long-form videos a month'),
    P('instagram', 'Instagram', 3.0e9, 'monthly users', '#d0458f', 'content', 'unknown', 'active', 'High', ['a', 'b'], ['Sold stories', 'On the docks'],
      'No personal account found; the brand account @jace.yachting has 428 followers. Peers: 20K and 9,845.', 'Shorts of Jace on camera (Shorts agent)'),
    P('tiktok', 'TikTok', 2.0e9, 'monthly users (est.)', '#1f2a33', 'content', 'none', 'active', 'Medium', ['b'], ['Rapid-fire buyer questions'],
      'No account found. James Carter has 10,100 followers.', 'Vertical cut of every short'),
    P('linkedin', 'LinkedIn', 3.1e8, 'monthly users (est.)', '#2f6fb0', 'content', 'active', 'active', 'High', [], ['Owner insights', 'Market updates'],
      '"Luxury Yacht Broker", 510+ followers. Calls Jace Yachting his personal brand.', 'Weekly post from each long-form video'),
    P('facebook', 'Facebook', 3.1e9, 'monthly users (est.)', '#3b67c9', 'content', 'active', 'active', 'Low', [], ['Sold posts'],
      'Personal profile; brand page "Jace Yachting" has 308 followers.', 'Same posts as Instagram'),
    P('google', 'Google Search', None, 'Name and topic searches', '#4f7de0', 'search', 'active', 'active', 'High', [], ['paragon motor yachts', 'trinity yacht broker', 'yacht new build broker'],
      'Name search: 9 of 9 results about him. Paragon, Trinity and new-build searches: none.', 'Bylined articles with video (OneUpArticles)'),
    P('chatgpt', 'AI assistants', 9.0e8, 'ChatGPT weekly users alone', '#2f8a6d', 'search', 'unknown', 'unknown', 'High', [], ['Who knows Paragon yachts best?'],
      'Not checked in this manual audit.', 'Question shorts and articles'),
]
B_qs = ['Who is an expert on Paragon motor yachts?', 'What should I check before buying a used Trinity?', 'What does a yacht refit cost?', 'Who can manage a new yacht build?']
B_stops = [
    {'key': 'overview', 'label': 'Overview', 't': f'Jace Kizzier scores {B_ov} on the areas checked, against three Florida brokers who market under their own names.',
     'b': 'Gold is Jace. The areas checked are name search, video on his own channel and Instagram. A score of 100 means at or above the peer median. Click anything for details.',
     'tp': f'With channels in his name and Jace on camera weekly: {B_pl} on the same areas.', 'bp': 'Followers are not projected; the monthly audit measures them.'},
    {'key': 'graph', 'label': 'Audience', 't': 'Present on LinkedIn and through the Jace Yachting accounts; no personal YouTube, Instagram or TikTok.',
     'b': 'Sphere size is audience size. A gold path means Jace is active there; dashed means absent or not checked.',
     'tp': 'After the plan: Jace on camera on YouTube, Instagram, TikTok and LinkedIn.', 'bp': 'One recording session feeds two months of shorts.'},
    {'key': 'kw', 'label': 'Searches', 't': 'His name search is fully his. Paragon, Trinity and new-build searches show other brokers.',
     'b': 'Each tower is a search. Its color is whichever of the four appears; grey means none of them.',
     'tp': 'The plan targets the topics where his experience is strongest.', 'bp': 'Gold caps are the searches the plan targets.'},
    {'key': 'store', 'label': 'On deck', 't': 'No channel of his own, so no portholes are lit.',
     'b': 'The 12 portholes are the last 12 months; a lit porthole means an upload that month on a channel in Jace\'s name.',
     'tp': 'Weekly videos light every porthole from here on.', 'bp': "The builder's view, walkthroughs, sold stories and buyer questions."},
    {'key': 'reviews', 'label': 'Proof', 't': 'Six sales announced publicly since 2021, including the 161′ Trinity LA DEA II.',
     'b': 'Google reviews were not found for Jace or checked for the peers, so the piers show no crowds.',
     'tp': 'Each closing becomes a sold story in his own words.', 'bp': 'With the client\'s permission.'},
    {'key': 'video', 'label': 'Video', 't': "5 walkthroughs name Jace on Denison's channel, about 133,000 views; none on a channel of his.",
     'b': 'Peers: Luis Perez 186 videos, James Carter 126, Wayne Lea 642.',
     'tp': 'Jace presents his own walkthroughs and answers owner questions.', 'bp': 'OneUpTours and the Shorts agent.'},
    {'key': 'comp', 'label': 'Peers', 't': 'Peers publish under their own names every month.',
     'b': "The people walking in are each broker's share of presence among the four, based on the areas checked.",
     'tp': 'With the plan, attention shifts to Jace.', 'bp': 'An illustration based on the areas checked; followers and inquiries are measured monthly.'},
    {'key': 'plan', 'label': '90-day plan', 't': 'The 90-day plan', 'b': '', 'tp': 'The 90-day plan', 'bp': '',
     'list': ['Decide the lead name; open YouTube, Instagram and TikTok', 'One recording session: 20 questions on camera', 'Link Denison profile, site, LinkedIn; one phone and email',
              'Walkthroughs presented by Jace (OneUpTours)', "\"The builder's view\" series on Paragon and new builds", 'Sold stories in his own words',
              'Weekly LinkedIn posts; 2 bylined articles a month', 'Boat show coverage and podcast pitches']},
]
DB = base('Jace Kizzier', 'Yacht broker, Denison Yachting · South Florida', CATS_B, B_brands, B_kws, B_plats, B_stops, B_qs, f'Baseline audit · public data, {DATE}')
DB['client']['initials'] = 'JK'
write3d(DB, 'jace-kizzier-expert-presence-audit-3d.html', 'Jace Kizzier · Expert presence audit')

print('A', A_ov, '->', A_pl, [b['overall'] for b in A_brands])
print('B', B_ov, '->', B_pl, [b['overall'] for b in B_brands])
