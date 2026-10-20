"""Morne Koen: written presence audit + 3D view. Every figure was collected from public pages on October 20, 2026 (see SOURCES)."""
import base64, html, json
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]          # .../oneupai-brand-audit
HERE = Path(__file__).resolve().parent              # this client's folder

OUT = str(REPO / 'audits' / 'out' / 'morne-koen') + '/'
Path(OUT).mkdir(parents=True, exist_ok=True)
CSS = (REPO / 'plans' / 'assets' / 'report.css').read_text()
LOGO_ONEUP = 'data:image/svg+xml;base64,' + base64.b64encode((REPO / 'plans' / 'assets' / 'oneupai-logo.svg').read_bytes()).decode()
WORDMARK = '''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200" viewBox="0 0 520 200"><rect width="520" height="200" fill="#ffffff"/>
<text x="260" y="104" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="64" font-weight="800" fill="#0f2c4a" letter-spacing="2">MORNE KOEN</text>
<rect x="150" y="124" width="220" height="4" fill="#e8a92e"/>
<text x="260" y="162" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-size="22" font-weight="700" fill="#b87c0b" letter-spacing="4">PROPERTY · EASTERN CAPE</text></svg>'''
(HERE / 'logo.svg').write_text(WORDMARK)
LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(WORDMARK.encode()).decode()
DATE = 'October 20, 2026'
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
CATS = [('map', 'Map & local search', False), ('profile', 'Portal listings', True), ('reviews', 'Reviews', False), ('website', 'Own website', True),
        ('rankings', 'Name search', True), ('video', 'Video (own channel)', True), ('ai', 'AI assistants', False), ('social', 'Instagram', True),
        ('links', 'Facebook audience', True), ('ads', 'Paid ads', False)]
# Rules, each against the peer median (Kobie Potgieter, Kirsty du Toit, Shelley Conyers):
# portal listings = Property24 "for sale" count vs median 6 (53, 5, 6); own website: median yes (Kobie, Shelley yes; Kirsty no);
# name search = top-9 results about the agent vs 9 of 9; video = YouTube uploads in the last 12 months vs median 2 (0, 2, 15);
# Instagram = followers vs median 936 (412, 936, 1,599); Facebook = followers vs median 770 (2,666, 726, 770). Capped at 100.
cap = lambda v, m: min(100, round(v / m * 100))


def vec(**kw):
    return [kw.get(k) for k, _, _ in CATS]


def overall(s):
    num = sum(v * W[k] for (k, _, _), v in zip(CATS, s) if v is not None)
    den = sum(W[k] for (k, _, _), v in zip(CATS, s) if v is not None)
    return round(num / den)


M_now = vec(profile=100, website=0, rankings=89, video=cap(1, 2), social=0, links=100)
M_plan = vec(profile=100, website=100, rankings=100, video=100, social=0, links=100)
KP = vec(profile=100, website=100, rankings=100, video=0, social=cap(412, 936), links=100)
KD = vec(profile=cap(5, 6), website=0, rankings=100, video=100, social=100, links=cap(726, 770))
SC = vec(profile=100, website=100, rankings=100, video=100, social=100, links=100)
OV, PL = overall(M_now), overall(M_plan)

# ---------------------------------------------------------------- report
k = kpis([('30', 'Years in sales and marketing; in property since 2020', ''),
          ('23', 'Listings on his Mandated profile, 6 of them marked sold', ''),
          ('5,132', 'Facebook followers, the largest audience of the four agents compared', ''),
          ('0', 'Websites in his own name; 1 video in the last 12 months', 'r')])
SCORE = exhibit(1, 'Scorecard', table(['Area', 'Measure', 'Morne Koen', 'Peer median', 'Score'], [
    ['<b>Portal listings</b>', 'Listings for sale on Property24', '14', '6', sc(100)],
    ['<b>Facebook audience</b>', 'Followers (his profile; peers\' pages)', '5,132', '770', sc(100)],
    ['<b>Name search</b>', 'Top 9 Google results about him, "Morne Koen"', '8 of 9', '9 of 9', sc(89)],
    ['<b>Video (own channel)</b>', 'YouTube uploads, last 12 months', '1', '2', sc(50)],
    ['<b>Own website</b>', 'A site in his own name', N, 'Yes (2 of 3)', sc(0)],
    ['<b>Instagram</b>', 'Followers', '<b class="r">No confirmed account</b>', '936', sc(0)],
    ['Reviews, AI assistants', 'Google reviews; AI answers', U, D, U]]),
    'Peers: Kobie Potgieter (RE/MAX Independent Properties), Kirsty du Toit (Namar Properties) and Shelley Conyers (eXp Realty), three Gqeberha agents who market under their own names. A score of 100 means at or above their median; areas marked "Not checked" are left out of the overall score.')
s1 = k + f'''
<ol class="facts">
 <li><b>A marketer selling property.</b> Thirty years in sales, distribution and marketing, then property since 2020: Keller Williams, RE/MAX, and Mandated Property Group since February 2025.</li>
 <li><b>Real stock across five towns.</b> 17 listings for sale from R250,000 to R5,500,000 in Gqeberha, Port Alfred, Bathurst, Steynsburg and East London. 6 more are marked sold.</li>
 <li><b>An audience already there.</b> 5,132 people follow his Facebook profile and 1,559 follow him on LinkedIn. That's more than any of the three Gqeberha agents compared, but the feed mixes listings with personal posts.</li>
 <li><b>Nowhere of his own to send people.</b> No personal website, one YouTube upload in the last 12 months, and no confirmed Instagram account. Two of the three peers have a website; one uploads to YouTube every month.</li>
 <li><b>Nobody owns the category searches.</b> For "estate agent Gqeberha", "estate agent Port Alfred" and "sell my house Port Alfred", page 1 is portals and agency offices. None of the four agents appears, so the position is open.</li>
</ol>
{SCORE}
<div class="call"><b>The opportunity:</b> Morne has the listings, the experience and the largest following of the four. What he lacks is a home base and a steady voice. A website in his name, Morne on camera every week, and one clear focus area would make him the agent people find, watch and call in Gqeberha and on the Sunshine Coast.</div>'''

s2 = exhibit(2, 'Listings on his Mandated profile, by town', table(
    ['Town', 'For sale', 'Marked sold', 'Price range (for sale)'],
    [['Gqeberha (Port Elizabeth): St Georges Park, Clarendon Marine, Kabega, Royalston, Wedgewood Golf Estate, Fairview', '6', '2', 'R950,000 – R2,750,000'],
     ['Steynsburg', '5', '4', 'R250,000 – R649,900'],
     ['Port Alfred: Central, West Beach, West Bank', '3', '0', 'R1,350,000 – R5,500,000'],
     ['East London: Nahoon Valley, Beacon Bay', '2', '0', 'R1,200,000'],
     ['Bathurst', '1', '0', 'R795,000'],
     ['<b>Total</b>', '<b>17</b>', '<b>6</b>', '<b>Median R1,200,000</b>']]),
    f'Source: mandated.co.za agent profile, 23 listings, {DATE}. Sale dates are not shown, so this is not a sales rate. Property24 shows 14 for sale and lists his areas as Bathurst, Gqeberha, Port Alfred and Steynsburg.') + '''
<ol class="facts">
 <li><b>Spread wide.</b> The listings run from the Karoo (Steynsburg) to the coast (Gqeberha, Port Alfred, East London). That's good for stock, but hard to be "the" agent for every place.</li>
 <li><b>Where the value sits.</b> His three Port Alfred listings and the Gqeberha estates (Wedgewood, Royalston, Clarendon Marine) are the higher-priced stock. Steynsburg is where most of his marked sales are.</li>
</ol>'''

s3 = exhibit(3, 'Where Morne appears in Google results', table(
    ['Search', 'What page 1 shows', 'Morne on page 1'],
    [['morne koen', 'Property24, Facebook, Mandated, Private Property, LinkedIn, SA Hometraders: 8 of 9 about him (1 is a different Morne Koen)', Y],
     ['estate agent gqeberha', 'Property24, Private Property and MyProperty directories; Engel &amp; Völkers, Just Property, Pam Golding, Affinity', N],
     ['estate agent port alfred', 'Portal directories; Harcourts, RE/MAX Kowie, Pam Golding and Seeff agents', N],
     ['sell my house gqeberha', 'Engel &amp; Völkers, a "we buy homes" company, Facebook groups, We Sell Houses, Home &amp; Hectare', N],
     ['sell my house port alfred', 'Portal directories, RE/MAX Kowie, Pam Golding, a Facebook buy-and-sell group', N],
     ['moving to port alfred', 'An ImmoAfrica guide, Reddit, Facebook groups, Seeff\'s area profile, a retirement village', N],
     ['property valuation gqeberha', 'Property24 values, the municipal valuation roll, Engel &amp; Völkers, We Sell Houses on the 2027 General Valuation', N]]),
    f'Source: Google South Africa searches on {DATE}. None of the three peers appears for these searches either: the agent who publishes useful answers to them first can own them.')

s4 = exhibit(4, 'Where Morne is represented online', table(
    ['Page', 'What it shows', 'Gap'],
    [['Mandated agent profile', 'Bio, 23 listings, 082 571 0002, morne@mandated.co.za', 'WhatsApp button labelled "Abdul Sayed"; its link uses 082…, which WhatsApp links don\'t accept (needs 27 82…)'],
     ['Property24 (Mandated)', '14 for sale; areas Bathurst, Gqeberha, Port Alfred, Steynsburg', 'Same short bio as Mandated'],
     ['SA Hometraders', 'Two profiles: Mandated, and an older one under Morlin Holdings, Broadwood, Gqeberha', 'Duplicate profile'],
     ['Private Property', 'Current Mandated profile', 'Older profile now returns "page not found"'],
     ['RE/MAX Bay page (2022)', '"Development Manager", morne.k@remaxbay.co.za', 'Still live with an old email'],
     ['LinkedIn', '1,559 followers; 30 years in sales and marketing; posts about once a month', 'Posts get 0 to 4 reactions; recent posts mix listings, Dubai investment and agent recruitment'],
     ['Facebook profile (creator mode)', '5,132 followers; works at Mandated; lives in Port Elizabeth', 'Personal and property posts mixed; no business page'],
     ['YouTube @Morne_Koen_Developments', '18 subscribers; 3 listing videos (Feb 2024, Sep 2024, Aug 2026), 8 to 80 views', 'About text still says eXp Realty; a second, empty channel @MorneKoen'],
     ['Digital business card', 'ebc-mobile.co.za card shared on LinkedIn', 'Not a website; not found by search']]),
    f'Source: the pages listed, {DATE}.')

s5 = exhibit(5, 'Personal presence against three Gqeberha agents', table(
    ['Platform', 'Morne Koen', 'Kobie Potgieter', 'Kirsty du Toit', 'Shelley Conyers'],
    [['Agency', 'Mandated', 'RE/MAX Independent (broker/owner)', 'Namar Properties', 'eXp Realty (team leader)'],
     ['Property24 listings for sale', '14', '53', '5', '6'],
     ['Own website', '<b class="r">No</b>', 'kobiepotgieter.co.za', 'No', 'eXp agent site'],
     ['Facebook followers', '5,132 (profile)', '2,666 (page)', '726 (page)', '770 (page)'],
     ['Instagram followers', '<b class="r">No confirmed account</b>', '412', '936', '1,599'],
     ['YouTube: latest upload', 'Aug 2026 (3 videos)', 'Feb 2022 (15+ videos)', 'Dec 2025 (15+ videos)', 'Oct 2026 (15+ videos)'],
     ['YouTube uploads, last 12 months', '1', '0', '2', '15+'],
     ['Other', 'LinkedIn 1,559 followers', 'Claims "No.1 Residential Property Practitioner in Gqeberha"; appears on Kingfisher FM radio', 'Brands herself "Gqeberha Real Estate Agent"', '700 Instagram posts']]),
    'Figures read from each public profile. An Instagram account @morne_koen exists (private, 35 followers) but could not be confirmed as his. Kobie Potgieter also serves Bathurst and Port Alfred, Morne\'s areas.')

gaps = [
    ('No home base.', 'Every visitor lands on a portal or Mandated page next to other agents\' listings. Nothing collects a seller\'s details or books a valuation in his name.'),
    ('No steady voice.', 'One YouTube upload in 12 months and monthly LinkedIn posts that mostly repeat contact details. Peers who publish regularly are building recognition.'),
    ('Too many focuses.', 'Five towns, Dubai investment and agent recruitment in the same feed. Authority comes from being known for one place and one kind of client first.'),
    ('Contact details that break.', 'The WhatsApp button on his Mandated page is labelled with another agent\'s name and uses a link format WhatsApp doesn\'t accept.'),
    ('Old profiles still live.', 'A 2022 RE/MAX page with an old email, a duplicate SA Hometraders profile, and a YouTube channel that still says eXp.'),
    ('His biggest audience is mixed.', '5,132 Facebook followers see personal posts and listings side by side, with no business page to follow for property.'),
    ('No reviews or sold stories found.', 'Nothing a seller can find where past clients vouch for him.'),
]
s6 = '<ol class="gaps">' + ''.join(f'<li><b>{a}</b> {b}</li>' for a, b in gaps) + '</ol>'

s7 = '''<div class="tl" style="grid-template-columns:repeat(4,1fr)">
<div class="ph"><b>Month 1</b><span>Website in his name, valuation page, one phone and WhatsApp everywhere, old profiles fixed, first recording</span></div>
<div class="ph"><b>Months 2–3</b><span>Holiday season on the Sunshine Coast: open-house weekends, "moving to Port Alfred" and seller series</span></div>
<div class="ph"><b>Months 4–5</b><span>Monthly market reports for Gqeberha and Port Alfred, the 2027 valuation explainer, sold stories, reviews</span></div>
<div class="ph p3"><b>Month 6</b><span>Referral partners, review drive, day-180 report against this baseline</span></div></div>''' + exhibit(6, 'Every month for six months', table(
    ['What', 'Each month', 'Made with'],
    [['Long-form videos on his YouTube channel', '4', 'His recordings, edited by OneUpAI'],
     ['Short captioned clips for Facebook, Instagram, YouTube and LinkedIn', '16', 'OneUpShorts'],
     ['Walkthrough for each new listing', 'Every listing', 'His phone footage, OneUpMoments'],
     ['Market report: Gqeberha and Port Alfred', '1', 'OneUpArticles, in English and Afrikaans'],
     ['Articles on his website', '2', 'His recorded answers'],
     ['Website, valuation page and profile upkeep', 'Ongoing', 'OneUpAI']]),
    'Full plan, week by week: Morne Koen, Your 180-Day Plan.')

s8 = exhibit(7, 'How results are measured', table(
    ['Level', 'Measures', 'How often'],
    [['Published', 'Videos, shorts, articles and listing walkthroughs that went out', 'Weekly'],
     ['Found', 'Name and area searches; followers and views on each platform; Google reviews', 'Monthly'],
     ['Contacted', 'Valuation requests, seller and buyer inquiries, WhatsApp messages, and where each came from', 'Weekly'],
     ['Sold', 'Mandates won, sales and his average of 6 a month', 'Monthly, from his own numbers']]),
    'Sales targets are Morne\'s; the plan measures the pipeline that leads to them.')

SOURCES = [
    ('Mandated Property Group agent profile: Morne Koen', 'https://www.mandated.co.za/agent-single/695ced091df347607f47fc6f/morne-koen'),
    ('Property24 agent profile: Morne Koen (Mandated)', 'https://www.property24.com/estate-agents/mandated/morne-koen/534120'),
    ('SA Hometraders profile: Morne Koen (Morlin Holdings)', 'https://www.sahometraders.co.za/estate-agents/morne-koen/380860'),
    ('Private Property: older profile (page not found)', 'https://www.privateproperty.co.za/estate-agent/morne-koen/2315563/'),
    ('RE/MAX Bay team page (2022)', 'https://remaxbay.co.za/dev/morne-koen/'),
    ('LinkedIn: Morne Koen (profile, experience and activity)', 'https://www.linkedin.com/in/morne-koen-4b6a292b9/'),
    ('Facebook: Morne Koen', 'https://www.facebook.com/morne.koen/'),
    ('YouTube: @Morne_Koen_Developments and @MorneKoen', 'https://www.youtube.com/@Morne_Koen_Developments'),
    ('Instagram: @morne_koen (private, not confirmed)', 'https://www.instagram.com/morne_koen/'),
    ('Kobie Potgieter: Property24, Facebook page, Instagram, YouTube', 'https://www.property24.com/estate-agents/re-max-independent-properties-lorraine/kobie-potgieter/115055'),
    ('Kirsty du Toit: Property24, Facebook page, Instagram, YouTube', 'https://www.property24.com/estate-agents/namar-properties/kirsty-du-toit/312120'),
    ('Shelley Conyers: Property24, Facebook page, Instagram, YouTube', 'https://www.property24.com/estate-agents/exp-south-africa/shelley-conyers/407682'),
]
s9 = f'<p>A baseline audit from public sources, checked by hand on {DATE}. Figures are as published; anything not verified is marked "Not checked" or "–" rather than estimated. The three peers are Gqeberha agents who market under their own names; their figures come from their public profiles and are not a ranking of their businesses.</p><ul class="sources">' + ''.join(
    f'<li><a href="{u}">{n}</a></li>' for n, u in SOURCES) + f'<li>Google South Africa searches on {DATE} (Exhibit 3)</li></ul>'

SECTIONS = [
    ('Current State', 'Real listings and the biggest audience of the four, with no home base of his own.', s1),
    ('Listings', 'Seventeen for sale and six marked sold, spread from the Karoo to the coast.', s2),
    ('What customers search', 'His name search is his; the category searches belong to nobody yet.', s3),
    ('Website and profiles', 'Nine places describe him; none is his own, and some are out of date.', s4),
    ('Social and video', 'He has the largest audience but the quietest channel.', s5),
    ('What is holding Morne back', 'Seven gaps, most important first.', s6),
    ('180 days to the go-to agent', 'Month one builds the home base; months two to six put Morne in front of buyers and sellers every week.', s7),
    ('How results are measured', 'Four levels, from content published to sales, tracked against this baseline.', s8),
    ('About this audit', f'A baseline audit from public sources, checked by hand on {DATE}.', s9),
]
body = ''.join(section(i + 1, t, l, b) for i, (t, l, b) in enumerate(SECTIONS))
report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Morne Koen · Presence Audit</title>
<style>{CSS}
.clogo {{ width: auto; height: 118px; max-width: 62vw; object-fit: contain; }}
.tw tbody td {{ text-align: left; }}
.line {{ white-space: normal; }}
@media (max-width: 760px) {{ .tl {{ grid-template-columns: 1fr 1fr !important; }} .clogo {{ height: 84px; }} }}
</style></head>
<body>
<header class="hero"><div class="wrap">
 <div class="toprow"><img class="clogo" src="{LOGO}" alt="Morne Koen"><img class="olog" src="{LOGO_ONEUP}" alt="OneUpAI"></div>
 <p class="kicker">Presence audit · property practitioner, Mandated Property Group · Gqeberha &amp; Sunshine Coast</p>
 <h1>Morne Koen</h1>
 <p class="meta">Prepared for <b>Morne Koen</b> · Prepared by <b>Nick Zarzycki, OneUpAI</b> · {DATE}</p>
 <span class="status">Baseline audit</span>
</div></header>
<main>{body}</main>
<footer><span>Prepared by Nick Zarzycki, OneUpAI · nz@oneupai.com</span><span>Confidential · Morne Koen</span></footer>
</body></html>'''
open(OUT + 'morne-koen-presence-audit-report.html', 'w').write(report)


# ---------------------------------------------------------------- 3D
def P(id, name, users, label, color, kind, status, plan, fit, comps, content, note, fix):
    return dict(id=id, name=name, users=users, usersLabel=label, color=color, kind=kind, status=status, planStatus=plan, fit=fit, comps=comps, content=content, note=note, fix=fix)


NOTE = f'Position from one Google South Africa search on {DATE}. Monthly search volumes are measured in the full audit.'
kw = lambda term, owner, plan_owner, order: {'term': term, 'volume': None, 'owner': owner, 'video': None, 'videoOwner': None, 'planOwner': plan_owner, 'evidence': [], 'note': NOTE, 'rows': [['Page 1', order]]}
months = [0] * 12
months[10] = 1  # one upload, Aug 2026, in the last 12 months (Nov 2025 – Oct 2026)

brands = [
    {'id': 'client', 'name': 'Morne Koen', 'color': '#e8a92e', 'client': True, 'scores': M_now, 'months': months, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': OV,
     'videoNote': 'YouTube @Morne_Koen_Developments: 18 subscribers, 3 listing videos; one upload in the last 12 months (Aug 2026, 58 views).',
     'rows': [['Listings (Mandated)', '17 for sale, 6 marked sold'], ['Facebook followers', '5,132'], ['LinkedIn followers', '1,559'], ['Own website', 'None'], ['Instagram', 'No confirmed account'], ['Name search', '8 of 9 results about him']],
     'proposed': {'scores': M_plan, 'overall': PL, 'months': [1] * 12, 'reviews': None, 'domains': None, 'speed': None, 'ads': None,
                  'rows': [['Website', 'In his name, with a valuation page'], ['On camera', '4 long-form + 16 shorts a month'], ['Market report', 'Monthly, Gqeberha and Port Alfred'], ['Followers, reviews, sales', 'Measured monthly, not projected']]}},
    {'id': 'a', 'name': 'Kobie Potgieter', 'color': '#4a7fe0', 'scores': KP, 'months': [0] * 12, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(KP),
     'videoNote': 'YouTube: 250 subscribers, 15+ videos; latest upload Feb 2022.',
     'rows': [['Agency', 'RE/MAX Independent (broker/owner)'], ['Property24 listings', '53'], ['Facebook page', '2,666 followers'], ['Instagram', '412 followers'], ['Website', 'kobiepotgieter.co.za']]},
    {'id': 'b', 'name': 'Kirsty du Toit', 'color': '#8d69d8', 'scores': KD, 'months': [0] * 12, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(KD),
     'videoNote': 'YouTube: 15+ videos; 2 uploads in the last 12 months, latest Dec 2025.',
     'rows': [['Agency', 'Namar Properties'], ['Property24 listings', '5'], ['Facebook page', '726 followers'], ['Instagram', '936 followers']]},
    {'id': 'c', 'name': 'Shelley Conyers', 'color': '#2fa58d', 'scores': SC, 'months': [0] * 12, 'monthsChecked': False, 'reviews': None, 'rating': None, 'domains': None, 'ads': None, 'speed': None, 'screen': None, 'overall': overall(SC),
     'videoNote': 'YouTube: 54 subscribers; 15+ uploads in the last 12 months, latest Oct 18, 2026.',
     'rows': [['Agency', 'eXp Realty (team leader)'], ['Property24 listings', '6'], ['Facebook page', '770 followers'], ['Instagram', '1,599 followers'], ['Website', 'eXp agent site']]},
]
kws = [
    kw('morne koen', 'client', 'client', '8 of 9 results are about Morne'),
    kw('estate agent gqeberha', None, 'client', 'None of the four: portal directories and agency offices'),
    kw('estate agent port alfred', None, 'client', 'None of the four: portals, Harcourts, RE/MAX Kowie, Pam Golding, Seeff'),
    kw('sell my house gqeberha', None, 'client', 'None of the four'),
    kw('sell my house port alfred', None, 'client', 'None of the four'),
    kw('moving to port alfred', None, 'client', 'None of the four: guides, Reddit and Facebook groups'),
    kw('property valuation gqeberha', None, 'client', 'None of the four: Property24 values and the municipal valuation roll'),
    kw('kobie potgieter', 'a', 'a', 'Results about Kobie Potgieter'),
]
plats = [
    P('facebook', 'Facebook', 3.1e9, 'monthly users (est.)', '#3b67c9', 'content', 'active', 'active', 'High', ['a', 'b', 'c'], ['Listing reels', 'Market reports', 'Sold stories'],
      'Profile in creator mode, 5,132 followers; personal and property posts mixed. Peers run business pages: 2,666, 726 and 770 followers.', 'A business page with property posts on a schedule'),
    P('youtube', 'YouTube', 2.5e9, 'monthly users (est.)', '#e0473d', 'mixed', 'active', 'active', 'High', ['a', 'b', 'c'], ['Area guides', 'Listing walkthroughs', 'Seller advice'],
      '@Morne_Koen_Developments: 18 subscribers, 3 videos; 1 upload in 12 months. Shelley Conyers: 15+.', '4 long-form videos a month on one channel'),
    P('instagram', 'Instagram', 3.0e9, 'monthly users', '#d0458f', 'content', 'unknown', 'active', 'High', ['a', 'b', 'c'], ['Listing reels', 'Area shorts'],
      'No confirmed account. Peers: 412, 936 and 1,599 followers.', 'Professional account; 16 shorts a month'),
    P('linkedin', 'LinkedIn', 3.1e8, 'monthly users (est.)', '#2f6fb0', 'content', 'active', 'active', 'Medium', [], ['Market reports', 'Investor notes'],
      '1,559 followers; about one post a month, 0 to 4 reactions.', 'Weekly post from each long-form video'),
    P('google', 'Google Search', None, 'Name and area searches', '#4f7de0', 'search', 'active', 'active', 'High', [], ['estate agent port alfred', 'sell my house gqeberha', 'moving to port alfred'],
      'Name search: 8 of 9 results about him. Area and selling searches: portals and agency offices only.', 'Website with area pages, valuation page and articles'),
    P('chatgpt', 'AI assistants', 9.0e8, 'ChatGPT weekly users alone', '#2f8a6d', 'search', 'unknown', 'unknown', 'High', [], ['Who is a good estate agent in Port Alfred?'],
      'Not checked in this manual audit.', 'Question shorts and website answers'),
]
qs = ['Who is a good estate agent in Port Alfred?', 'What is my house worth in Gqeberha?', 'Is Port Alfred a good place to retire?', 'How do I sell my house quickly in Gqeberha?']
stops = [
    {'key': 'overview', 'label': 'Overview', 't': f'Morne Koen scores {OV} on the areas checked, against three Gqeberha agents who market under their own names.',
     'b': 'Gold is Morne. The areas checked are portal listings, Facebook audience, name search, YouTube, a website and Instagram. A score of 100 means at or above the peer median. Click anything for details.',
     'tp': f'With his website, weekly video and an Instagram account live: {PL} on the same areas.', 'bp': 'Followers, reviews and sales are not projected; the monthly report measures them.'},
    {'key': 'graph', 'label': 'Audience', 't': 'The biggest Facebook following of the four, on a profile that mixes personal and property posts.',
     'b': 'Sphere size is audience size. A gold path means Morne is active there; dashed means absent or not checked.',
     'tp': 'After the plan: Morne on camera every week on Facebook, YouTube, Instagram and LinkedIn, all pointing to his website.', 'bp': 'One recording feeds a month of videos and shorts.'},
    {'key': 'kw', 'label': 'Searches', 't': 'His name search is his. Area and selling searches show portals and agency offices, not agents.',
     'b': 'Each tower is a search. Its color is whichever of the four appears; grey means none of them.',
     'tp': 'The plan targets Port Alfred, Gqeberha selling and valuation searches first.', 'bp': 'Gold caps are the searches the plan targets.'},
    {'key': 'store', 'label': 'Uploads', 't': 'One YouTube upload in the last 12 months, so one window is lit.',
     'b': 'The 12 lit windows are the last 12 months; a lit window means a YouTube upload that month.',
     'tp': 'Weekly videos light every window from here on.', 'bp': 'Area guides, walkthroughs, seller advice and market reports.'},
    {'key': 'reviews', 'label': 'Proof', 't': '6 listings marked sold on his Mandated profile. No Google reviews or sold stories found.',
     'b': 'Reviews were not checked for the peers, so no crowds are shown.',
     'tp': 'Each sale becomes a short sold story, and every client is asked for a Google review.', 'bp': "With the client's permission."},
    {'key': 'video', 'label': 'Video', 't': '3 listing videos on his channel, 8 to 80 views each.',
     'b': 'Shelley Conyers posted 15+ videos in the last 12 months; Kirsty du Toit 2; Kobie Potgieter none since 2022.',
     'tp': 'Morne presents his own area guides and listings every week.', 'bp': 'Edited by OneUpAI from his recordings.'},
    {'key': 'comp', 'label': 'Peers', 't': 'No agent owns the area searches yet.',
     'b': "The people walking in are each agent's share of presence among the four, based on the areas checked.",
     'tp': 'With the plan, attention shifts to Morne.', 'bp': 'An illustration based on the areas checked; inquiries are measured monthly.'},
    {'key': 'plan', 'label': '180-day plan', 't': 'The 180-day plan', 'b': '', 'tp': 'The 180-day plan', 'bp': '',
     'list': ['Website in his name with a valuation page', 'One phone and a working WhatsApp everywhere; old profiles fixed',
              'Facebook business page; professional Instagram', 'Calibration clip, then one recording a month',
              '4 long-form videos and 16 shorts a month', 'Holiday-season open houses on the Sunshine Coast',
              'Monthly market report in English and Afrikaans', 'Sold stories, Google reviews and referral partners']},
]
D = {'version': 1, 'planDays': 180, 'scene': 'city', 'sample': False, 'generatedAt': '2026-10-20T17:00:00.000Z',
     'client': {'name': 'Morne Koen', 'industry': 'Residential property', 'market': 'Gqeberha & Sunshine Coast, Eastern Cape', 'initials': 'MK', 'logo': LOGO},
     'categories': [{'key': k, 'label': l, 'weight': W[k], 'checked': c} for k, l, c in CATS],
     'brands': brands, 'keywords': kws,
     'ai': {'questions': qs, 'headline': qs[0], 'rows': [], 'clientNamed': 0, 'total': 0, 'projectedNamed': None},
     'map': {'n': 5, 'keyword': 'estate agent port alfred', 'home': [2, 2], 'grid': [[None] * 5 for _ in range(5)], 'planGrid': [[None] * 5 for _ in range(5)], 'labels': [], 'checked': False},
     'platforms': plats, 'stops': stops, 'details': {}, 'evidence': {},
     'labels': {'planOn': '180-day plan: on', 'planOff': 'Show the 180-day plan', 'scoreToday': 'Score on the areas checked', 'scorePlan': "With the plan's website, video and profiles live", 'scoreRow': 'Score on the areas checked'},
     'chip': f'Baseline audit · public data, {DATE}'}
tpl = (REPO / 'renderer' / 'template.html').read_text()
js = (REPO / 'public' / 'report' / 'app.js').read_text().replace('</script', '<\\/script')
e = html.escape
out = (tpl.replace('{{TITLE}}', e('Morne Koen · Presence audit')).replace('{{CLIENT}}', e('Morne Koen')).replace('{{MARKET}}', e(D['client']['market'])).replace('{{CHIP}}', e(D['chip']))
       .replace('<script src="/report/app.js?v={{VERSION}}" defer></script>', '<script>' + js + '</script>').replace('{{DATA}}', json.dumps(D).replace('<', '\\u003c')))
assert '{{' not in out
open(OUT + 'morne-koen-presence-audit-3d.html', 'w').write(out)
print('Morne', OV, '->', PL, '| peers', [b['overall'] for b in brands[1:]])
