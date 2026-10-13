# School of Adults

A little school for the things life forgot to teach us. Live at https://schoolofadults.com (GitHub Pages, `main`).

Plain HTML, CSS and JavaScript. No framework, no `?` routes: every page is a real URL (`/community/`, later `/health/basics/`).

## Layout
- `site.json` - site name, URL, home title/description, default share image.
- `home.html` - home page body. The tiles are generated from the tile modules.
- `<tile>/module.json` + `content.html` - one folder per tile, nested folders for pages inside it.
- `shared/` - `site.css`, `lib.js` (sound + hand-drawn marks), `page.js` (behaviour on every page), `home.js`, `header.html`, `footer.html`, fonts, emoji, default share image.
- `build.py` - builds all pages, `sitemap.xml`, `robots.txt`, `llms.txt` and the offline file list in `sw.js`.
- `sw.js` - network-first service worker with an offline fallback.

## module.json
`name`, `slug`, `type` (`tile` or `leaf`), `parent`, `title`, `description`, `updated`, `image`, `live`, `items`.
Tile modules also have `order` and `tile` (emoji, colour, motion, toast message). `live: false` means no page, no sitemap entry and a greyed tile. Set `live: true` and run the build to open a topic. Pages that need their own script carry `needs_script: true`.

## Build
    python3 build.py

Commit the changes together in one commit. Check locally with `python3 -m http.server`.

## Credits
Rough Notation, Cuelume (MIT, see `THIRD-PARTY-NOTICES.txt`), Kalam and DM Sans (SIL Open Font License), Twemoji art (CC-BY 4.0).
