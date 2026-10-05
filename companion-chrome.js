/*! Board Game Tracker — companion top chrome only (v2.8) */
(function () {
  var LANG_KEY = 'bgCompanionLang';

  var APP_META = {
    'everdell.html': {
      title: 'EVERDELL', sub: 'Companion', icon: '🌲', accent: '#16a34a',
      extra: { title: 'Точки', icon: '🧮', run: function () {
        if (typeof window.openScoreCalculator === 'function') window.openScoreCalculator();
      }}
    },
    'heat.html': { title: 'HEAT', sub: 'Companion', icon: '🏎️', accent: '#ef4444' },
    'carcassonne.html': { title: 'CARCASSONNE', sub: 'Companion', icon: '🏰', accent: '#eab308' },
    'skyteam.html': {
      title: 'SKY TEAM', sub: 'Рандомайзер', icon: '✈️', accent: '#0ea5e9',
      extra: { title: 'Писти', icon: '📋', run: function () {
        if (typeof window.openFlightLog === 'function') window.openFlightLog();
      }}
    },
    'castles.html': {
      title: 'BURGUNDY', sub: 'Castles', icon: '🏯', accent: '#e11d48',
      extra: { title: "Зарове", icon: '🎲', run: function () {
        if (typeof window.goToDiceScreen === 'function') window.goToDiceScreen();
        else if (typeof goToDiceScreen === 'function') goToDiceScreen();
      }}
    },
    'spirit_island.html': { title: 'SPIRIT ISLAND', sub: 'Companion', icon: '🏝️', accent: '#14b8a6' }
  };

  function fileName() {
    try {
      return ((location.pathname || '').split('/').pop() || '').toLowerCase();
    } catch (e) { return ''; }
  }

  function getMeta() {
    var key = fileName();
    if (APP_META[key]) return APP_META[key];
    if (/heat/i.test(key)) return APP_META['heat.html'];
    return { title: 'COMPANION', sub: 'Board Game Tracker', icon: '🎲', accent: '#22c55e' };
  }

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'bg'; } catch (e) { return 'bg'; }
  }
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  }

  window.bgtGetLang = getLang;
  window.bgtSetLang = setLang;
  window.currentLang = getLang();

  function syncLangLabel() {
    var lang = getLang();
    window.currentLang = lang;
    var el = document.getElementById('bgt-top-lang-label');
    if (el) el.textContent = lang.toUpperCase();
    var el2 = document.getElementById('lang-btn-text');
    if (el2) el2.textContent = lang.toUpperCase();
    document.documentElement.lang = lang;
  }

  window.bgtToggleLanguage = function () {
    var appToggle = window.toggleLanguage;
    if (typeof appToggle === 'function' && appToggle !== window.bgtToggleLanguage) {
      try { appToggle(); syncLangLabel(); return; } catch (e) {}
    }
    var next = getLang() === 'bg' ? 'en' : 'bg';
    setLang(next);
    window.currentLang = next;
    syncLangLabel();
    document.querySelectorAll('[data-i18n-bg]').forEach(function (node) {
      var bg = node.getAttribute('data-i18n-bg');
      var en = node.getAttribute('data-i18n-en') || bg;
      node.textContent = next === 'en' ? en : bg;
    });
    if (typeof window.softRenderApp === 'function') { try { window.softRenderApp(); return; } catch (e) {} }
    if (typeof window.renderApp === 'function') { try { window.renderApp(); return; } catch (e) {} }
  };

  function shellRoot() {
    return (
      document.querySelector('body > div.w-full') ||
      document.querySelector('body > .container') ||
      document.querySelector('body > main') ||
      document.querySelector('body > #app') ||
      document.body
    );
  }

  function hideOldHeaders() {
    document.querySelectorAll('.top-header, header.sticky, header[class*="sticky"], header[class*="border-b"], header[class*="backdrop"]').forEach(function (el) {
      if (el.id === 'bgt-top') return;
      el.classList.add('bgt-old-header-hidden');
      el.style.display = 'none';
    });
    var bottom = document.getElementById('bgt-chrome');
    if (bottom && bottom.parentNode) bottom.parentNode.removeChild(bottom);
    var suite = document.getElementById('suite-chrome');
    if (suite && suite.parentNode) suite.parentNode.removeChild(suite);
  }

  function mountTop() {
    if (document.getElementById('bgt-top')) return;
    var meta = getMeta();
    var lang = getLang();
    document.documentElement.style.setProperty('--bgt-accent', meta.accent || '#22c55e');
    document.body.classList.add('bgt-has-top');

    var bar = document.createElement('header');
    bar.id = 'bgt-top';
    bar.setAttribute('role', 'banner');

    var extraBtn = '';
    if (meta.extra) {
      extraBtn = '<button type="button" class="bgt-top-btn extra" id="bgt-top-extra" title="' +
        (meta.extra.title || '') + '">' + (meta.extra.icon || '★') + '</button>';
    }

    bar.innerHTML =
      '<div class="bgt-top-nav">' +
        '<a class="bgt-top-btn home" href="./index.html" title="Начало">🏠</a>' +
        '<button type="button" class="bgt-top-btn back" id="bgt-top-back" title="Назад">←</button>' +
        '<a class="bgt-top-btn log" href="./index.html#log" title="Запис">📝</a>' +
        '<a class="bgt-top-btn apps" href="./index.html#companions" title="Companion апове">🎮</a>' +
        extraBtn +
        '<button type="button" class="bgt-top-btn lang" id="bgt-top-lang" title="Език">🌐 <span id="bgt-top-lang-label">' +
          lang.toUpperCase() + '</span></button>' +
      '</div>' +
      '<div class="bgt-top-brand">' +
        '<div class="bgt-top-text">' +
          '<div class="bgt-top-title">' + meta.title + '</div>' +
          '<div class="bgt-top-sub">' + (meta.sub || '') + '</div>' +
        '</div>' +
        '<div class="bgt-top-logo" aria-hidden="true">' + meta.icon + '</div>' +
      '</div>';

    var shell = shellRoot();
    shell.insertBefore(bar, shell.firstChild);

    var back = document.getElementById('bgt-top-back');
    if (back) {
      back.addEventListener('click', function () {
        if (typeof window.goBackStep === 'function') {
          try { window.goBackStep(); return; } catch (e) {}
        }
        if (typeof window.goHome === 'function') {
          try { window.goHome(); return; } catch (e) {}
        }
        if (history.length > 1) history.back();
        else location.href = './index.html';
      });
    }

    var extra = document.getElementById('bgt-top-extra');
    if (extra && meta.extra && typeof meta.extra.run === 'function') {
      extra.addEventListener('click', function () { meta.extra.run(); });
    }

    var langBtn = document.getElementById('bgt-top-lang');
    if (langBtn) {
      langBtn.addEventListener('click', function () { window.bgtToggleLanguage(); });
    }

    hideOldHeaders();
    setTimeout(hideOldHeaders, 50);
    setTimeout(hideOldHeaders, 300);
  }

  function boot() {
    mountTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
