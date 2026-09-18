/* ==========================================================================
   Bites & Beats — site behaviour
   Core: theme, RTL, drawer, scroll UI, reveals, forms
   Modules: flight builder, night dial, menu filter, event planner
   ========================================================================== */

(function () {
  'use strict';

  var htmlEl = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- utils */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  var toastTimer;
  function toast(msg, icon) {
    var el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = '<i class="ph-fill ' + (icon || 'ph-check-circle') + '"></i><span></span>';
    $('span', el).textContent = msg;
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  /* --------------------------------------------------------------- theme */
  function initTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) {
      htmlEl.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      htmlEl.setAttribute('data-theme', 'dark');
    }

    function syncIcons() {
      var dark = htmlEl.getAttribute('data-theme') === 'dark';
      $$('.theme-toggle').forEach(function (btn) {
        var i = $('i', btn);
        if (i) i.className = dark ? 'ph ph-sun' : 'ph ph-moon';
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      });
    }

    syncIcons();

    $$('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        syncIcons();
      });
    });
  }

  /* ----------------------------------------------------------------- RTL */
  function initRtl() {
    if (localStorage.getItem('dir') === 'rtl') htmlEl.setAttribute('dir', 'rtl');

    $$('.rtl-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (htmlEl.getAttribute('dir') === 'rtl') {
          htmlEl.removeAttribute('dir');
          localStorage.setItem('dir', 'ltr');
        } else {
          htmlEl.setAttribute('dir', 'rtl');
          localStorage.setItem('dir', 'rtl');
        }
      });
    });
  }

  /* -------------------------------------------------------------- drawer */
  function initDrawer() {
    var drawer = $('.drawer');
    var overlay = $('.drawer-overlay');
    var hamburger = $('.hamburger');
    var closeBtn = $('.close-drawer');
    if (!drawer) return;

    function open() {
      drawer.classList.add('active');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      var first = $('a, button', drawer);
      if (first) first.focus();
    }

    function close() {
      drawer.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (hamburger) hamburger.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
    $$('.drawer-nav a, .drawer-actions a', drawer).forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('active')) close();
    });
  }

  /* ----------------------------------------------------- navbar + progress */
  function initScrollUI() {
    var navbar = $('.navbar');
    var bar = $('.scroll-progress');
    var ticking = false;

    function update() {
      var y = window.pageYOffset;
      if (navbar) navbar.classList.toggle('scrolled', y > 24);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    update();
  }

  /* ---------------------------------------------------------- back to top */
  function initBackToTop() {
    var btn = $('.back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'back-to-top';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<i class="ph ph-arrow-up" aria-hidden="true"></i>';
      document.body.appendChild(btn);
    }

    var ticking = false;

    function update() {
      // Show once past roughly a screenful, so short pages never get it.
      btn.classList.toggle('show', window.pageYOffset > window.innerHeight * 0.9);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      // Hand focus back to the top of the document for keyboard users.
      var target = $('.navbar a, .logo') || document.body;
      if (target) target.focus({ preventScroll: true });
    });

    update();
  }

  /* --------------------------------------------------------------- faq */
  function initFaq() {
    var items = $$('.faq-item');
    if (!items.length) return;

    function setOpen(item, open) {
      var btn = $('.faq-q', item);
      item.classList.toggle('open', open);
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    items.forEach(function (item) {
      var btn = $('.faq-q', item);
      if (!btn) return;

      // Everything starts closed; a panel only opens on a click.
      setOpen(item, false);

      btn.addEventListener('click', function () {
        var willOpen = !item.classList.contains('open');
        // One answer at a time, so the list never runs away down the page.
        items.forEach(function (other) { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });
    });
  }

  /* ------------------------------------------------------- word reveal */
  function splitWords() {
    $$('.reveal-words').forEach(function (el) {
      if (el.dataset.split === 'done') return;
      var nodes = Array.prototype.slice.call(el.childNodes);
      var frag = document.createDocumentFragment();
      var index = 0;

      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (chunk) {
            if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return; }
            var wrap = document.createElement('span');
            wrap.className = 'word';
            var inner = document.createElement('span');
            inner.textContent = chunk;
            inner.style.transitionDelay = (index * 70) + 'ms';
            index++;
            wrap.appendChild(inner);
            frag.appendChild(wrap);
          });
        } else {
          frag.appendChild(node.cloneNode(true));
        }
      });

      el.innerHTML = '';
      el.appendChild(frag);
      el.dataset.split = 'done';
    });
  }

  /* ----------------------------------------------------------- reveals */
  function initReveals() {
    $$('[data-stagger]').forEach(function (group) {
      $$(':scope > *', group).forEach(function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    var targets = $$('.animate-on-scroll, .reveal-words, .reveal-img, [data-count]');

    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach(function (el) {
        el.classList.add('visible');
        if (el.hasAttribute('data-count')) el.textContent = el.getAttribute('data-count');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('visible');
        if (el.hasAttribute('data-count')) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var start = performance.now();
    var dur = 1400;

    function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------- marquee */
  function initMarquee() {
    $$('.marquee-track').forEach(function (track) {
      track.innerHTML = track.innerHTML + track.innerHTML;
    });
  }

  /* --------------------------------------------------------- jump nav */
  function initJumpNav() {
    var links = $$('.menu-jump-nav a');
    if (!links.length) return;

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var offset = 150;
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    /* Keep the active chip on screen. The rail only scrolls on narrow viewports
       where the chips overflow, and only when the active section changes. */
    var rail = links[0].parentNode;
    var lastActive = null;

    function revealActive(link) {
      if (!link || link === lastActive) return;
      lastActive = link;
      if (rail.scrollWidth <= rail.clientWidth + 1) return;

      var railRect = rail.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      var delta = (linkRect.left - railRect.left) - (railRect.width - linkRect.width) / 2;

      rail.scrollTo({ left: rail.scrollLeft + delta, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    var ticking = false;
    function syncActive() {
      var current = '';
      $$('.menu-category').forEach(function (sec) {
        if (sec.classList.contains('is-hidden')) return;
        if (window.pageYOffset >= sec.offsetTop - 200) current = sec.id;
      });
      var activeLink = null;
      links.forEach(function (l) {
        var on = l.getAttribute('href').slice(1) === current;
        l.classList.toggle('active', on);
        if (on) activeLink = l;
      });
      revealActive(activeLink);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(syncActive); }
    }, { passive: true });

    syncActive();
  }

  /* ------------------------------------------------------------- forms */
  function initForms() {
    var emailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    var phoneRe = /^\+?[\d\s().-]{10,}$/;

    function fieldError(input) {
      var msg = input.parentElement ? input.parentElement.querySelector('.error-message') : null;
      return msg;
    }

    function validate(input) {
      var val = input.value.trim();
      var type = input.getAttribute('type');
      if (!val) return false;
      if (type === 'email') return emailRe.test(val);
      if (type === 'tel') return phoneRe.test(val);
      if (type === 'number') {
        var n = parseFloat(val);
        var min = parseFloat(input.getAttribute('min'));
        if (isNaN(n)) return false;
        if (!isNaN(min) && n < min) return false;
      }
      return true;
    }

    $$('.validate-form').forEach(function (form) {
      var fields = $$('input[required], select[required], textarea[required]', form);

      fields.forEach(function (input) {
        input.addEventListener('input', function () {
          if (input.classList.contains('error') && validate(input)) {
            input.classList.remove('error');
            var msg = fieldError(input);
            if (msg) msg.classList.remove('show');
          }
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        var firstBad = null;

        fields.forEach(function (input) {
          var msg = fieldError(input);
          input.classList.remove('error', 'success');
          if (msg) msg.classList.remove('show');

          if (!validate(input)) {
            ok = false;
            input.classList.add('error');
            if (msg) msg.classList.add('show');
            if (!firstBad) firstBad = input;
          } else {
            input.classList.add('success');
          }
        });

        if (!ok) {
          if (firstBad) firstBad.focus();
          return;
        }

        var success = $('.form-success-message', form);
        if (success) {
          success.classList.add('show');
          setTimeout(function () { success.classList.remove('show'); }, 6000);
        }
        form.reset();
        fields.forEach(function (i) { i.classList.remove('success'); });
      });
    });
  }

  /* ============================================================== MODULE
     Tapas Flight Builder (index.html)
     ============================================================== */
  function initFlightBuilder() {
    var root = $('#flight-builder');
    if (!root) return;

    var opts = $$('.flight-opt', root);
    var listEl = $('#flight-list', root);
    var emptyEl = $('#flight-empty', root);
    var totalEl = $('#flight-total', root);
    var perEl = $('#flight-per', root);
    var hintEl = $('#flight-hint', root);
    var meterEl = $('#flight-meter i', root);
    var countEl = $('#flight-count', root);
    var partyChips = $$('.flight-party', root);
    var sendBtn = $('#flight-send', root);
    var clearBtn = $('#flight-clear', root);
    var surpriseBtn = $('#flight-surprise', root);

    var COURSES = ['bite', 'sea', 'land', 'green', 'sweet'];
    var COURSE_LABEL = { bite: 'a bite to start', sea: 'something from the sea', land: 'a meat plate', green: 'a green plate', sweet: 'a sweet finish' };
    var selected = [];
    var party = 2;

    function data(btn) {
      return {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        course: btn.dataset.course
      };
    }

    function render() {
      listEl.innerHTML = '';
      var total = 0;

      selected.forEach(function (item) {
        total += item.price;
        var li = document.createElement('li');
        li.innerHTML =
          '<span class="nm"></span>' +
          '<span class="dot"></span>' +
          '<span class="amt">' + money(item.price) + '</span>' +
          '<button type="button" aria-label="Remove ' + item.name + '"><i class="ph ph-x"></i></button>';
        $('.nm', li).textContent = item.name;
        $('button', li).addEventListener('click', function () { toggle(item.id); });
        listEl.appendChild(li);
      });

      emptyEl.style.display = selected.length ? 'none' : 'flex';
      listEl.style.display = selected.length ? 'block' : 'none';

      countEl.textContent = selected.length + (selected.length === 1 ? ' plate' : ' plates');
      totalEl.textContent = money(total);
      perEl.textContent = selected.length ? money(total / party) + ' per person' : '—';

      var courses = {};
      selected.forEach(function (i) { courses[i.course] = true; });
      var covered = Object.keys(courses).length;
      meterEl.style.width = Math.round((covered / COURSES.length) * 100) + '%';

      hintEl.textContent = hintFor(covered);

      /* dimmed but still clickable, so an empty board can explain itself */
      if (sendBtn) sendBtn.classList.toggle('is-empty', selected.length === 0);
    }

    function hintFor(covered) {
      if (!selected.length) return 'Two plates per person is about right.';
      var recommended = party * 2;
      if (selected.length < recommended) {
        var short = recommended - selected.length;
        return 'Add ' + short + ' more plate' + (short === 1 ? '' : 's') + ' for a table of ' + party + '.';
      }
      var missing = COURSES.filter(function (c) {
        return !selected.some(function (i) { return i.course === c; });
      });
      if (missing.length) return 'Round it out with ' + COURSE_LABEL[missing[0]] + '.';
      if (covered === COURSES.length) return 'Perfectly balanced board. The chef approves.';
      return 'Looking good.';
    }

    function toggle(id) {
      var btn = opts.filter(function (o) { return o.dataset.id === id; })[0];
      if (!btn) return;
      var idx = selected.findIndex(function (i) { return i.id === id; });

      if (idx > -1) {
        selected.splice(idx, 1);
        btn.setAttribute('aria-pressed', 'false');
      } else {
        if (selected.length >= 10) { toast('That is a feast already — ten plates is our max here.', 'ph-warning'); return; }
        selected.push(data(btn));
        btn.setAttribute('aria-pressed', 'true');
      }
      render();
    }

    opts.forEach(function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () { toggle(btn.dataset.id); });
    });

    partyChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        partyChips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        party = parseInt(chip.dataset.party, 10);
        render();
      });
    });

    if (clearBtn) clearBtn.addEventListener('click', function () {
      selected = [];
      opts.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
      render();
    });

    if (surpriseBtn) surpriseBtn.addEventListener('click', function () {
      selected = [];
      opts.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });

      COURSES.forEach(function (course) {
        var pool = opts.filter(function (o) { return o.dataset.course === course; });
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        selected.push(data(pick));
        pick.setAttribute('aria-pressed', 'true');
      });

      render();
      toast("Chef's flight loaded — one plate from every course.", 'ph-chef-hat');
    });

    if (sendBtn) sendBtn.addEventListener('click', function (e) {
      if (!selected.length) { e.preventDefault(); toast('Pick a few plates first.', 'ph-hand-pointing'); return; }
      var note = 'Tapas flight for ' + party + ': ' + selected.map(function (i) { return i.name; }).join(', ') + '.';
      try { localStorage.setItem('bb_flight', note); } catch (err) { /* storage unavailable */ }
    });

    render();
  }

  /* Prefill the reservation notes from a saved flight */
  function initFlightHandoff() {
    var field = $('#requests');
    if (!field) return;
    var note;
    try { note = localStorage.getItem('bb_flight'); } catch (err) { return; }
    if (!note) return;

    field.value = note;
    try { localStorage.removeItem('bb_flight'); } catch (err) { /* noop */ }

    var banner = $('#flight-handoff');
    if (banner) banner.style.display = 'flex';
  }

  /* ============================================================== MODULE
     Night Dial (home2.html)
     ============================================================== */
  function initNightDial() {
    var root = $('#night-dial');
    if (!root) return;

    var HOURS = [
      { t: '5:00', m: 'PM', key: 'golden', badge: 'Doors open', title: 'Golden hour, gently', desc: 'Sun through the west windows, vermouth on ice and the first trays of pintxos hitting the bar.', music: 'Flamenco guitar, low', kitchen: 'Cold tapas & pintxos', crowd: 20, seat: 'Walk right in' },
      { t: '7:00', m: 'PM', key: 'dinner', badge: 'Prime time', title: 'Plates everywhere', desc: 'Every table is mid-feast. Octopus off the plancha, sangria pitchers going out two at a time.', music: 'Latin house, medium', kitchen: 'Full menu + specials', crowd: 78, seat: 'Reservation advised' },
      { t: '9:00', m: 'PM', key: 'bar', badge: 'Peak', title: 'The loud, good hour', desc: 'Our busiest stretch. Book ahead or take your chances at the standing rail.', music: 'DJ set begins', kitchen: 'Full menu', crowd: 95, seat: 'Book ahead' },
      { t: '11:00', m: 'PM', key: 'late', badge: 'Late night', title: 'Jamón and dancing', desc: 'The tables get pushed back. Jamón, croquetas and whatever the bar feels like making.', music: 'Peak-time set', kitchen: 'Late-night menu', crowd: 85, seat: 'Standing room' },
      { t: '1:00', m: 'AM', key: 'closing', badge: 'Closing', title: 'Lights up, slowly', desc: 'Glasses collected, playlist softening, someone always asks for one more sangria.', music: 'Wind-down', kitchen: 'Closed', crowd: 25, seat: 'See you tomorrow' }
    ];

    var range = $('#night-range', root);
    var ticks = $$('.night-tick', root);
    var imgs = $$('.night-visual img', root);
    var clockEl = $('#night-clock', root);
    var badgeEl = $('#night-badge', root);
    var titleEl = $('#night-title', root);
    var descEl = $('#night-desc', root);
    var musicEl = $('#night-music', root);
    var kitchenEl = $('#night-kitchen', root);
    var seatEl = $('#night-seat', root);
    var crowdBar = $('#night-crowd i', root);
    var crowdVal = $('#night-crowd-val', root);

    function crowdWord(v) {
      if (v < 35) return 'Quiet';
      if (v < 60) return 'Filling up';
      if (v < 85) return 'Busy';
      return 'Packed';
    }

    function show(i) {
      var h = HOURS[i];
      if (!h) return;

      clockEl.innerHTML = h.t + '<small>' + h.m + '</small>';
      badgeEl.innerHTML = '<span class="pulse"></span>' + h.badge;
      titleEl.textContent = h.title;
      descEl.textContent = h.desc;
      musicEl.textContent = h.music;
      kitchenEl.textContent = h.kitchen;
      seatEl.textContent = h.seat;
      crowdBar.style.width = h.crowd + '%';
      crowdVal.textContent = crowdWord(h.crowd);

      imgs.forEach(function (img) { img.classList.toggle('active', img.dataset.key === h.key); });
      ticks.forEach(function (tk, idx) { tk.classList.toggle('active', idx === i); });
      if (range.value !== String(i)) range.value = i;
    }

    range.addEventListener('input', function () { show(parseInt(range.value, 10)); });
    ticks.forEach(function (tk, idx) {
      tk.addEventListener('click', function () { show(idx); });
    });

    /* Open on the slot closest to the visitor's own clock. The dial runs
       5PM -> 1AM in two-hour steps, so map the wall clock onto that stride. */
    var nowHour = new Date().getHours();
    var startIndex = 2;
    if (nowHour >= 17 && nowHour <= 23) startIndex = Math.round((nowHour - 17) / 2);
    else if (nowHour <= 1) startIndex = Math.round((nowHour + 7) / 2);
    show(Math.min(Math.max(startIndex, 0), HOURS.length - 1));
  }

  /* ============================================================== MODULE
     Menu Filter (menu.html)
     ============================================================== */
  function initMenuFilter() {
    var root = $('#menu-filter');
    if (!root) return;

    var search = $('#menu-search', root);
    var clearBtn = $('#menu-search-clear', root);
    var chips = $$('.chip[data-filter]', root);
    var resetBtn = $('#menu-reset', root);
    var countEl = $('#menu-count', root);
    var items = $$('.menu-item');
    var categories = $$('.menu-category');
    var emptyEl = $('#menu-empty');
    var total = items.length;

    items.forEach(function (item) {
      var title = $('.menu-item-title', item);
      var desc = $('.menu-item-desc', item);
      item.dataset.title = title ? title.textContent : '';
      item.dataset.desc = desc ? desc.textContent : '';
      item.dataset.haystack = ((item.dataset.title || '') + ' ' + (item.dataset.desc || '') + ' ' + (item.dataset.tags || '')).toLowerCase();
    });

    function highlight(el, text, query) {
      if (!el) return;
      if (!query) { el.textContent = text; return; }
      var i = text.toLowerCase().indexOf(query);
      if (i < 0) { el.textContent = text; return; }
      el.innerHTML = '';
      el.appendChild(document.createTextNode(text.slice(0, i)));
      var mark = document.createElement('mark');
      mark.className = 'hit';
      mark.textContent = text.slice(i, i + query.length);
      el.appendChild(mark);
      el.appendChild(document.createTextNode(text.slice(i + query.length)));
    }

    function apply() {
      var q = search.value.trim().toLowerCase();
      var active = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
                        .map(function (c) { return c.dataset.filter; });
      var shown = 0;

      clearBtn.classList.toggle('show', q.length > 0);

      items.forEach(function (item) {
        var tags = (item.dataset.tags || '').split(/\s+/);
        var price = parseFloat(item.dataset.price || '0');

        var passTags = active.every(function (f) {
          if (f === 'budget') return price > 0 && price <= 15;
          return tags.indexOf(f) > -1;
        });

        var passQuery = !q || item.dataset.haystack.indexOf(q) > -1;
        var visible = passTags && passQuery;

        item.classList.toggle('is-hidden', !visible);
        if (visible) {
          shown++;
          highlight($('.menu-item-title', item), item.dataset.title, q);
          highlight($('.menu-item-desc', item), item.dataset.desc, q);
        }
      });

      categories.forEach(function (cat) {
        var visibleInCat = $$('.menu-item:not(.is-hidden)', cat).length;
        cat.classList.toggle('is-hidden', visibleInCat === 0);
        var badge = $('.menu-category-count', cat);
        if (badge) badge.textContent = visibleInCat + ' of ' + $$('.menu-item', cat).length;
      });

      countEl.textContent = shown;
      if (emptyEl) emptyEl.classList.toggle('show', shown === 0);
      resetBtn.style.visibility = (q || active.length) ? 'visible' : 'hidden';
    }

    var debounce;
    search.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(apply, 120);
    });

    clearBtn.addEventListener('click', function () {
      search.value = '';
      search.focus();
      apply();
    });

    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        apply();
      });
    });

    resetBtn.addEventListener('click', function () {
      search.value = '';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      apply();
    });

    countEl.textContent = total;
    apply();
  }

  /* ============================================================== MODULE
     Event Planner (events.html)
     ============================================================== */
  function initEventPlanner() {
    var root = $('#event-planner');
    if (!root) return;

    var SPACES = {
      mezzanine: { name: 'The Mezzanine', fee: 500, min: 12, max: 30 },
      vault: { name: 'The Vault', fee: 750, min: 8, max: 18 },
      buyout: { name: 'Full Buyout', fee: 3500, min: 60, max: 120 }
    };

    var PACKAGES = {
      pintxos: { name: 'Pintxos Hour', per: 55 },
      feast: { name: 'Tapas Feast', per: 85 },
      chefs: { name: "Chef's Table", per: 120 }
    };

    var guestRange = $('#planner-guests', root);
    var guestOut = $('#planner-guests-out', root);
    var guestNote = $('#planner-guests-note', root);
    var linesEl = $('#planner-lines', root);
    var totalEl = $('#planner-total', root);
    var perEl = $('#planner-per', root);
    var warnEl = $('#planner-warn', root);
    var applyBtn = $('#planner-apply', root);

    function spaceKey() { var el = $('input[name="space"]:checked', root); return el ? el.value : 'mezzanine'; }
    function packageKey() { var el = $('input[name="package"]:checked', root); return el ? el.value : 'feast'; }

    function addons() {
      return $$('input[name="addon"]:checked', root).map(function (el) {
        return {
          name: el.dataset.name,
          amount: parseFloat(el.dataset.price),
          perGuest: el.dataset.unit === 'guest'
        };
      });
    }

    function calc() {
      var guests = parseInt(guestRange.value, 10);
      var space = SPACES[spaceKey()];
      var pack = PACKAGES[packageKey()];

      var lines = [
        { k: space.name + ' — room fee', v: space.fee },
        { k: pack.name + ' — ' + money(pack.per) + ' x ' + guests, v: pack.per * guests }
      ];

      addons().forEach(function (a) {
        lines.push({
          k: a.name + (a.perGuest ? ' — ' + money(a.amount) + ' x ' + guests : ''),
          v: a.perGuest ? a.amount * guests : a.amount
        });
      });

      var subtotal = lines.reduce(function (sum, l) { return sum + l.v; }, 0);
      var service = subtotal * 0.2;
      lines.push({ k: 'Service & staffing (20%)', v: service });

      return { guests: guests, space: space, pack: pack, lines: lines, total: subtotal + service };
    }

    /* Mirror :checked onto the wrapper so browsers without :has() still show state */
    function syncChecked() {
      $$('.option-card, .addon', root).forEach(function (wrap) {
        var input = $('input', wrap);
        wrap.classList.toggle('is-checked', !!(input && input.checked));
      });
    }

    function render() {
      var r = calc();
      syncChecked();

      guestOut.textContent = r.guests;
      guestNote.textContent = r.guests >= 60 ? 'A full-venue crowd' : (r.guests >= 20 ? 'A proper party' : 'An intimate table');

      linesEl.innerHTML = '';
      r.lines.forEach(function (l) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="k"></span><span class="dot"></span><span class="v">' + money(l.v) + '</span>';
        $('.k', li).textContent = l.k;
        linesEl.appendChild(li);
      });

      totalEl.textContent = money(r.total);
      perEl.textContent = money(r.total / r.guests) + ' per guest';

      var fits = r.guests >= r.space.min && r.guests <= r.space.max;
      warnEl.classList.toggle('show', !fits);
      if (!fits) {
        var better = Object.keys(SPACES).filter(function (k) {
          return r.guests >= SPACES[k].min && r.guests <= SPACES[k].max;
        })[0];
        warnEl.innerHTML = '<i class="ph-fill ph-warning-circle"></i><span></span>';
        $('span', warnEl).textContent = r.space.name + ' seats ' + r.space.min + '–' + r.space.max +
          '. For ' + r.guests + ' guests, ' + (better ? SPACES[better].name + ' is the better room.' : 'talk to us about a custom setup.');
      }
    }

    $$('input[name="space"], input[name="package"], input[name="addon"]', root).forEach(function (input) {
      input.addEventListener('change', render);
    });

    guestRange.addEventListener('input', render);

    if (applyBtn) applyBtn.addEventListener('click', function () {
      var r = calc();
      var guestsField = $('#guests');
      var messageField = $('#message');
      var typeField = $('#eventType');

      if (guestsField) guestsField.value = r.guests;
      if (typeField && !typeField.value && r.guests >= 60) typeField.value = 'Other';

      if (messageField) {
        var chosen = addons().map(function (a) { return a.name; });
        messageField.value =
          'Space: ' + r.space.name + '\n' +
          'Package: ' + r.pack.name + '\n' +
          'Guests: ' + r.guests + '\n' +
          'Extras: ' + (chosen.length ? chosen.join(', ') : 'none') + '\n' +
          'Estimated budget: ' + money(r.total) + ' (' + money(r.total / r.guests) + ' per guest)';
      }

      var form = $('#inquiry');
      if (form) form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      toast('Estimate copied into the inquiry form below.', 'ph-arrow-down');
    });

    render();
  }

  /* --------------------------------------------------------------- misc */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* Live countdown to opening night */
  function initCountdown() {
    var root = $('[data-countdown]');
    if (!root) return;

    var target = new Date(root.getAttribute('data-countdown')).getTime();
    if (isNaN(target)) return;

    var slots = {
      days: $('[data-unit="days"]', root),
      hours: $('[data-unit="hours"]', root),
      minutes: $('[data-unit="minutes"]', root),
      seconds: $('[data-unit="seconds"]', root)
    };

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        Object.keys(slots).forEach(function (k) { if (slots[k]) slots[k].textContent = '00'; });
        clearInterval(timer);
        return;
      }
      var s = Math.floor(diff / 1000);
      if (slots.days) slots.days.textContent = pad(Math.floor(s / 86400));
      if (slots.hours) slots.hours.textContent = pad(Math.floor(s / 3600) % 24);
      if (slots.minutes) slots.minutes.textContent = pad(Math.floor(s / 60) % 60);
      if (slots.seconds) slots.seconds.textContent = pad(s % 60);
    }

    tick();
    var timer = setInterval(tick, 1000);
  }

  /* Highlight the row covering today's day of the week */
  function initHours() {
    var today = String(new Date().getDay());
    $$('.hours-row[data-days]').forEach(function (row) {
      var days = row.dataset.days.split(',');
      if (days.indexOf(today) > -1) {
        row.classList.add('today');
        var label = $('span', row);
        if (label && !$('.today-flag', row)) {
          var flag = document.createElement('span');
          flag.className = 'today-flag';
          flag.textContent = 'Today';
          label.appendChild(flag);
        }
      }
    });
  }

  /* ---------------------------------------------------------------- boot */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initRtl();
    initDrawer();
    initScrollUI();
    initBackToTop();
    initFaq();
    splitWords();
    initMarquee();
    initReveals();
    initJumpNav();
    initForms();
    initFlightBuilder();
    initFlightHandoff();
    initNightDial();
    initMenuFilter();
    initEventPlanner();
    initCountdown();
    initHours();
    initYear();
  });
})();
