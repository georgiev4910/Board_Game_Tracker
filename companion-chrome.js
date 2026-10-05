/*! Board Game Tracker — companion top + bottom chrome (v2.7) */
(function () {
  var LANG_KEY = 'bgCompanionLang';

  var APP_META = {
    'everdell.html': {
      title: 'EVERDELL',
      sub: 'Companion',
      icon: '🌲',
      accent: '#16a34a',
      extra: { title: 'Точки', icon: '🧮', run: function () { if (typeof window.openScoreCalculator === 'function') window.openScoreCalculator(); } }
    },
    'heat.html': {
      title: 'HEAT',
      sub: 'Companion',
      icon: '🏎️',
      accent: '#ef4444'
    },
    'carcassonne.html': {
      title: 'CARCASSONNE',
      sub: 'Companion',
      icon: '🏰',
      accent: '#eab308'
    },
    'skyteam.html': {
      title: 'SKY TEAM',
      sub: 'Рандомайзер',
      icon: '✈️',
      accent: '#0ea5e9',
      extra: { title: 'Писти', icon: '📋', run: function () { if (typeof window.openFlightLog === 'function') window.openFlightLog(); } }
    },
    'castles.html': {
      title: 'BURGUNDY',
      sub: 'Castles',
      icon: '🏯',
      accent: '#e11d48'
    },
    'spirit_island.html': {
      title: 'SPIRIT ISLAND',
      sub: 'Companion',
      icon: '🏝️',
      accent: '#14b8a6'
    }
  };

  function fileName() {
    try {
      var p = (location.pathname || '').split('/').pop() || '';
      return p.toLowerCase() || 'index.html';
    } catch (e) { return ''; }
  }

  function getMeta() {
    var key = fileName();
    if (APP_META[key]) return APP_META[key];
    /* Heat.html on some systems */
    if (key === 'heat.html' || /heat/i.test(key)) return APP_META['heat.html'];
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
  if (typeof window.currentLang === 'undefined') window.currentLang = getLang();
  else window.currentLang = getLang();

  function syncLangLabel() {
    var lang = getLang();
    window.currentLang = lang;
    var el = document.getElementById('bgt-lang-label');
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
  }

  function mountTop() {
    if (document.getElementById('bgt-top')) return;
    var meta = getMeta();
    document.documentElement.style.setProperty('--bgt-accent', meta.accent || '#22c55e');
    document.body.classList.add('bgt-has-top');

    var bar = document.createElement('header');
    bar.id = 'bgt-top';
    bar.setAttribute('role', 'banner');

    var extraBtn = '';
    if (meta.extra) {
      extraBtn = '<button type="button" class="bgt-top-btn extra" id="bgt-top-extra" title="' + (meta.extra.title || '') + '">' +
        (meta.extra.icon || '★') + '</button>';
    }

    bar.innerHTML =
      '<div class="bgt-top-nav">' +
        '<a class="bgt-top-btn home" href="./index.html" title="Начало">🏠</a>' +
        '<button type="button" class="bgt-top-btn back" id="bgt-top-back" title="Назад">←</button>' +
        '<a class="bgt-top-btn log" href="./index.html#log" title="Запис">📝</a>' +
        extraBtn +
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

    hideOldHeaders();
    /* second pass after app paints */
    setTimeout(hideOldHeaders, 50);
    setTimeout(hideOldHeaders, 300);
  }

  function mountBottom() {
    if (document.getElementById('bgt-chrome')) return;
    var old = document.getElementById('suite-chrome');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var lang = getLang();
    var isEn = lang === 'en';
    var bar = document.createElement('nav');
    bar.id = 'bgt-chrome';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Board Game Tracker');
    bar.innerHTML =
      '<a class="bgt-home" href="./index.html">🏠 <span data-i18n-bg="Начало" data-i18n-en="Home">' + (isEn ? 'Home' : 'Начало') + '</span></a>' +
      '<a class="bgt-apps" href="./index.html#companions">🎮 <span data-i18n-bg="Апове" data-i18n-en="Apps">' + (isEn ? 'Apps' : 'Апове') + '</span></a>' +
      '<a class="bgt-log" href="./index.html#log">📝 <span data-i18n-bg="Запис" data-i18n-en="Log">' + (isEn ? 'Log' : 'Запис') + '</span></a>' +
      '<button type="button" class="bgt-lang" id="bgt-lang-btn">🌐 <span id="bgt-lang-label">' + lang.toUpperCase() + '</span></button>';
    document.body.appendChild(bar);
    var langBtn = document.getElementById('bgt-lang-btn');
    if (langBtn) langBtn.addEventListener('click', function () { window.bgtToggleLanguage(); });
  }

  function boot() {
    mountTop();
    mountBottom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
