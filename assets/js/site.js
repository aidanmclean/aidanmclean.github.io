/* ============================================================================
   site.js - theme, scroll-spy, tag filtering, command palette, shortcuts.
   No dependencies. Everything degrades to a readable static page without it.
   ========================================================================== */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollOpts = { behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' };

  /* ------------------------------------------------------------------ toast */

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ------------------------------------------------------------------ theme */

  const root = document.documentElement;

  function setTheme(t, announce) {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    // Read the palette back out of CSS so this never drifts from site.css.
    const meta = $('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (bg) meta.content = bg;
    }
    if (announce) toast(t === 'light' ? 'Light theme' : 'Dark theme');
  }

  function toggleTheme() {
    setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
  }

  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => toggleTheme());

  /* ------------------------------------------------------- scroll: progress */

  const bar = $('.progress i');
  const topbar = $('#topbar');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav a[data-nav]');

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');
      if (topbar) topbar.classList.toggle('stuck', y > 12);

      // scroll-spy: the last section whose top has passed under the header
      const line = y + (topbar ? topbar.offsetHeight : 0) + 120;
      let current = '';
      for (const s of sections) if (s.offsetTop <= line) current = s.id;
      for (const a of navLinks) {
        if (a.dataset.nav === current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------ scroll: reveal in */

  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          obs.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    reveals.forEach((el, i) => {
      el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      io.observe(el);
    });
  }

  /* -------------------------------------------------------------- tag filter */

  const filterables = $$('.filterable');
  const allChips = $$('.chip');
  let activeTag = null;

  const filterbar = document.createElement('div');
  filterbar.className = 'filterbar';
  filterbar.innerHTML =
    '<span>filter <b class="f-tag"></b> <span class="count"></span></span>' +
    '<button type="button">clear</button>';
  document.body.appendChild(filterbar);
  filterbar.querySelector('button').addEventListener('click', () => applyFilter(null));

  function labelFor(tag) {
    const chip = document.querySelector('.chip[data-chip="' + CSS.escape(tag) + '"] span');
    return chip ? chip.textContent : tag;
  }

  function applyFilter(tag) {
    activeTag = tag;
    for (const c of allChips) {
      c.setAttribute('aria-pressed', String(!!tag && c.dataset.chip === tag));
    }

    if (!tag) {
      document.body.classList.remove('is-filtering');
      filterables.forEach((el) => el.classList.remove('match'));
      filterbar.classList.remove('show');
      return 0;
    }

    let hits = 0;
    for (const el of filterables) {
      const on = (' ' + el.dataset.tech + ' ').indexOf(' ' + tag + ' ') !== -1;
      el.classList.toggle('match', on);
      if (on) hits++;
    }

    // Nothing is tagged with it - say so rather than dimming the whole page.
    document.body.classList.toggle('is-filtering', hits > 0);
    filterbar.querySelector('.f-tag').textContent = labelFor(tag);
    filterbar.querySelector('.count').textContent = hits
      ? '- ' + hits + (hits === 1 ? ' entry' : ' entries')
      : '- not tagged on any entry';
    filterbar.classList.add('show');
    return hits;
  }

  for (const chip of allChips) {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.chip;
      if (activeTag === tag) {
        applyFilter(null);
        return;
      }
      const hits = applyFilter(tag);
      // Clicking from the Toolkit list should take you to the matching entries.
      if (hits && chip.closest('#toolkit')) {
        const first = document.querySelector('.filterable.match');
        if (first) first.scrollIntoView({ behavior: scrollOpts.behavior, block: 'center' });
      }
    });
  }

  /* -------------------------------------------------------------------- copy */

  async function copy(text) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
    }
    toast(ok ? 'Copied ' + text : text);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (btn) copy(btn.dataset.copy);
  });

  /* ------------------------------------------------------------ cmd palette */

  const cmd = $('#cmd');
  const cmdInput = $('#cmd-input');
  const cmdList = $('#cmd-list');
  const dataEl = $('#cmd-data');
  const COMMANDS = dataEl ? JSON.parse(dataEl.textContent) : [];
  let results = [];
  let cursor = 0;
  let lastFocus = null;

  const MARK_A = '\u0001';
  const MARK_B = '\u0002';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  /** Subsequence match, so "expr" finds "Experience". Lower rank = better. */
  function match(q, text) {
    if (!q) return { ok: true, html: escapeHtml(text), rank: 0 };
    const lower = text.toLowerCase();
    let qi = 0, out = '', gaps = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      if (qi < q.length && lower[i] === q[qi]) {
        if (start < 0) start = i;
        out += MARK_A + text[i] + MARK_B;
        qi++;
      } else {
        out += text[i];
        if (qi > 0 && qi < q.length) gaps++;
      }
    }
    if (qi < q.length) return { ok: false };
    const html = escapeHtml(out)
      .split(MARK_B + MARK_A).join('')
      .split(MARK_A).join('<mark>')
      .split(MARK_B).join('</mark>');
    return { ok: true, html, rank: gaps * 2 + start };
  }

  function render(raw) {
    const q = raw.trim().toLowerCase();
    results = [];

    for (const c of COMMANDS) {
      const onLabel = match(q, c.label);
      if (onLabel.ok) {
        results.push({ cmd: c, html: onLabel.html, rank: onLabel.rank });
        continue;
      }
      // fall back to matching the category, e.g. "link"
      const onKind = match(q, c.kind);
      if (onKind.ok) results.push({ cmd: c, html: escapeHtml(c.label), rank: 100 + onKind.rank });
    }
    results.sort((a, b) => a.rank - b.rank);
    cursor = 0;

    if (!results.length) {
      cmdList.innerHTML = '<li class="cmd-empty">No matches for "' + escapeHtml(raw) + '"</li>';
      return;
    }
    cmdList.innerHTML = results
      .map((r, i) =>
        '<li class="cmd-item" role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
        '<span class="cmd-kind">' + escapeHtml(r.cmd.kind) + '</span>' +
        '<span class="cmd-label">' + r.html + '</span>' +
        (r.cmd.key ? '<kbd class="mono">' + escapeHtml(r.cmd.key) + '</kbd>' : '') +
        '</li>'
      )
      .join('');
  }

  function move(delta) {
    if (!results.length) return;
    const items = $$('.cmd-item', cmdList);
    if (items[cursor]) items[cursor].setAttribute('aria-selected', 'false');
    cursor = (cursor + delta + results.length) % results.length;
    const next = items[cursor];
    next.setAttribute('aria-selected', 'true');
    next.scrollIntoView({ block: 'nearest' });
  }

  function run(entry) {
    if (!entry) return;
    const act = entry.cmd.act;
    const arg = entry.cmd.arg;
    closeCmd();
    switch (act) {
      case 'scroll': {
        const t = $(arg);
        if (t) {
          t.scrollIntoView(scrollOpts);
          history.replaceState(null, '', arg);
        }
        break;
      }
      case 'open':
        if (/^https?:/.test(arg)) window.open(arg, '_blank', 'noopener');
        else window.location.href = arg;
        break;
      case 'copy':
        copy(arg);
        break;
      case 'theme':
        toggleTheme();
        break;
      case 'print':
        setTimeout(() => window.print(), 150);
        break;
      case 'clearfilter':
        applyFilter(null);
        toast('Filter cleared');
        break;
    }
  }

  function openCmd() {
    if (!cmd || !cmd.hidden) return;
    lastFocus = document.activeElement;
    cmd.hidden = false;
    cmdInput.value = '';
    render('');
    cmdInput.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeCmd() {
    if (!cmd || cmd.hidden) return;
    cmd.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (cmd) {
    const opener = $('#cmd-open');
    if (opener) opener.addEventListener('click', openCmd);

    cmd.addEventListener('click', (e) => {
      if (e.target.closest('[data-cmd-close]')) return closeCmd();
      const item = e.target.closest('.cmd-item');
      if (item) run(results[Number(item.dataset.i)]);
    });
    cmd.addEventListener('mousemove', (e) => {
      const item = e.target.closest('.cmd-item');
      if (!item) return;
      const i = Number(item.dataset.i);
      if (i === cursor) return;
      const items = $$('.cmd-item', cmdList);
      if (items[cursor]) items[cursor].setAttribute('aria-selected', 'false');
      cursor = i;
      item.setAttribute('aria-selected', 'true');
    });

    cmdInput.addEventListener('input', () => render(cmdInput.value));
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(results[cursor]); }
      else if (e.key === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
    });
  }

  /* --------------------------------------------------------------- shortcuts */

  document.addEventListener('keydown', (e) => {
    const typing =
      /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmd && cmd.hidden) openCmd();
      else closeCmd();
      return;
    }
    if (e.key === 'Escape') {
      if (cmd && !cmd.hidden) closeCmd();
      else if (activeTag) applyFilter(null);
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '/') { e.preventDefault(); openCmd(); }
    else if (e.key.toLowerCase() === 't') toggleTheme();
  });

  /* --------------------------------------------------- smooth in-page links */

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView(scrollOpts);
    history.replaceState(null, '', id);
  });
})();
