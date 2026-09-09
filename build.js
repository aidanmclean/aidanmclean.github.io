#!/usr/bin/env node
/**
 * build.js - renders index.html from data/resume.json + templates/page.html
 *
 * No dependencies. Run `node build.js` after editing data/resume.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'resume.json');
const TPL = path.join(ROOT, 'templates', 'page.html');
const OUT = path.join(ROOT, 'index.html');

/* ------------------------------------------------------------------ utils */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Stable id for a tech name, used to wire chips to the filter. */
const slug = (s) =>
  String(s).toLowerCase().replace(/\+/g, 'p').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const dateRange = (job) => job.dateNote || `${job.start} - ${job.end}`;

/* ----------------------------------------------------------------- pieces */

const ICONS = {
  github:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 5.3H.9V16h2.7V5.3ZM2.25 0a1.57 1.57 0 1 0 0 3.13 1.57 1.57 0 0 0 0-3.13ZM16 9.6c0-2.9-1.55-4.5-3.6-4.5-1.6 0-2.4.9-2.8 1.6V5.3H6.9c.04.75 0 10.7 0 10.7h2.7v-6a1.9 1.9 0 0 1 .1-.7c.2-.5.7-1.1 1.6-1.1 1.1 0 1.6.85 1.6 2.1V16H16V9.6Z"/></svg>',
  mail:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3h13c.28 0 .5.22.5.5v.36L8 8.6.5 3.86V3.5c0-.28.22-.5.5-.5Zm-1 2.55V12.5c0 .28.22.5.5.5h13a.5.5 0 0 0 .5-.5V5.55L8.27 9.92a.5.5 0 0 1-.54 0L.5 5.55Z"/></svg>',
  download:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1a.75.75 0 0 1 .75.75v6.9l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22v-6.9A.75.75 0 0 1 8 1ZM2 12.25a.75.75 0 0 1 .75.75v.5h10.5V13a.75.75 0 0 1 1.5 0v.75c0 .69-.56 1.25-1.25 1.25H2.5c-.69 0-1.25-.56-1.25-1.25V13a.75.75 0 0 1 .75-.75Z"/></svg>',
  arrow:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.22 11.78a.75.75 0 0 1 0-1.06l5.19-5.19H5.5a.75.75 0 0 1 0-1.5h5.75a.75.75 0 0 1 .75.75v5.75a.75.75 0 0 1-1.5 0V6.6l-5.22 5.19a.75.75 0 0 1-1.06 0Z"/></svg>',
};

const profileIcon = (network) => ICONS[network.toLowerCase()] || ICONS.arrow;

/** Section header: `01 / EXPERIENCE` with a rule. */
function sectionHead(num, title, note) {
  return `
      <header class="s-head">
        <span class="s-num">${esc(num)}</span>
        <h2>${esc(title)}</h2>
        <span class="s-rule"></span>
        ${note ? `<span class="s-note">${esc(note)}</span>` : ''}
      </header>`;
}

function chips(list, opts = {}) {
  if (!list || !list.length) return '';
  const cls = opts.small ? 'chips chips--sm' : 'chips';
  return `<ul class="${cls}">${list
    .map(
      (t) =>
        `<li><button type="button" class="chip" data-chip="${esc(slug(t))}" aria-pressed="false"><span>${esc(
          t
        )}</span></button></li>`
    )
    .join('')}</ul>`;
}

/* ---------------------------------------------------------------- sections */

function header(d) {
  const nav = [
    ['experience', 'Experience'],
    ['projects', 'Projects'],
    ['toolkit', 'Toolkit'],
    ['education', 'Education'],
    ['contact', 'Contact'],
  ];
  return `<header class="topbar" id="topbar">
  <div class="wrap topbar-in">
    <a class="mono monogram" href="#top" aria-label="Back to top">${esc(d.basics.initials)}<span class="caret"></span></a>
    <nav class="nav" aria-label="Sections">
      ${nav.map(([id, label]) => `<a href="#${id}" data-nav="${id}">${esc(label)}</a>`).join('\n      ')}
    </nav>
    <div class="topbar-actions">
      <button type="button" class="btn btn--ghost btn--cmd" id="cmd-open" aria-haspopup="dialog">
        <span class="mono">Search</span><kbd class="mono">⌘K</kbd>
      </button>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle colour theme" title="Toggle theme (T)">
        <svg class="ico-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.25"/><path d="M8 .8v2M8 13.2v2M.8 8h2M13.2 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" stroke-width="1.5" stroke-linecap="round"/></svg>
        <svg class="ico-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.7A5.8 5.8 0 0 1 6.3 2.5a5.8 5.8 0 1 0 7.2 7.2Z"/></svg>
      </button>
    </div>
  </div>
</header>`;
}

function hero(d) {
  const b = d.basics;
  const links = [
    `<a class="btn btn--primary" href="${esc(b.resumePdf)}" download>${ICONS.download}<span>Résumé (PDF)</span></a>`,
    `<button type="button" class="btn" data-copy="${esc(b.email)}">${ICONS.mail}<span class="copy-label">${esc(
      b.email
    )}</span></button>`,
    ...b.profiles.map(
      (p) =>
        `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${profileIcon(p.network)}<span>${esc(
          p.network
        )}</span></a>`
    ),
  ].join('\n        ');

  return `  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div class="hero-main">
        <p class="status mono reveal"><span class="dot" aria-hidden="true"></span>${esc(b.status)}</p>
        <h1 class="reveal">${esc(b.name)}</h1>
        <p class="hero-label mono reveal">${esc(b.label)} <span class="sep">/</span> ${esc(b.location)}</p>
        <p class="lede reveal">${esc(b.lede)}</p>
        <div class="hero-links reveal">
        ${links}
        </div>
      </div>
      <aside class="hero-side reveal">
        ${
          b.photo
            ? `<figure class="portrait">
          <img src="${esc(b.photo)}" alt="${esc(b.photoAlt || b.name)}" width="1098" height="1373"
               decoding="async" fetchpriority="high">
        </figure>`
            : ''
        }
        <div class="spec" aria-label="At a glance">
          <div class="spec-bar mono"><span>at a glance</span><span class="spec-dots" aria-hidden="true"></span></div>
          <dl class="spec-list mono">
            ${b.spec
              .map((r) => `<div class="spec-row"><dt>${esc(r.key)}</dt><dd>${esc(r.value)}</dd></div>`)
              .join('\n            ')}
          </dl>
        </div>
      </aside>
    </div>
  </section>`;
}

function experience(d) {
  const items = d.work
    .map((job) => {
      const techAttr = (job.tech || []).map(slug).join(' ');
      return `      <article class="job filterable" data-tech="${esc(techAttr)}">
        <div class="job-when mono"><span class="tick" aria-hidden="true"></span>${esc(dateRange(job))}</div>
        <div class="job-body">
          <h3 class="job-role">${esc(job.position)}</h3>
          <p class="job-org mono">${esc(job.company)} <span class="sep">·</span> ${esc(job.location)}</p>
          ${chips(job.tech, { small: true })}
          <ul class="bullets">
            ${job.highlights.map((h) => `<li>${esc(h)}</li>`).join('\n            ')}
          </ul>
        </div>
      </article>`;
    })
    .join('\n');

  return `  <section class="section" id="experience" data-section="Experience">
    <div class="wrap">
${sectionHead('01', 'Experience', 'tap a tag to filter')}
      <div class="jobs">
${items}
      </div>
    </div>
  </section>`;
}

function projects(d) {
  if (!d.projects || !d.projects.length) return '';
  const items = d.projects
    .map((p) => {
      const techAttr = (p.tech || []).map(slug).join(' ');
      const links = (p.links || [])
        .map(
          (l) =>
            `<a class="plink mono" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${ICONS.arrow}</a>`
        )
        .join('');
      // Source order is head -> prose -> tags; on wide screens the tags are
      // placed into a left rail by grid, so the reading order stays sensible.
      return `      <article class="project filterable" data-tech="${esc(techAttr)}">
        <div class="project-head">
          <h3>${esc(p.name)}</h3>
          <p class="mono project-meta">${[p.role, p.org, p.year].filter(Boolean).map(esc).join(' <span class="sep">·</span> ')}</p>
        </div>
        <div class="project-main">
          <p class="project-summary">${esc(p.summary)}</p>
          ${p.detail ? `<p class="project-detail">${esc(p.detail)}</p>` : ''}
          ${
            p.highlights && p.highlights.length
              ? `<ul class="bullets project-bullets">
            ${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('\n            ')}
          </ul>`
              : ''
          }
          ${links ? `<div class="plinks">${links}</div>` : ''}
        </div>
        <div class="project-side">
          <p class="mono micro-label">Built with</p>
          ${chips(p.tech, { small: true })}
        </div>
      </article>`;
    })
    .join('\n');

  return `  <section class="section" id="projects" data-section="Projects">
    <div class="wrap">
${sectionHead('02', 'Projects')}
      <div class="projects">
${items}
      </div>
    </div>
  </section>`;
}

function toolkit(d) {
  const groups = d.skills
    .map(
      (g) => `      <div class="skill-group">
        <h3 class="mono">${esc(g.group)}</h3>
        ${chips(g.items)}
      </div>`
    )
    .join('\n');

  return `  <section class="section" id="toolkit" data-section="Toolkit">
    <div class="wrap">
${sectionHead('03', 'Toolkit', 'tap to see where I used it')}
      <div class="skills">
${groups}
      </div>
    </div>
  </section>`;
}

function education(d) {
  const items = d.education
    .map(
      (e) => `      <article class="edu">
        <div class="job-when mono"><span class="tick" aria-hidden="true"></span>${esc(e.start)} - ${esc(e.end)}</div>
        <div class="job-body">
          <h3 class="job-role">${esc(e.institution)}</h3>
          <p class="job-org mono">${esc(e.studyType)} <span class="sep">·</span> ${esc(e.location)}</p>
          ${
            e.coursework && e.coursework.length
              ? `<p class="mono micro-label">Relevant coursework</p>
          <ul class="course-grid">${e.coursework.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
              : ''
          }
        </div>
      </article>`
    )
    .join('\n');

  return `  <section class="section" id="education" data-section="Education">
    <div class="wrap">
${sectionHead('04', 'Education')}
      <div class="jobs">
${items}
      </div>
    </div>
  </section>`;
}

function contact(d) {
  const b = d.basics;
  const rows = [
    { label: 'Email', value: b.email, href: `mailto:${b.email}`, copy: b.email },
    ...(b.phone ? [{ label: 'Phone', value: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, '')}`, copy: b.phone }] : []),
    ...b.profiles.map((p) => ({ label: p.network, value: p.handle, href: p.url })),
    { label: 'Résumé', value: 'Download PDF', href: b.resumePdf },
  ];

  return `  <section class="section section--contact" id="contact" data-section="Contact">
    <div class="wrap">
${sectionHead('05', 'Contact')}
      <div class="contact-grid">
        <p class="contact-lede">${esc(b.contactNote)}</p>
        <ul class="contact-list">
          ${rows
            .map(
              (r) => `<li>
            <span class="mono contact-key">${esc(r.label)}</span>
            <a href="${esc(r.href)}"${
                /^https?:/.test(r.href) ? ' target="_blank" rel="noopener"' : ''
              }>${esc(r.value)}</a>
            ${r.copy ? `<button type="button" class="mini-copy mono" data-copy="${esc(r.copy)}">copy</button>` : ''}
          </li>`
            )
            .join('\n          ')}
        </ul>
      </div>
    </div>
  </section>`;
}

function footer(d) {
  return `<footer class="footer">
  <div class="wrap footer-in mono">
    <span>© ${new Date().getFullYear()} ${esc(d.basics.name)}</span>
    <span class="footer-mid">Built from a JSON file · <a href="${esc(
      d.site.repo
    )}" target="_blank" rel="noopener">source</a></span>
    <span>Updated ${esc(d.site.lastUpdated)}</span>
  </div>
</footer>`;
}

function palette(d) {
  const b = d.basics;
  const cmds = [
    { id: 'go-top', label: 'Go to top', kind: 'Navigate', act: 'scroll', arg: '#top' },
    { id: 'go-exp', label: 'Experience', kind: 'Navigate', act: 'scroll', arg: '#experience' },
    ...(d.projects && d.projects.length
      ? [{ id: 'go-proj', label: 'Projects', kind: 'Navigate', act: 'scroll', arg: '#projects' }]
      : []),
    { id: 'go-skill', label: 'Toolkit', kind: 'Navigate', act: 'scroll', arg: '#toolkit' },
    { id: 'go-edu', label: 'Education', kind: 'Navigate', act: 'scroll', arg: '#education' },
    { id: 'go-contact', label: 'Contact', kind: 'Navigate', act: 'scroll', arg: '#contact' },
    { id: 'dl', label: 'Download résumé (PDF)', kind: 'Action', act: 'open', arg: b.resumePdf },
    { id: 'mail', label: `Email: ${b.email}`, kind: 'Action', act: 'copy', arg: b.email },
    ...b.profiles.map((p) => ({
      id: 'p-' + slug(p.network),
      label: `${p.network}: ${p.handle}`,
      kind: 'Link',
      act: 'open',
      arg: p.url,
    })),
    { id: 'theme', label: 'Toggle colour theme', kind: 'Action', act: 'theme', arg: '', key: 'T' },
    { id: 'print', label: 'Print this page', kind: 'Action', act: 'print', arg: '' },
    { id: 'clear', label: 'Clear tag filter', kind: 'Action', act: 'clearfilter', arg: '' },
  ];

  return `<div class="cmd" id="cmd" hidden>
  <div class="cmd-scrim" data-cmd-close></div>
  <div class="cmd-box" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="cmd-input-row">
      <span class="mono cmd-prompt" aria-hidden="true">&gt;</span>
      <input type="text" id="cmd-input" class="cmd-input" placeholder="Jump to a section, copy an address, open a link…" autocomplete="off" spellcheck="false" aria-controls="cmd-list">
      <kbd class="mono">esc</kbd>
    </div>
    <ul class="cmd-list" id="cmd-list" role="listbox"></ul>
    <div class="cmd-foot mono">
      <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
      <span><kbd>↵</kbd> run</span>
      <span><kbd>T</kbd> theme</span>
    </div>
  </div>
  <script type="application/json" id="cmd-data">${JSON.stringify(cmds)}</script>
</div>`;
}

/* ------------------------------------------------------------------ render */

function jsonLd(d) {
  const b = d.basics;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: b.name,
    jobTitle: b.label,
    email: `mailto:${b.email}`,
    url: d.site.url,
    ...(b.photo ? { image: `${d.site.url.replace(/\/$/, '')}/${b.photo}` } : {}),
    address: { '@type': 'PostalAddress', addressLocality: b.location },
    sameAs: b.profiles.map((p) => p.url),
    alumniOf: d.education.map((e) => ({ '@type': 'CollegeOrUniversity', name: e.institution })),
    knowsAbout: d.skills.flatMap((g) => g.items),
  });
}

function main() {
  const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const tpl = fs.readFileSync(TPL, 'utf8');

  const description = `${d.basics.name}, ${d.basics.label} in ${d.basics.location}. ${d.basics.lede}`
    .replace(/\s+/g, ' ')
    .slice(0, 300);

  const favicon = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#9c5f2b"/><text x="16" y="22" font-family="monospace" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${d.basics.initials}</text></svg>`
  );

  const ogImage = d.basics.photo
    ? `<meta property="og:image" content="${esc(d.site.url.replace(/\/$/, ''))}/${esc(d.basics.photo)}">`
    : '';

  const content = [hero(d), experience(d), projects(d), toolkit(d), education(d), contact(d)]
    .filter(Boolean)
    .join('\n\n');

  const html = tpl
    .replace(/{{NAME}}/g, esc(d.basics.name))
    .replace(/{{LABEL}}/g, esc(d.basics.label))
    .replace(/{{DESCRIPTION}}/g, esc(description))
    .replace(/{{THEME_COLOR}}/g, esc(d.site.themeColor))
    .replace(/{{SITE_URL}}/g, esc(d.site.url))
    .replace(/{{FAVICON}}/g, favicon)
    .replace('{{OG_IMAGE}}', ogImage)
    .replace('{{JSONLD}}', jsonLd(d))
    .replace('{{HEADER}}', header(d))
    .replace('{{CONTENT}}', content)
    .replace('{{FOOTER}}', footer(d))
    .replace('{{PALETTE}}', palette(d));

  fs.writeFileSync(OUT, html);
  console.log(
    `built index.html: ${d.work.length} roles, ${(d.projects || []).length} projects, ` +
      `${d.skills.reduce((n, g) => n + g.items.length, 0)} skills, ${(html.length / 1024).toFixed(1)} kB`
  );
}

main();
