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


# Homepage icons are the device's own system emoji — no icon files are
# loaded for them, so tiles and popups cost nothing to download and look
# native on every phone. One character per subtopic, plus one per topic
# for popup titles (Community has pills, so it uses the group character).
SYSTEM_EMOJI = {'Basics': '🩺', 'Food, Water & Air': '🍲', 'Exercise': '👟',
                'Body': '🫀', 'Check Up': '🏥', 'Mental Health': '🧠', 'Periods': '🩸',
                'Generating Wealth': '💰', 'Investing': '📈', 'Insurance & Tax': '🛡️',
                'Spending & Tracking': '🛒', 'Credit Cards & Loans': '💳',
                'Choosing Career': '🧭', 'Job Search': '🔍', 'Career Ladder': '🪜',
                'Resigning': '🚪', 'Kitchen': '🍳', 'Bedroom': '🛏️',
                'Living Room': '🛋️', 'Bathroom': '🛁', 'Garden': '🪴',
                'Self': '👤', 'Parents': '👥', 'Partner': '💕', 'Kids': '🧸',
                'Friends': '🤝', 'Relatives': '👪', 'Colleagues': '💼',
                'Roommate': '🔑', 'Enemies': '😡', 'Cats': '🐱', 'Dogs': '🐶',
                'Places': '🗺️', 'Stay': '🏠', 'Flight': '✈️',
                'Train': '🚆', 'Bus': '🚌', 'Cab': '🚕', 'Itinerary': '🗓️',
                'Things to Carry': '🧳', 'Holidays': '🎁', 'Men': '👔', 'Women': '👗',
                'Driving': '🚗', 'Swimming': '🌊', 'Hobbies': '🎨',
                'Problem Solving': '🧩', 'Reminders': '⏰️',
                'Buying Home': '🏡', 'Marriage': '💍', 'Pregnancy': '🍼',
                'Buying a Car': '🚘', 'Moving to A New City': '🚚',
                'Mobile': '📱', 'TV': '📺', 'Earphones': '🎧', 'Power Bank': '🔋',
                'Basic': '⚖️', 'News': '📰', 'Movies & Shows': '🎬',
                'Songs': '🎵', 'Books': '📚', 'Credits': '📜'}
TOPIC_EMOJI = {'Community': '👥', 'Health': '🩺', 'Wealth': '💰',
               'Career': '🧭', 'Home': '🍳', 'People': '👤', 'Pets': '🐱',
               'Travel': '🗺️', 'Fashion': '👔', 'Life Skills': '🚗',
               'Life Events': '🏡', 'Tech': '📱', 'Legal': '⚖️',
               'Content': '📰', 'About': '📜'}
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
                icon = SYSTEM_EMOJI.get(name, TOPIC_EMOJI[t['name']])
                if leaf is None:
                    print(f"WARNING: no leaf module for {t['slug']} / {name}; linking to topic page as Soon")
                    subs.append({'name': name, 'href': f"/{t['path']}/", 'soon': True, 'icon': icon})
                elif leaf.get('live'):
                    subs.append({'name': name, 'href': f"/{leaf['path']}/", 'icon': icon})
                else:
                    subs.append({'name': name, 'href': f"/{t['path']}/", 'soon': True, 'icon': icon})
        folders.append({'name': t['name'], 'slug': t['slug'], 'href': f"/{t['path']}/",
                        'icon': TOPIC_EMOJI[t['name']], 'isNew': bool(t['tile'].get('badge')), 'subs': subs})
    return folders


def folder_tiles_html(folders):
    out = []
    for f in folders:
        mini = ''.join('<span class="dot4"></span>' if s.get('pill')
                       else f'<span class="mini" aria-hidden="true">{esc(s["icon"])}</span>'
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
    main = open('home.html').read() \
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
    # Dead weight stays out of the precache: emoji.json and emoji-defs.svg
    # are build-time inputs only, folder-icons.svg is unused since the
    # Fluent emoji switch, and the emoji-color tiles are replaced by system
    # emoji. The files stay in the repo until deleted; none of them is
    # downloaded by visitors.
    files += [f for f in sorted(glob.glob('shared/**/*.*', recursive=True))
              if f not in ('shared/emoji.json', 'shared/folder-icons.svg', 'shared/emoji-defs.svg')
              and not f.startswith('shared/emoji-color/')]
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
