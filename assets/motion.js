/* ==========================================================================
   Refuge motion: shared by the public website and the Refuge Database.
   No dependencies. Load it in <head> without defer so the public page can
   set starting states before first paint:

     <script src="../motion.js"></script>

   Safe to fail. Nothing is hidden unless this script sets it up, every hidden
   starting state is cleared on any error, and a 3s failsafe drops the boot
   state. With reduced motion it only sets up the theme-switch guard.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-motion') || 'restrained';
  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var moving = function () { return !reduceQuery.matches; };

  root.classList.add('m-js');

  // ---------------------------------------------------------------- helpers
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  var nextFrame = function (fn) { raf(function () { raf(fn); }); };
  var flush = function (el) { return window.getComputedStyle(el).opacity; };   // commit the starting state
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var visible = function (el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); };

  // Remove one-time classes once the transition ends (or after a timeout).
  function settle(el, classes, ms) {
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', onEnd);
      classes.forEach(function (c) { el.classList.remove(c); });
      el.style.removeProperty('--m-delay');
    };
    var onEnd = function (event) { if (event.target === el && event.propertyName === 'opacity') finish(); };
    el.addEventListener('transitionend', onEnd);
    setTimeout(finish, ms + 120);
  }

  // Fade an element from a "pre" class to its resting state.
  function fadeFrom(el, baseClass, ms) {
    el.classList.add('m-fade-pre');          // starting state, applied without a transition
    flush(el);
    el.classList.add(baseClass);             // then turn the transition on
    el.classList.remove('m-fade-pre');
    settle(el, [baseClass], ms);
  }

  // ------------------------------------------------------ theme-switch guard
  // Turn every transition off for the frame where colours change, then back on.
  var switching = false;
  function freezeTransitions() {
    if (switching) return;
    switching = true;
    root.classList.add('m-theme-switching');
    nextFrame(function () { root.classList.remove('m-theme-switching'); switching = false; });
  }
  document.addEventListener('change', function (event) {
    var t = event.target;
    if (t && (t.id === 'theme' || t.id === 'theme-select' || t.name === 'theme')) freezeTransitions();
  }, true);
  if (window.MutationObserver) {
    new MutationObserver(freezeTransitions).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ------------------------------------------------------------------ boot
  var booting = mode === 'full' && moving();
  if (booting) root.classList.add('m-booting');
  var failsafe = booting ? setTimeout(function () { root.classList.remove('m-booting'); }, 3000) : 0;

  function abort(error) {
    root.classList.remove('m-booting');
    $$('.m-pre, .m-fade-pre').forEach(function (el) { el.classList.remove('m-pre', 'm-fade-pre'); el.style.removeProperty('transition'); });
    if (window.console && error) console.warn('Refuge motion stopped:', error);
  }

  function run(fn) { try { fn(); } catch (error) { abort(error); } }

  function init() {
    run(detailsSwaps);
    run(viewHeadings);
    run(numberChanges);
    if (mode === 'full') {
      run(stickyHeader);
      if (moving()) {
        run(reveals);
        run(eventFilterCrossFade);
      }
    }
    clearTimeout(failsafe);
    root.classList.remove('m-booting');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ===================================================== public website

  // Header: frosted background and shadow once the page leaves the top.
  function stickyHeader() {
    var bar = document.querySelector('.m-header-bar');
    if (!bar) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      bar.classList.toggle('m-scrolled', (window.scrollY || root.scrollTop) > 4);
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    update();
    var setHeight = function () { root.style.setProperty('--m-header-h', bar.offsetHeight + 'px'); };
    setHeight();
    if (window.ResizeObserver) new ResizeObserver(setHeight).observe(bar);
  }

  // Sections reveal once on first view; hero photos settle in on load;
  // chapter and event rows stagger in with their panel.
  function reveals() {
    if (!window.IntersectionObserver) return;

    var SECTIONS = '.page-heading, .resources, .help-column > section, .events-panel, .chapters-panel, .library, .site-footer, .character-heading, .character-layout';
    var ROWS = { '.events-panel': '.event-row', '.chapters-panel': '.chapter-row' };
    var ROW_STEP = 60, ROW_START = 120, ROW_CAP = 10;

    function prep(el, delay, extra) {
      el.style.transition = 'none';          // jump straight to the starting state
      el.classList.add('m-pre');
      if (extra) el.classList.add(extra);
      el.style.setProperty('--m-delay', delay + 'ms');
    }
    function play(el, duration) {
      flush(el);
      el.style.removeProperty('transition');
      el.classList.add('m-reveal');
      el.classList.remove('m-pre');
      var delay = parseFloat(el.style.getPropertyValue('--m-delay')) || 0;
      settle(el, ['m-reveal', 'm-photo'], delay + duration);
    }

    // Hero photos: 90ms apart, straight away
    var tiles = $$('.mosaic .tile');
    tiles.forEach(function (tile, i) { prep(tile, 80 + i * 90, 'm-photo'); });

    // Sections and their rows wait for first view
    var sections = $$(SECTIONS);
    sections.forEach(function (section) {
      prep(section, 0);
      Object.keys(ROWS).forEach(function (panel) {
        if (!section.matches(panel)) return;
        $$(ROWS[panel], section).forEach(function (row, i) {
          prep(row, ROW_START + Math.min(i, ROW_CAP) * ROW_STEP);
        });
      });
    });

    raf(function () { tiles.forEach(function (tile) { play(tile, 600); }); });

    var observer = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var section = entry.target;
        observer.unobserve(section);                 // once only, never replays
        section.style.setProperty('--m-delay', Math.min(batch++, 4) * 60 + 'ms');
        play(section, 300);
        $$('.m-pre', section).forEach(function (row) { play(row, 300); });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  // Event filter: old rows fade out while new rows fade in (150ms).
  function eventFilterCrossFade() {
    var select = document.getElementById('event-chapter');
    var list = document.getElementById('event-list');
    if (!select || !list) return;
    var snapshot = null;

    // Before the page's own handler re-renders: keep a copy of the old rows.
    document.addEventListener('change', function (event) {
      if (event.target === select && moving()) snapshot = list.cloneNode(true);
    }, true);

    // After it re-renders (this listener is added later, so it runs later).
    select.addEventListener('change', function () {
      if (!snapshot) return;
      var ghost = document.createElement('div');
      ghost.className = 'm-xfade-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.inert = true;
      while (snapshot.firstChild) ghost.appendChild(snapshot.firstChild);
      snapshot = null;
      $$('[id]', ghost).forEach(function (el) { el.removeAttribute('id'); });
      $$('a, button, input, select, textarea, [tabindex]', ghost).forEach(function (el) { el.setAttribute('tabindex', '-1'); });

      var rows = Array.prototype.slice.call(list.children);
      list.classList.add('m-xfade-host');
      list.appendChild(ghost);
      rows.forEach(function (row) { row.classList.add('m-fade-pre'); });
      flush(list);
      rows.forEach(function (row) { row.classList.add('m-xfade-in'); row.classList.remove('m-fade-pre'); settle(row, ['m-xfade-in'], 150); });
      ghost.classList.add('m-fade-out');
      setTimeout(function () {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        list.classList.remove('m-xfade-host');
      }, 200);
    });
  }

  // ===================================================== everywhere

  // View change: the new page heading fades in once (300ms).
  function viewHeadings() {
    window.addEventListener('hashchange', function () {
      if (!moving()) return;
      // The page's own hashchange handler has already rendered the new view.
      var heading = $$('main h1').filter(visible)[0];
      if (heading) fadeFrom(heading, 'm-heading', 300);
    });
  }

  // XP and learned-count changes: the new number cross-fades in (300ms).
  // The page keeps its own text cue ("✓ Learned", purchase message).
  function numberChanges() {
    if (!window.MutationObserver) return;
    var TARGETS = ['[data-xp]', '#learned-count', '.cs-stats dd'];
    var seen = {};
    var lastView = location.hash;
    var queued = false;

    function check() {
      queued = false;
      var view = location.hash;
      var fresh = view !== lastView;              // a different view: record, don't animate
      lastView = view;
      TARGETS.forEach(function (selector) {
        $$(selector).forEach(function (el, i) {
          var key = selector + '#' + i;
          var text = (el.textContent || '').trim();
          if (!fresh && seen[key] !== undefined && seen[key] !== text && moving() && visible(el)) {
            fadeFrom(el, 'm-number', 300);
          }
          seen[key] = text;
        });
      });
    }
    check();
    new MutationObserver(function () { if (!queued) { queued = true; raf(check); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  // Expand ↔ collapse: replace each <details> marker with a cross-fading pair.
  function detailsSwaps() {
    function upgrade(scope) {
      $$('details > summary:not(.m-summary)', scope).forEach(function (summary) {
        var swap = document.createElement('i');
        swap.className = 'm-swap';
        swap.setAttribute('aria-hidden', 'true');
        swap.innerHTML = '<i>▸</i><i>▾</i>';
        summary.insertBefore(swap, summary.firstChild);
        summary.classList.add('m-summary');
      });
    }
    upgrade(document);
    if (window.MutationObserver) {
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) if (records[i].addedNodes.length) { upgrade(document); return; }
      }).observe(document.body, { subtree: true, childList: true });
    }
  }
})();
