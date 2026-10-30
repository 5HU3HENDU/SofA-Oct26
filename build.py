#!/usr/bin/env python3
"""Build the site from module folders. Usage: python3 build.py

Inputs : site.json, home.html, shared/header.html, shared/footer.html,
         <module>/module.json + <module>/content.html (any depth)
Outputs: index.html, <module>/index.html (live modules only), sitemap.xml, robots.txt,
         llms.txt, and the precache list + cache name inside sw.js.
A module with "live": false gets no page and no sitemap entry.
"""
import glob, hashlib, html, json, os, re
from datetime import date

os.chdir(os.path.dirname(os.path.abspath(__file__)))
site = json.load(open('site.json'))
base = site['url']
header = open('shared/header.html').read().strip()
footer = open('shared/footer.html').read().strip()
esc = lambda s: html.escape(s, quote=True)
nice_date = lambda iso: date.fromisoformat(iso).strftime('%-d %B %Y')


def load_modules():
    modules = []
    for path in sorted(glob.glob('**/module.json', recursive=True)):
        m = json.load(open(path))
        m['dir'] = os.path.dirname(path)
        m['path'] = m['dir'].replace(os.sep, '/')
        m['url'] = f"{base}/{m['path']}/"
        modules.append(m)
    return modules


def head(title, description, url, image, ld, extra_styles=()):
    extra_links = ''.join('<link rel="stylesheet" href="' + s + '">' for s in extra_styles)
    return f'''<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#faf7ef">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{esc(site['name'])}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{base + image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{base + image}">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/shared/site.css"><link rel="stylesheet" href="/shared/annotations.css">{extra_links}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>'''


def page(head_html, main_html, scripts):
    return f'''<!doctype html>
<html lang="en">
{head_html}
<body>
<a class="skip" href="#main">Skip to content</a>
{header}
{main_html}
{footer}
{scripts}
</body></html>
'''


def breadcrumbs(m, modules):
    crumbs = [("Home", base + "/")]
    parent = next((x for x in modules if x['path'] == m.get('parent')), None)
    if parent:
        crumbs.append((parent['name'], parent['url']))
    crumbs.append((m['name'], m['url']))
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]}


def module_page(m, modules):
    page_ld = {"@type": m.get('schema_type') or ("WebPage" if m.get('type') == 'leaf' else "CollectionPage"),
               "@id": m['url'] + "#page", "url": m['url'], "name": m['name'], "description": m['description'],
               "dateModified": m['updated'], "inLanguage": "en", "isPartOf": {"@id": base + "/#site"}}
    if m.get('items'):
        page_ld["mainEntity"] = {"@type": "ItemList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": m.get('item_prefix', '') + n} for i, n in enumerate(m['items'])]}
    ld = {"@context": "https://schema.org", "@graph": [
        page_ld, {"@type": "WebSite", "@id": base + "/#site", "url": base + "/", "name": site['name']}, breadcrumbs(m, modules)]}
    content = open(os.path.join(m['dir'], 'content.html')).read().replace('<main ', '<main id="main" ', 1)
    main = content.replace('</main>', f'<p class="last-updated">Last updated {nice_date(m["updated"])}</p></main>')
    scripts = '<script src="/shared/lib.js"></script><script src="/shared/page.js"></script><script src="/shared/tracker.js"></script>'
    return page(head(m['title'], m['description'], m['url'], m['image'], ld), main, scripts)


def tile_html(m):
    t = m['tile']
    live = m.get('live')
    if t.get('scene'):
        scene = open(os.path.join(m['dir'], t['scene'])).read().strip()
    else:
        scene = ''.join(f'<span class="actor" style="--delay:{i * 2 - 10}s"><img src="/shared/emoji/{code}.svg" alt="" aria-hidden="true"></span>'
                        for i, code in enumerate(t['emoji']))
    scene = f'<div class="scene" aria-hidden="true">{scene}<span class="spark">✧</span></div>'
    stamp = '' if live else '<span class="stamp">Under construction</span>'
    bottom = f'<div class="topic-bottom">{stamp}<span class="tile-arrow" aria-hidden="true">↗</span></div>'
    badge = f'<span class="new-badge">{t["badge"]}</span>' if t.get('badge') else ''
    classes = 'topic' + (' topic-community' if m['slug'] == 'community' else '') + ('' if live else ' topic-locked')
    attrs = f'class="{classes}" data-motion="{t["motion"]}" style="--tile:{t["color"]}"'
    inner = f'<h3>{esc(m["name"])}</h3><p class="desc">{esc(t["description"])}</p>{scene}{bottom}{badge}'
    if live:
        return f'<a {attrs} href="/{m["path"]}/" aria-label="{esc(m["name"])}. Open topic" data-cuelume-navigate>{inner}</a>'
    return f'<button {attrs} data-toast="{esc(t["toast"])}" aria-label="{esc(m["name"])}. Under construction">{inner}</button>'


TOPIC_ICONS = {'Community': 'o-chat', 'Health': 'o-bottle', 'Wealth': 'o-wallet', 'Career': 'o-badge',
               'Home': 'o-key', 'People': 'o-cups', 'Pets': 'o-paw', 'Travel': 'o-case', 'Fashion': 'o-tee',
               'Life Skills': 'o-toolbox', 'Life Events': 'o-gift', 'Tech': 'o-chip', 'Legal': 'o-doc',
               'Content': 'o-book'}
FOLDER_ICONS = {'Generating Wealth': 'o-chart', 'Investing': 'o-coin', 'Insurance & Tax': 'o-bill',
                'Spending & Tracking': 'o-cal', 'Credit Cards & Loans': 'o-card',
                'Choosing Career': 'o-compass', 'Job Search': 'o-mag', 'Career Ladder': 'o-ladder',
                'Resigning': 'o-door', 'Basic': 'o-shield',
                'Kitchen': 'o-pan', 'Bedroom': 'o-bed', 'Living Room': 'o-sofa', 'Bathroom': 'o-bath',
                'Garden': 'o-plant', 'Basics': 'o-apple', 'Food, Water & Air': 'o-mug',
                'Exercise': 'o-dumb', 'Body': 'o-person', 'Check Up': 'o-heart', 'Mental Health': 'o-bulb',
                'Periods': 'o-drop', 'Cats': 'o-cat', 'Dogs': 'o-dog',
                'Self': 'o-star', 'Parents': 'o-heart', 'Partner': 'o-ring', 'Kids': 'o-ball',
                'Friends': 'o-users', 'Relatives': 'o-house', 'Colleagues': 'o-mug',
                'Roommate': 'o-person', 'Enemies': 'o-no',
                'Places': 'o-compass', 'Stay': 'o-house', 'Flight': 'o-flight', 'Train': 'o-train',
                'Bus': 'o-truck', 'Cab': 'o-car', 'Itinerary': 'o-doc', 'Things to Carry': 'o-case',
                'Holidays': 'o-star', 'Men': 'o-tie', 'Women': 'o-dress',
                'Driving': 'o-wheel', 'Swimming': 'o-waves', 'Hobbies': 'o-star',
                'Problem Solving': 'o-bulb', 'Reminders': 'o-cal',
                'Buying Home': 'o-house', 'Marriage': 'o-ring', 'Pregnancy': 'o-heart',
                'Buying a Car': 'o-car', 'Moving to A New City': 'o-truck',
                'Mobile': 'o-phone', 'TV': 'o-tv', 'Earphones': 'o-ears', 'Power Bank': 'o-batt',
                'News': 'o-news', 'Movies & Shows': 'o-tv', 'Songs': 'o-note', 'Books': 'o-bookmark'}


def community_invites(topic):
    """WhatsApp invite links for the Community folder, in module-item order.

    The links live only in community/content.html, so they are read from there —
    never guessed. A count mismatch fails the build rather than shipping a
    wrong invite on a group."""
    content = open(os.path.join(topic['dir'], 'content.html')).read()
    hrefs = [html.unescape(h) for h in re.findall(r'<a class="subtopic" href="([^"]+)"', content)]
    items = topic.get('items') or []
    if len(hrefs) != len(items):
        raise ValueError(f"community invites ({len(hrefs)}) != items ({len(items)}); refusing to guess")
    return [{'name': n, 'href': h, 'pill': True, 'blank': True} for n, h in zip(items, hrefs)]


def folder_data(modules):
    """One folder per live topic: subtopics in module-item order.

    Live leaf modules link to their page; not-live leaves (Health's Body and
    Food, Water & Air; Wealth's Insurance & Tax, Spending & Tracking,
    Credit Cards & Loans) have no page, so they link to the topic page and
    carry soon=True for the "Soon" tag."""
    leaves = {}
    for m in modules:
        if m.get('parent'):
            leaves[(m['parent'], m['name'])] = m
    tiles = sorted((m for m in modules if m.get('tile') and m.get('live')), key=lambda m: m['order'])
    folders = []
    for t in tiles:
        if t['slug'] == 'community':
            subs = community_invites(t)
        else:
            subs = []
            for name in t.get('items') or []:
                leaf = leaves.get((t['slug'], name))
                icon = FOLDER_ICONS.get(name, TOPIC_ICONS[t['name']])
                if leaf is None:
                    print(f"WARNING: no leaf module for {t['slug']} / {name}; linking to topic page as Soon")
                    subs.append({'name': name, 'href': f"/{t['path']}/", 'soon': True, 'icon': icon})
                elif leaf.get('live'):
                    subs.append({'name': name, 'href': f"/{leaf['path']}/", 'icon': icon})
                else:
                    subs.append({'name': name, 'href': f"/{t['path']}/", 'soon': True, 'icon': icon})
        folders.append({'name': t['name'], 'slug': t['slug'], 'href': f"/{t['path']}/",
                        'icon': TOPIC_ICONS[t['name']], 'isNew': bool(t['tile'].get('badge')), 'subs': subs})
    return folders


def folder_tiles_html(folders):
    out = []
    for f in folders:
        mini = ''.join('<span class="dot4"></span>' if s.get('pill')
                       else f'<svg aria-hidden="true"><use href="#{s["icon"]}"/></svg>'
                       for s in f['subs'][:4])
        new = '<span class="fbadge">NEW</span>' if f['isNew'] else ''
        out.append(f'<button class="folder" type="button" data-topic="{f["slug"]}" '
                   f'aria-label="{esc(f["name"])}. Open folder"><div class="ftile">{mini}</div>'
                   f'{new}'
                   f'<div class="fname">{esc(f["name"])}</div></button>')
    return '\n'.join(out)


def home_page(modules):
    tiles = sorted((m for m in modules if m.get('tile')), key=lambda m: m['order'])
    folders = folder_data(modules)
    main = open('home.html').read().replace('{{icons}}', open('shared/folder-icons.svg').read().strip()) \
                                  .replace('{{folders}}', folder_tiles_html(folders)) \
                                  .replace('{{folderData}}', json.dumps(folders, ensure_ascii=False)) \
                                  .replace('{{updated}}', nice_date(site['home_updated']))
    live = [m for m in tiles if m.get('live')]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": base + "/#site", "url": base + "/", "name": site['name'], "description": site['description'], "inLanguage": "en"},
        {"@type": "WebPage", "@id": base + "/#page", "url": base + "/", "name": site['title'], "description": site['description'],
         "dateModified": site['home_updated'], "isPartOf": {"@id": base + "/#site"},
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": m['name'], "url": m['url']} for i, m in enumerate(live)]}}]}
    scripts = '<script src="/shared/lib.js"></script><script src="/shared/page.js"></script><script src="/shared/tracker.js"></script><script src="/shared/home.js"></script><script src="/shared/folders.js"></script>'
    return page(head(site['title'], site['description'], base + '/', site['image'], ld, extra_styles=['/shared/folders.css']), main, scripts)


def write_service_worker(live):
    """Precache the shared files, root assets, emoji and live pages; name the cache after their content."""
    files = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']
    files += sorted(glob.glob('shared/**/*.*', recursive=True))
    files += [f"{m['path']}/" for m in live]
    digest = hashlib.sha1()
    for f in files:
        digest.update(open('index.html' if f == './' else os.path.join(f, 'index.html') if f.endswith('/') else f, 'rb').read())
    sw = open('sw.js').read()
    sw = re.sub(r"const CACHE='[^']*';", f"const CACHE='sofa-{digest.hexdigest()[:8]}';", sw)
    sw = re.sub(r"const FILES=\[[^\]]*\];", 'const FILES=' + json.dumps(files) + ';', sw)
    open('sw.js', 'w').write(sw)


modules = load_modules()
live = [m for m in modules if m.get('live')]
for m in modules:
    out = os.path.join(m['dir'], 'index.html')
    if m.get('live'):
        open(out, 'w').write(module_page(m, modules))
    elif os.path.exists(out):
        os.remove(out)  # greyed out = no page
open('index.html', 'w').write(home_page(modules))

urls = [(base + '/', site['home_updated'], 'weekly')] + [(m['url'], m['updated'], m.get('changefreq', 'monthly')) for m in live]
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'<url><loc>{u}</loc><lastmod>{d}</lastmod><changefreq>{c}</changefreq></url>\n' for u, d, c in urls) + '</urlset>\n')
open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n')
lines = [f"# {site['name']}", '', f"> {site['description']}", '', '## Pages', '', f"- [Home]({base}/): {site['description']}"]
lines += [f"- [{m['name']}]({m['url']}): {m['description']}" for m in live]
open('llms.txt', 'w').write('\n'.join(lines) + '\n')
write_service_worker(live)
print('live:', [m['path'] for m in live], '| hidden:', len(modules) - len(live))
