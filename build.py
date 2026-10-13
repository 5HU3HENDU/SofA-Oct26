#!/usr/bin/env python3
"""Assemble pages from module folders. Usage: python3 build.py
Reads  <module>/module.json + <module>/content.html + shared/header.html, footer.html
Writes <module>/index.html (live modules only), sitemap.xml, robots.txt, llms.txt
"""
import json, glob, os, html
from datetime import date
root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)
site = json.load(open('site.json'))
base = site['url']
hdr = open('shared/header.html').read()
ftr = open('shared/footer.html').read()
esc = lambda s: html.escape(s, quote=True)
modules = []
for p in sorted(glob.glob('*/module.json')):
    m = json.load(open(p)); m['dir'] = os.path.dirname(p); modules.append(m)
live = [m for m in modules if m.get('live')]
for m in modules:
    out = os.path.join(m['dir'], 'index.html')
    if not m.get('live'):
        if os.path.exists(out): os.remove(out)   # greyed out = no page
        continue
    url = f"{base}/{m['slug']}/"
    img = base + m['image']
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": m['name'],
         "description": m['description'], "dateModified": m['updated'], "inLanguage": "en",
         "isPartOf": {"@id": base + "/#site"},
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": "School of " + n} for i, n in enumerate(m.get('items', []))]}},
        {"@type": "WebSite", "@id": base + "/#site", "url": base + "/", "name": site['name']},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": base + "/"},
            {"@type": "ListItem", "position": 2, "name": m['name'], "item": url}]}]}
    d = date.fromisoformat(m['updated']).strftime('%-d %B %Y')
    page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#faf7ef">
<title>{esc(m['title'])}</title>
<meta name="description" content="{esc(m['description'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{esc(site['name'])}">
<meta property="og:title" content="{esc(m['title'])}"><meta property="og:description" content="{esc(m['description'])}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{img}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(m['title'])}"><meta name="twitter:description" content="{esc(m['description'])}"><meta name="twitter:image" content="{img}">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/shared/site.css"><link rel="stylesheet" href="/shared/annotations.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{hdr}
{open(os.path.join(m['dir'], 'content.html')).read().replace('<main ', '<main id="main" ', 1).replace('</main>', f'<p class="last-updated">Last updated {d}</p></main>')}
{ftr}
<script src="/shared/lib.js"></script><script src="/shared/leaf.js"></script>
<script>"serviceWorker"in navigator&&navigator.serviceWorker.register("/sw.js").catch(function(){{}})</script>
</body></html>
'''
    open(out, 'w').write(page)
urls = [(base + '/', site['home_updated'], 'weekly')] + [(f"{base}/{m['slug']}/", m['updated'], m.get('changefreq', 'monthly')) for m in live]
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'<url><loc>{u}</loc><lastmod>{l}</lastmod><changefreq>{c}</changefreq></url>\n' for u, l, c in urls) + '</urlset>\n')
open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n')
lines = [f"# {site['name']}", '', f"> {site['description']}", '', '## Pages', '', f"- [Home]({base}/): {site['description']}"]
lines += [f"- [{m['name']}]({base}/{m['slug']}/): {m['description']}" for m in live]
open('llms.txt', 'w').write('\n'.join(lines) + '\n')
print('built', [m['slug'] for m in live], 'skipped', [m['slug'] for m in modules if not m.get('live')])
