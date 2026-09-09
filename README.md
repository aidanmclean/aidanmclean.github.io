# aidanmclean.github.io

Personal portfolio / résumé site. Live at **https://aidanmclean.github.io**

The whole site is generated from one file: **[`data/resume.json`](data/resume.json)**.
There is no framework, no build dependency, and no `node_modules` — just Node's standard library.

---

## Updating the site when your résumé changes

### The 30-second version

1. Edit `data/resume.json`.
2. Run `node build.js`.
3. Commit and push. GitHub Pages picks it up in about a minute.

```bash
node build.js
git add -A && git commit -m "Update resume" && git push
```

### Editing on github.com (no laptop needed)

Open `data/resume.json` in the GitHub web editor, change it, commit to `main`.
The **Build site** workflow in `.github/workflows/build.yml` re-runs `build.js` and
commits the regenerated `index.html` for you. Nothing to install.

### Previewing locally

```bash
node dev.js       # http://localhost:8000
```

It serves the folder and rebuilds automatically whenever you save
`data/resume.json` or anything in `templates/` — edit, save, refresh.

### Swapping in a new résumé PDF

Replace `assets/files/Aidan-McLean-Resume.pdf`, keeping the same filename, and the
download button and command palette keep working. If you'd rather use a new
filename, update `basics.resumePdf` in `data/resume.json` to match.

---

## What lives where

| Path | What it is |
| --- | --- |
| `data/resume.json` | **All content.** The only file you normally touch. |
| `build.js` | Renders `index.html` from the JSON. Zero dependencies. |
| `templates/page.html` | The HTML shell — `<head>`, meta tags, script tags. |
| `assets/css/site.css` | All styling, including the print stylesheet. |
| `assets/js/site.js` | Theme, scroll-spy, tag filter, command palette. |
| `assets/files/*.pdf` | The downloadable résumé. |
| `index.html` | **Generated — do not hand-edit.** Committed so Pages can serve it directly. |
| `dev.js` | Local preview server with rebuild-on-save. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is instead of running Jekyll. |

## The JSON, section by section

- **`site`** — canonical URL, browser theme colour, the "Updated …" stamp in the footer.
- **`basics`** — name, one-line label, location, email, the hero paragraph (`lede`), the
  status pill, the PDF path, the "at a glance" rows (`spec`), and social profiles.
  `phone` is intentionally left blank; fill it in and a Phone row appears under Contact.
  `contactNote` is the sentence above the contact list.
- **`work`** — one object per role, newest first. `highlights` are the bullet points.
  `tech` drives the clickable tags. Use `dateNote` to override the rendered date range
  (that's how the split 2022 / 2024 role shows both stints on one line).
- **`projects`** — feature cards. Delete every entry and the whole section disappears
  from the page and the command palette; add entries and it comes back. `links` is a
  list of `{ "label": "...", "url": "..." }`.
- **`skills`** — groups shown in Toolkit. Every item is clickable.
- **`education`** — same shape as `work`, plus `coursework`.

### How the tag filter works

Every string in a `tech` array is slugified (`"Node.js"` → `node-js`) and becomes a
clickable tag. Clicking one dims every entry that isn't tagged with it. So a tag on a
Toolkit skill only lights something up if that exact string also appears in some role's
or project's `tech` list — **spelling has to match**. Tags with no matches say so
instead of dimming the page, so a typo degrades gracefully rather than looking broken.

## Things worth knowing

- **Keyboard**: `⌘K` / `Ctrl-K` or `/` opens the command palette, `T` toggles the
  theme, `Esc` closes the palette or clears the tag filter.
- **Theme** follows the OS by default and remembers a manual choice in `localStorage`.
- **Print / Save as PDF** of the page itself is styled — the nav, palette, and hero
  buttons drop out and it prints as a clean document.
- **No JavaScript?** The page is fully server-rendered HTML; JS only adds the
  interactions. It reads fine with JS off.
- The only network request is Google Fonts; everything else is local.

## GitHub Pages settings

Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
That's the default for a `<username>.github.io` repo, so it likely needs no change.
