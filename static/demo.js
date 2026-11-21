/* RegMon – öffentliche Demo (Feed-Stufe).
 *
 * Läuft VOR dem Hauptskript des Dashboards und lässt dessen Code unverändert:
 *  1. fetch() wird umgelenkt – die drei lesenden Endpunkte kommen aus data/*.json,
 *     alles Schreibende antwortet mit 403, Unbekanntes mit 404. Kein Aufruf
 *     verlässt die Seite.
 *  2. Alles, was zur Vollversion gehört, bleibt sichtbar und ist nur zur Ansicht:
 *     Einstufung, Deep Scan, Reset, Anmeldung, Audit, Abdeckung, Hilfe.
 *     Ein Klick darauf erklärt das, statt ins Leere zu laufen.
 *  3. Maschinell erzeugte Texte (Zusammenfassung, Deep Scan) tragen eine
 *     Kennzeichnung – Art. 50 KI-Verordnung, auch in der Demo.
 *  4. Erklären-Modus (seit 2026-11-10): Hinweiskarten je Element aus data/tour.json,
 *     Blatt „Neu in <Version>" mit Kern und Modulen, tiefe Verweise (#tour=, #neu,
 *     #lang=en). Texte kommen aus dem Repo neben dem Code, nie aus der Seite selbst.
 */
(function () {
  'use strict';

  var LOCKED_MSG = 'In der Vollversion verfügbar – in der Demo nur zur Ansicht.';
  var DATA = {
    '/api/view': 'data/view.json',
    '/api/summaries/latest': 'data/summaries.json',
    '/api/display': 'data/display.json'
  };
  var BASE = new URL('.', document.baseURI);
  var realFetch = window.fetch.bind(window);

  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  function apiPathOf(input) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path;
    try { path = new URL(url, document.baseURI).pathname; } catch (e) { path = String(url); }
    var i = path.indexOf('/api/');
    return i >= 0 ? path.slice(i) : null;
  }

  window.fetch = function (input, init) {
    var apiPath = apiPathOf(input);
    if (apiPath === null) return realFetch(input, init);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method !== 'GET') return Promise.resolve(jsonResponse(403, { detail: LOCKED_MSG }));
    if (DATA[apiPath]) return realFetch(new URL(DATA[apiPath], BASE).href, { cache: 'no-store' });
    if (apiPath === '/api/maintenance') return Promise.resolve(jsonResponse(200, { maintenance: false, since: null }));
    if (apiPath === '/api/auth/me') return Promise.resolve(jsonResponse(401, { detail: 'Demo' }));
    return Promise.resolve(jsonResponse(404, { detail: 'In der Demo nicht enthalten.' }));
  };

  // --- Bedienelemente der Vollversion (nur zur Ansicht) ----------------------
  // Reihenfolge wie im Dashboard: Kopfzeile, Reiter, Zeilenaktionen, Fußzeile.
  var LOCKED = [
    '#modeToggle',                 // Erweitert (Audit-Reiter)
    'button.danger',               // Reset All
    '.controls button.secondary',  // Hilfe (Bediener-Karten)
    '#authIndicator',              // Anmelden / Abmelden
    '.tab[data-tab="coverage"]',   // Abdeckung (Erfassungsgarantie)
    '.tab[data-tab="audit"]',      // Audit-Trail
    '.status-btn',                 // In Progress / Done / Irrelevant / Reopen
    '.deep-scan-btn',              // Deep Scan auslösen
    'button[onclick^="ackDeviation"]',
    '#licFooterLink',
    '#tiles .demo-custom'          // Platzhalter-Kacheln für eigene Quellen
  ].join(', ');

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('demoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demoToast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  document.addEventListener('click', function (ev) {
    // Im Erklären-Modus zeigt ein Klick die Karte des Elements, statt es auszulösen.
    if (tourOn) {
      var hintNode = ev.target && ev.target.closest ? ev.target.closest('.tour-target') : null;
      if (hintNode && !(ev.target.closest && ev.target.closest('a[href]'))) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        var h = hintByKey(hintNode.dataset.tourKey);
        if (h) showCard(h, hintNode);
        return;
      }
    }
    var target = ev.target && ev.target.closest ? ev.target.closest(LOCKED) : null;
    if (!target) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    toast(LOCKED_MSG);
  }, true);

  function locked() { toast(LOCKED_MSG); return Promise.resolve(false); }

  // --- Kennzeichnung maschinell erzeugter Texte ---------------------------
  function label(el, text, title) {
    if (el.dataset.demoLabeled) return;
    el.dataset.demoLabeled = '1';
    var s = document.createElement('span');
    s.className = 'ai-label';
    s.title = title;
    s.textContent = text;
    el.insertBefore(s, el.firstChild);
    el.insertBefore(document.createTextNode(' '), s.nextSibling);
  }
  function labelGenerated(root) {
    root.querySelectorAll('.summary').forEach(function (el) {
      if (el.getAttribute('style')) return; // "Kein Summary verfügbar" ist kein Modelltext
      label(el, 'KI-Zusammenfassung', 'Vom lokalen Sprachmodell der Referenzinstanz erzeugt, fachlich ungeprüft.');
    });
    root.querySelectorAll('.deep-scan-label').forEach(function (el) {
      label(el, 'KI-Entwurf', 'Tiefenanalyse des lokalen Sprachmodells – ein Entwurf, kein Urteil.');
    });
  }

  // --- Erklären-Modus (Tour), seit 2026-11-10 --------------------------------
  // Daten aus data/tour.json (Hinweise je Element, Modultexte, Neu-in-Version),
  // erzeugt vom Exporter aus tour_hints.json + Feature-Katalog + whatsnew.json.
  // Alles, was hier in die Seite kommt, geht über textContent – nie innerHTML.
  var TOUR = null;
  var LANG = 'de';
  var tourOn = false;
  var activeKey = null;

  function t(obj) { return (obj && (obj[LANG] || obj.de)) || ''; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function moduleLabel(moduleId) {
    if (!TOUR) return '';
    var entry = TOUR.catalog[moduleId];
    if (!entry) return moduleId;
    if (entry.kind === 'core') return LANG === 'en' ? 'Core · ' + (t((TOUR.modules[moduleId] || {}).title) || entry.name) : 'Kern · ' + entry.name;
    var mod = TOUR.modules[moduleId] || {};
    return (LANG === 'en' ? 'Module · ' : 'Modul · ') + (t(mod.title) || entry.name);
  }
  function hintByKey(key) {
    if (!TOUR) return null;
    for (var i = 0; i < TOUR.hints.length; i++) if (TOUR.hints[i].key === key) return TOUR.hints[i];
    return null;
  }
  function targetOf(hint) {
    try { return document.querySelector(hint.selector); } catch (e) { return null; }
  }

  // Zielmarkierung: Klassen am Element, keine Kopie des Dashboards.
  function markTargets() {
    if (!TOUR) return;
    TOUR.hints.forEach(function (h) {
      var node = targetOf(h);
      if (!node) return;
      node.classList.add('tour-target');
      node.dataset.tourKey = h.key;
    });
  }
  function unmarkTargets() {
    document.querySelectorAll('.tour-target').forEach(function (n) {
      n.classList.remove('tour-target', 'tour-active');
      delete n.dataset.tourKey;
    });
  }

  var card = null;
  function ensureCard() {
    if (card) return card;
    card = el('div');
    card.id = 'tourCard';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    document.body.appendChild(card);
    return card;
  }
  function hideCard() {
    if (card) card.classList.remove('show');
    document.querySelectorAll('.tour-active').forEach(function (n) { n.classList.remove('tour-active'); });
    activeKey = null;
  }
  function showCard(hint, node) {
    var c = ensureCard();
    while (c.firstChild) c.removeChild(c.firstChild);
    var close = el('button', 'tour-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', LANG === 'en' ? 'Close' : 'Schließen');
    close.addEventListener('click', hideCard);
    c.appendChild(close);
    c.appendChild(el('div', 'tour-title', t(hint.title)));
    var entry = TOUR.catalog[hint.module] || {};
    c.appendChild(el('span', 'tour-module' + (entry.kind === 'core' ? ' core' : ''), moduleLabel(hint.module)));
    c.appendChild(el('div', '', t(hint.text)));
    if (LANG === 'de' && entry.kind === 'module' && entry.includes && entry.includes.length) {
      var ul = el('ul');
      entry.includes.slice(0, 4).forEach(function (line) { ul.appendChild(el('li', '', line)); });
      c.appendChild(ul);
    }
    document.querySelectorAll('.tour-active').forEach(function (n) { n.classList.remove('tour-active'); });
    if (node) node.classList.add('tour-active');
    activeKey = hint.key;
    c.classList.add('show');
    // Position: unter dem Element, im Viewport gehalten.
    var r = node ? node.getBoundingClientRect() : { left: 20, bottom: 80, top: 60 };
    var w = Math.min(380, window.innerWidth - 16);
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    var top = r.bottom + 8;
    c.style.left = left + 'px';
    c.style.top = top + 'px';
    var h = c.offsetHeight;
    if (top + h > window.innerHeight - 8) c.style.top = Math.max(8, r.top - h - 8) + 'px';
  }

  function setTour(on) {
    tourOn = !!on;
    document.body.classList.toggle('tour-on', tourOn);
    var btn = document.getElementById('demoTourBtn');
    if (btn) btn.setAttribute('aria-pressed', tourOn ? 'true' : 'false');
    if (tourOn) markTargets(); else { unmarkTargets(); hideCard(); }
  }

  // Ein tiefer Verweis kann vor der Liste ankommen (die Daten laden noch) – dann auf das
  // Element warten, statt die Karte ins Leere zu setzen. Nach fünf Sekunden ohne Element
  // erscheint die Karte oben, mit dem Text, aber ohne Markierung.
  function focusHint(key, tries) {
    var hint = hintByKey(key);
    if (!hint) return;
    setTour(true);
    var node = targetOf(hint);
    tries = tries || 0;
    if (!node && tries < 25) { setTimeout(function () { focusHint(key, tries + 1); }, 200); return; }
    if (node) {
      markTargets();
      if (node.scrollIntoView) node.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    setTimeout(function () { showCard(hint, targetOf(hint)); }, node ? 150 : 0);
  }

  // Neu-in-Version und Modulübersicht als Blatt über der Seite.
  var panel = null;
  function hidePanel() { if (panel) panel.classList.remove('show'); }
  function showPanel() {
    if (!TOUR) return;
    if (!panel) {
      panel = el('div');
      panel.id = 'tourPanel';
      panel.addEventListener('click', function (ev) { if (ev.target === panel) hidePanel(); });
      document.body.appendChild(panel);
    }
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    var sheet = el('div', 'tour-sheet');
    var close = el('button', 'tour-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', LANG === 'en' ? 'Close' : 'Schließen');
    close.addEventListener('click', hidePanel);
    sheet.appendChild(close);
    var wn = TOUR.whatsnew || {};
    sheet.appendChild(el('h2', '', (LANG === 'en' ? 'New in RegMon ' : 'Neu in RegMon ') + (wn.version || TOUR.version)));
    sheet.appendChild(el('div', 'tour-sub', (LANG === 'en' ? 'Release ' : 'Release vom ') + (wn.date || '')));
    var ul = el('ul');
    (wn.items || []).forEach(function (item) {
      var li = el('li', '', t(item));
      if (item.tour && hintByKey(item.tour)) {
        var b = el('button', 'tour-show', LANG === 'en' ? 'show' : 'zeigen');
        b.type = 'button';
        b.addEventListener('click', function () { hidePanel(); focusHint(item.tour); });
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
    sheet.appendChild(ul);
    sheet.appendChild(el('h3', '', LANG === 'en' ? 'Core and modules' : 'Kern und Module'));
    var ul2 = el('ul');
    var coreLi = el('li');
    coreLi.appendChild(el('span', 'tour-kind', LANG === 'en' ? 'Core' : 'Kern'));
    coreLi.appendChild(el('strong', '', t(TOUR.core.title) + ': '));
    coreLi.appendChild(document.createTextNode(t(TOUR.core.text)));
    ul2.appendChild(coreLi);
    Object.keys(TOUR.modules).forEach(function (mid) {
      var m = TOUR.modules[mid];
      var li = el('li');
      li.appendChild(el('span', 'tour-kind', LANG === 'en' ? 'Module' : 'Modul'));
      li.appendChild(el('strong', '', t(m.title) + ': '));
      li.appendChild(document.createTextNode(t(m.text)));
      var hint = null;
      for (var i = 0; i < TOUR.hints.length; i++) if (TOUR.hints[i].module === mid) { hint = TOUR.hints[i]; break; }
      if (hint) {
        var b = el('button', 'tour-show', LANG === 'en' ? 'show' : 'zeigen');
        b.type = 'button';
        b.addEventListener('click', (function (k) { return function () { hidePanel(); focusHint(k); }; })(hint.key));
        li.appendChild(b);
      }
      ul2.appendChild(li);
    });
    sheet.appendChild(ul2);
    var p = el('p', 'tour-sub');
    var a = el('a', '', LANG === 'en' ? 'Full changelog' : 'Vollständiger Changelog');
    a.href = TOUR.changelog_url;
    a.target = '_blank';
    a.rel = 'noopener';
    p.appendChild(a);
    sheet.appendChild(p);
    panel.appendChild(sheet);
    panel.classList.add('show');
  }

  function setLang(lang) {
    LANG = lang === 'en' ? 'en' : 'de';
    var b = document.getElementById('demoLangBtn');
    if (b) { b.textContent = LANG === 'en' ? 'DE' : 'EN'; b.setAttribute('aria-pressed', LANG === 'en' ? 'true' : 'false'); }
    var tb = document.getElementById('demoTourBtn');
    if (tb) tb.textContent = LANG === 'en' ? 'Explain' : 'Erklären';
    var nb = document.getElementById('demoNewBtn');
    if (nb && TOUR) nb.textContent = (LANG === 'en' ? 'New in ' : 'Neu in ') + TOUR.version;
    if (panel && panel.classList.contains('show')) showPanel();
    if (activeKey) { var h = hintByKey(activeKey); if (h) showCard(h, targetOf(h)); }
  }

  // Tiefe Verweise: #tour=<key> öffnet den Hinweis, #neu / #new das Blatt, #lang=en die Sprache.
  function applyHash() {
    var hash = (location.hash || '').replace(/^#/, '');
    if (!hash) return;
    var params = {};
    hash.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 0) params[kv] = '1'; else params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    if (params.lang) setLang(params.lang);
    if (params.tab && typeof window.switchTab === 'function') window.switchTab(params.tab);
    if (params.tour) focusHint(params.tour);
    if (params.neu || params.new) showPanel();
  }

  function initTour() {
    realFetch(new URL('data/tour.json', BASE).href, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        TOUR = data;
        var tb = document.getElementById('demoTourBtn');
        if (tb) tb.addEventListener('click', function () { setTour(!tourOn); });
        var nb = document.getElementById('demoNewBtn');
        if (nb) nb.addEventListener('click', showPanel);
        var lb = document.getElementById('demoLangBtn');
        if (lb) lb.addEventListener('click', function () { setLang(LANG === 'en' ? 'de' : 'en'); });
        // Die Liste rendert sich neu (Reiterwechsel, Filter) – Markierungen nachziehen.
        var list = document.getElementById('listContent');
        if (list) new MutationObserver(function () { if (tourOn) markTargets(); }).observe(list, { childList: true, subtree: true });
        document.addEventListener('mouseover', function (ev) {
          if (!tourOn) return;
          var node = ev.target && ev.target.closest ? ev.target.closest('.tour-target') : null;
          if (!node || node.dataset.tourKey === activeKey) return;
          var h = hintByKey(node.dataset.tourKey);
          if (h) showCard(h, node);
        });
        document.addEventListener('keydown', function (ev) {
          if (ev.key === 'Escape') { hideCard(); hidePanel(); }
        });
        window.addEventListener('hashchange', applyHash);
        applyHash();
      })
      .catch(function () { /* ohne Tour-Daten bleibt die Demo eine Demo */ });
  }

  // --- Eigene Quellen als Platzhalter-Kacheln (seit 2026-11-18) --------------
  // Neben den Standardquellen zeigt die Demo ausgegraut, wo in der Vollversion die eigenen
  // Quellen des Kunden stehen – bestellbar als Plugin, mit derselben Erfassungsgarantie.
  // Die Kacheln entstehen hier, nicht im Dashboard; das Dashboard bleibt unverändert.
  var CUSTOM_TILES = [
    { label: 'Fachgesellschaft', hint: 'z. B. Leitlinien, Stellungnahmen' },
    { label: 'Landesbehörde', hint: 'z. B. Landesrecht, Bekanntmachungen' },
    { label: 'Ihre Quelle', hint: 'Normen, Portale, RSS – auf Bestellung' }
  ];
  function addCustomTiles() {
    var tiles = document.getElementById('tiles');
    if (!tiles || tiles.querySelector('.demo-custom')) return;
    if (!tiles.querySelector('.tile')) return;  // erst, wenn die echten Kacheln da sind
    CUSTOM_TILES.forEach(function (t) {
      var tile = document.createElement('div');
      tile.className = 'tile demo-custom';
      tile.setAttribute('title', 'Eigene Quelle – in der Vollversion verfügbar');
      var src = document.createElement('div'); src.className = 'source'; src.textContent = t.label;
      var cnt = document.createElement('div'); cnt.className = 'count'; cnt.textContent = '+';
      var sub = document.createElement('div'); sub.className = 'demo-custom-hint'; sub.textContent = t.hint;
      tile.appendChild(src); tile.appendChild(cnt); tile.appendChild(sub);
      tiles.appendChild(tile);
    });
  }

  function init() {
    // Produktfunktionen auch dann sperren, wenn sie ohne Klick aufgerufen würden.
    ['resetAll', 'triggerDeepScan', 'ackDeviation', 'openLoginModal', 'toggleHelpMenu'].forEach(function (name) {
      if (typeof window[name] === 'function') window[name] = locked;
    });

    // Der Audit-Reiter ist im Produkt nur im erweiterten Modus sichtbar; in der
    // Demo bleibt er sichtbar und nur zur Ansicht, damit man sieht, dass es ihn gibt.
    var audit = document.querySelector('.tab[data-tab="audit"]');
    if (audit) { audit.classList.remove('hidden'); audit.classList.add('demo-locked'); }
    if (typeof window.updateTabVisibility === 'function') window.updateTabVisibility = function () {};

    var list = document.getElementById('listContent');
    if (list) {
      labelGenerated(list);
      new MutationObserver(function () { labelGenerated(list); }).observe(list, { childList: true, subtree: true });
    }
    var tiles = document.getElementById('tiles');
    if (tiles) {
      addCustomTiles();
      // renderTiles() setzt innerHTML neu (Aktualisierung) – die Platzhalter kommen dann wieder dazu.
      new MutationObserver(function () { addCustomTiles(); }).observe(tiles, { childList: true });
    }

    var foot = document.getElementById('licFooter');
    if (foot) {
      foot.innerHTML = 'RegMon · Demo von <a href="https://rh-advisory.de/">RH Advisory</a> · '
        + '<a href="https://rh-advisory.de/impressum.html">Impressum</a> · '
        + '<a href="https://rh-advisory.de/datenschutz.html">Datenschutz</a>';
    }

    var subtitle = document.querySelector('#header .subtitle');
    if (subtitle) subtitle.textContent = 'Öffentliche Demo – Standardquellen';

    initTour();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
