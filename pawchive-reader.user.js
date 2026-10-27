// ==UserScript==
// @name         Pawchive Reader
// @namespace    https://github.com/DrScarab/pawchive-improver
// @version      1.2.1
// @description  Text size, line height, typeface and width controls, word count, reading progress, and duplicate prev/next navigation for Pawchive posts.
// @author       DrScarab
// @license      MIT
// @homepageURL  https://github.com/DrScarab/pawchive-improver
// @supportURL   https://github.com/DrScarab/pawchive-improver/issues
// @updateURL    https://raw.githubusercontent.com/DrScarab/pawchive-improver/main/pawchive-reader.user.js
// @downloadURL  https://raw.githubusercontent.com/DrScarab/pawchive-improver/main/pawchive-reader.user.js
// @match        *://pawchive.pw/*
// @match        *://*.pawchive.pw/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORE_KEY = 'pawchive-reader-settings';
  const DEFAULTS = Object.freeze({
    fontSize: 18,   // px
    lineHeight: 1.65,
    width: 760,     // px, max width of the post column
    typeface: 'sans',
    collapsed: false,
  });

  const FONT_MIN = 12;
  const FONT_MAX = 34;
  const LINE_MIN = 1.2;
  const LINE_MAX = 2.2;
  const WIDTH_MIN = 480;
  const WIDTH_MAX = 1600;

  const TYPEFACES = Object.freeze({
    sans: {
      label: 'Sans (default)',
      stack: 'Helvetica, Arial, sans-serif',
    },
    serif: {
      label: 'Serif',
      stack: 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", "Times New Roman", serif',
    },
    wide: {
      label: 'Wide sans',
      stack: 'Verdana, Tahoma, "Trebuchet MS", sans-serif',
    },
    mono: {
      label: 'Monospace',
      stack: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Consolas, "Liberation Mono", monospace',
    },
  });

  const CSS = `
    :root {
      --paw-reader-font-size: ${DEFAULTS.fontSize}px;
      --paw-reader-line-height: ${DEFAULTS.lineHeight};
      --paw-reader-font-family: ${TYPEFACES[DEFAULTS.typeface].stack};
      --paw-reader-width: ${DEFAULTS.width}px;
    }

    /* Keep the whole post (header, body, comments) in one readable column. */
    #main .site-section--post {
      max-width: var(--paw-reader-width);
      margin-left: auto;
      margin-right: auto;
    }

    /* Only the reading text is resized; navigation and metadata stay put. */
    .post__content,
    .post__comments {
      font-size: var(--paw-reader-font-size);
      font-family: var(--paw-reader-font-family);
    }

    .post__content {
      line-height: var(--paw-reader-line-height);
    }

    .post__content p {
      padding: 0.65em 0;
    }

    .post__comments .comment__message {
      line-height: var(--paw-reader-line-height);
    }

    /* Don't let wide media punch out of the chosen column. */
    .post__content img,
    .post__content video,
    .post__content iframe {
      max-width: 100%;
      height: auto;
    }

    /* Duplicate prev/next navigation under the post, above the comments.
       The side borders bridge the content and comments boxes so the column
       outline stays continuous. */
    #main .paw-reader-nav-bottom {
      display: flow-root;
      margin: 0;
      border-left: solid hsl(0, 0%, 50%) 0.125em;
      border-right: solid hsl(0, 0%, 50%) 0.125em;
      box-sizing: border-box;
    }

    #paw-reader-ui {
      --pr-bg: #1c1f22;
      --pr-bg-soft: #262a2e;
      --pr-border: #3d4247;
      --pr-text: #e9e9e9;
      --pr-muted: #9aa0a6;
      --pr-accent: #7ac98a;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      color: var(--pr-text);
      color-scheme: dark;
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }

    #paw-reader-ui[hidden] {
      display: none !important;
    }

    #paw-reader-ui * {
      box-sizing: border-box;
    }

    #paw-reader-ui .pr-fab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      font: inherit;
    }

    #paw-reader-ui .pr-fab-aa {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--pr-border);
      border-radius: 50%;
      background: var(--pr-bg);
      color: var(--pr-text);
      box-shadow: 0 4px 14px #0009;
      font: 600 15px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }

    #paw-reader-ui .pr-fab-progress {
      min-width: 36px;
      padding: 2px 7px;
      border: 1px solid var(--pr-border);
      border-radius: 999px;
      background: var(--pr-bg);
      color: var(--pr-accent);
      box-shadow: 0 2px 8px #0007;
      font: 600 10px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    #paw-reader-ui .pr-fab:hover .pr-fab-aa,
    #paw-reader-ui .pr-fab:focus-visible .pr-fab-aa {
      border-color: var(--pr-accent);
      color: var(--pr-accent);
      outline: none;
    }

    #paw-reader-ui .pr-fab:hover .pr-fab-progress,
    #paw-reader-ui .pr-fab:focus-visible .pr-fab-progress {
      border-color: var(--pr-accent);
    }

    #paw-reader-ui:not(.pr-collapsed) .pr-fab {
      display: none;
    }

    #paw-reader-ui.pr-collapsed .pr-panel {
      display: none;
    }

    #paw-reader-ui .pr-panel {
      width: 260px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 12px 14px;
      border: 1px solid var(--pr-border);
      border-radius: 12px;
      background: var(--pr-bg);
      box-shadow: 0 8px 28px #000b;
    }

    #paw-reader-ui .pr-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
      color: var(--pr-muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    #paw-reader-ui .pr-close {
      padding: 0 4px;
      border: 0;
      background: none;
      color: var(--pr-muted);
      font: 16px/1 system-ui, sans-serif;
      cursor: pointer;
    }

    #paw-reader-ui .pr-close:hover {
      color: var(--pr-text);
    }

    #paw-reader-ui .pr-field {
      display: block;
      margin-top: 12px;
    }

    #paw-reader-ui .pr-label {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      color: var(--pr-muted);
    }

    #paw-reader-ui .pr-value {
      color: var(--pr-accent);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    #paw-reader-ui input[type="range"] {
      display: block;
      width: 100%;
      height: 18px;
      margin: 0;
      accent-color: var(--pr-accent);
      cursor: pointer;
    }

    #paw-reader-ui .pr-select {
      display: block;
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--pr-border);
      border-radius: 7px;
      background: var(--pr-bg-soft);
      color: var(--pr-text);
      font: inherit;
      cursor: pointer;
    }

    #paw-reader-ui .pr-status {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid var(--pr-border);
      color: var(--pr-muted);
      font-size: 11px;
    }

    #paw-reader-ui .pr-words {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #paw-reader-ui .pr-percent {
      color: var(--pr-accent);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    #paw-reader-ui .pr-reset {
      width: 100%;
      margin-top: 14px;
      padding: 6px 8px;
      border: 1px solid var(--pr-border);
      border-radius: 7px;
      background: var(--pr-bg-soft);
      color: var(--pr-muted);
      font: inherit;
      cursor: pointer;
    }

    #paw-reader-ui .pr-reset:hover {
      border-color: var(--pr-accent);
      color: var(--pr-text);
    }

    @media (max-width: 520px) {
      #paw-reader-ui {
        right: 10px;
        bottom: 10px;
      }

      #paw-reader-ui .pr-panel {
        width: min(260px, calc(100vw - 20px));
      }
    }
  `;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadSettings() {
    const settings = { ...DEFAULTS };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (parsed && typeof parsed === 'object') {
        if (Number.isFinite(Number(parsed.fontSize))) {
          settings.fontSize = clamp(Number(parsed.fontSize), FONT_MIN, FONT_MAX);
        }
        if (Number.isFinite(Number(parsed.lineHeight))) {
          settings.lineHeight = clamp(Number(parsed.lineHeight), LINE_MIN, LINE_MAX);
        }
        if (Number.isFinite(Number(parsed.width))) {
          settings.width = clamp(Number(parsed.width), WIDTH_MIN, WIDTH_MAX);
        }
        if (typeof parsed.typeface === 'string' && TYPEFACES[parsed.typeface]) {
          settings.typeface = parsed.typeface;
        }
        settings.collapsed = Boolean(parsed.collapsed);
      }
    } catch (error) {
      /* Corrupt or unavailable storage: fall back to defaults. */
    }
    return settings;
  }

  const settings = loadSettings();
  let saveTimer = 0;
  let ui = null;

  function saveSettings() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(settings));
      } catch (error) {
        /* Private mode or storage full: settings still work for this page. */
      }
    }, 150);
  }

  function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--paw-reader-font-size', settings.fontSize + 'px');
    root.style.setProperty('--paw-reader-line-height', String(settings.lineHeight));
    root.style.setProperty('--paw-reader-font-family', TYPEFACES[settings.typeface].stack);
    root.style.setProperty('--paw-reader-width', settings.width + 'px');
  }

  function formatValue(key) {
    if (key === 'lineHeight') return settings.lineHeight.toFixed(2);
    return settings[key] + ' px';
  }

  let statsFrame = 0;
  let statsContent = null;
  let wordCount = 0;
  let contentObserver = null;

  function countWords(content) {
    const text = content.textContent || '';
    const matches = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
    return matches ? matches.length : 0;
  }

  function wordCountLabel(count) {
    if (!count) return '—';
    const minutes = Math.max(1, Math.ceil(count / 220));
    return count.toLocaleString('en-US') + ' words · ~' + minutes + ' min';
  }

  function computeProgress(content) {
    const rect = content.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    if (rect.height <= 0) return 0;

    // 0% when the top of the post is at the top of the viewport, 100% when
    // the bottom of the post reaches the bottom of the viewport.
    const travel = rect.height - viewport;
    if (travel <= 0) return 100;

    const start = rect.top + scrollY;
    return clamp((scrollY - start) / travel, 0, 1) * 100;
  }

  function scheduleReadingStats() {
    if (statsFrame) return;
    statsFrame = window.requestAnimationFrame(() => {
      statsFrame = 0;
      updateReadingStats();
    });
  }

  function updateReadingStats() {
    if (!ui || ui.hidden) return;

    const content = document.querySelector('#main .post__content');
    if (!content) {
      statsContent = null;
      wordCount = 0;
      if (contentObserver) contentObserver.disconnect();
      const words = ui.querySelector('.pr-words');
      if (words) words.textContent = '—';
      return;
    }

    if (content !== statsContent) {
      statsContent = content;
      wordCount = countWords(content);

      if ('ResizeObserver' in window) {
        if (!contentObserver) {
          contentObserver = new ResizeObserver(scheduleReadingStats);
        }
        contentObserver.disconnect();
        contentObserver.observe(content);
      }
    }

    const words = ui.querySelector('.pr-words');
    if (words) words.textContent = wordCountLabel(wordCount);

    const percentText = clamp(Math.round(computeProgress(content)), 0, 100) + '%';
    const panelPercent = ui.querySelector('.pr-percent');
    if (panelPercent) panelPercent.textContent = percentText;
    const fabPercent = ui.querySelector('.pr-fab-progress');
    if (fabPercent) fabPercent.textContent = percentText;
    const fab = ui.querySelector('.pr-fab');
    if (fab) fab.setAttribute('aria-label', 'Reading settings, ' + percentText + ' read');
  }

  function injectStyles() {
    if (document.getElementById('paw-reader-style')) return;

    const style = document.createElement('style');
    style.id = 'paw-reader-style';
    // The site removes unmarked <style> nodes on htmx navigation.
    style.setAttribute('data-keep', '');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function syncUI() {
    if (!ui) return;

    ui.querySelectorAll('.pr-range').forEach((input) => {
      input.value = String(settings[input.dataset.key]);
    });

    const typefaceSelect = ui.querySelector('.pr-select');
    if (typefaceSelect) {
      typefaceSelect.value = settings.typeface;
    }

    ui.querySelectorAll('.pr-value').forEach((output) => {
      output.textContent = formatValue(output.dataset.for);
    });

    ui.classList.toggle('pr-collapsed', settings.collapsed);
    ui.querySelector('.pr-fab').setAttribute('aria-expanded', String(!settings.collapsed));
  }

  function buildUI() {
    ui = document.createElement('div');
    ui.id = 'paw-reader-ui';
    // Keep htmx's history cache from storing a dead copy of the panel.
    ui.setAttribute('hx-history', 'false');
    ui.innerHTML = `
      <button class="pr-fab" type="button" title="Reading settings" aria-label="Reading settings" aria-expanded="true">
        <span class="pr-fab-aa">Aa</span>
        <span class="pr-fab-progress">0%</span>
      </button>
      <div class="pr-panel">
        <div class="pr-head">
          <span>Reading settings</span>
          <button class="pr-close" type="button" title="Hide" aria-label="Hide reading settings">×</button>
        </div>
        <label class="pr-field">
          <span class="pr-label">
            <span>Text size</span>
            <output class="pr-value" data-for="fontSize"></output>
          </span>
          <input class="pr-range" type="range" data-key="fontSize"
                 min="${FONT_MIN}" max="${FONT_MAX}" step="1">
        </label>
        <label class="pr-field">
          <span class="pr-label">
            <span>Line height</span>
            <output class="pr-value" data-for="lineHeight"></output>
          </span>
          <input class="pr-range" type="range" data-key="lineHeight"
                 min="${LINE_MIN}" max="${LINE_MAX}" step="0.05">
        </label>
        <label class="pr-field">
          <span class="pr-label">
            <span>Typeface</span>
          </span>
          <select class="pr-select" data-key="typeface" aria-label="Typeface"></select>
        </label>
        <label class="pr-field">
          <span class="pr-label">
            <span>Content width</span>
            <output class="pr-value" data-for="width"></output>
          </span>
          <input class="pr-range" type="range" data-key="width"
                 min="${WIDTH_MIN}" max="${WIDTH_MAX}" step="10">
        </label>
        <div class="pr-status">
          <span class="pr-words">—</span>
          <span class="pr-percent">0%</span>
        </div>
        <button class="pr-reset" type="button">Reset to defaults</button>
      </div>
    `;

    const typefaceSelect = ui.querySelector('.pr-select');
    Object.entries(TYPEFACES).forEach(([value, typeface]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = typeface.label;
      typefaceSelect.appendChild(option);
    });

    ui.querySelector('.pr-fab').addEventListener('click', () => {
      settings.collapsed = false;
      syncUI();
      saveSettings();
    });

    ui.querySelector('.pr-close').addEventListener('click', () => {
      settings.collapsed = true;
      syncUI();
      saveSettings();
    });

    ui.querySelectorAll('.pr-range').forEach((input) => {
      const key = input.dataset.key;
      input.addEventListener('input', () => {
        settings[key] = Number(input.value);
        if (key === 'lineHeight') {
          settings.lineHeight = Math.round(settings.lineHeight * 100) / 100;
        }
        applySettings();
        syncUI();
        saveSettings();
      });
    });

    typefaceSelect.addEventListener('change', () => {
      settings.typeface = TYPEFACES[typefaceSelect.value] ? typefaceSelect.value : DEFAULTS.typeface;
      applySettings();
      syncUI();
      saveSettings();
    });

    ui.querySelector('.pr-reset').addEventListener('click', () => {
      settings.fontSize = DEFAULTS.fontSize;
      settings.lineHeight = DEFAULTS.lineHeight;
      settings.width = DEFAULTS.width;
      settings.typeface = DEFAULTS.typeface;
      applySettings();
      syncUI();
      saveSettings();
    });

    // Keep slider arrow keys from reaching any page-level shortcuts.
    ui.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });

    document.body.appendChild(ui);
    syncUI();
  }

  function addBottomNavigation() {
    const section = document.querySelector('#main .site-section--post');
    if (!section) return;

    // Drop any copy restored from an htmx history snapshot so links always
    // match the post currently on screen.
    section.querySelectorAll('.paw-reader-nav-bottom').forEach((nav) => nav.remove());

    const topNav = section.querySelector('.post__nav-links');
    const body = section.querySelector('.post__body');
    if (!topNav || !body) return;

    const clone = topNav.cloneNode(true);
    clone.classList.add('paw-reader-nav-bottom');
    clone.removeAttribute('id');

    // The site's htmx only boosts anchors that existed at swap time. Route
    // clicks on the copy through the matching top link so navigation stays
    // instant and the reading settings survive the page change.
    clone.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest('a[href]');
      if (!link || !clone.contains(link)) return;

      const href = link.getAttribute('href');
      const topLink = Array.from(section.querySelectorAll('.post__nav-links a[href]')).find(
        (candidate) =>
          !candidate.closest('.paw-reader-nav-bottom') &&
          candidate.getAttribute('href') === href
      );

      if (!topLink) return;

      event.preventDefault();
      topLink.click();
    });

    const footer = section.querySelector('.post__footer');
    section.insertBefore(clone, footer || body.nextSibling);
  }

  function ensureUI() {
    if (!document.body) return;

    if (!ui || !ui.isConnected) {
      // A restored htmx history snapshot can contain a dead copy of the panel.
      document.querySelectorAll('#paw-reader-ui').forEach((node) => node.remove());
      ui = null;
      buildUI();
    } else {
      document.querySelectorAll('#paw-reader-ui').forEach((node) => {
        if (node !== ui) node.remove();
      });
    }

    // The panel is only useful on post pages. htmx swaps #main, not the body,
    // so toggling on every swap keeps it in sync with boosted navigation.
    ui.hidden = !document.querySelector('.post__content');

    addBottomNavigation();
    updateReadingStats();
  }

  function start() {
    injectStyles();
    applySettings();
    ensureUI();

    document.addEventListener('htmx:afterSwap', ensureUI);
    document.addEventListener('htmx:afterSettle', ensureUI);
    document.addEventListener('htmx:historyRestore', ensureUI);
    window.addEventListener('scroll', scheduleReadingStats, { passive: true });
    window.addEventListener('resize', scheduleReadingStats);
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
