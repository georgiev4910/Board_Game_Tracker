/*! Board Game Tracker — companion chrome + shared lang (v2.6) */
(function () {
  var LANG_KEY = 'bgCompanionLang';

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'bg'; } catch (e) { return 'bg'; }
  }
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  }

  window.bgtGetLang = getLang;
  window.bgtSetLang = setLang;

  if (typeof window.currentLang === 'undefined') {
    window.currentLang = getLang();
  } else {
    window.currentLang = getLang();
  }

  if (typeof window.t !== 'function') {
    window.t = function (key) {
      var pack = (window.UI_TEXT && window.UI_TEXT[window.currentLang]) || {};
      var en = (window.UI_TEXT && window.UI_TEXT.en) || {};
      return pack[key] || en[key] || key;
    };
  }

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
    /* Prefer each app's own toggleLanguage so local `currentLang` stays in sync */
    var appToggle = window.toggleLanguage;
    if (typeof appToggle === 'function' && appToggle !== window.bgtToggleLanguage) {
      try {
        appToggle();
        syncLangLabel();
        return;
      } catch (e) {}
    }

    var next = (getLang() === 'bg') ? 'en' : 'bg';
    setLang(next);
    window.currentLang = next;
    syncLangLabel();
    document.querySelectorAll('[data-i18n-bg]').forEach(function (node) {
      var bg = node.getAttribute('data-i18n-bg');
      var en = node.getAttribute('data-i18n-en') || bg;
      node.textContent = next === 'en' ? en : bg;
    });
    if (typeof window.softRenderApp === 'function') {
      try { window.softRenderApp(); return; } catch (e) {}
    }
    if (typeof window.renderApp === 'function') {
      try { window.renderApp(); return; } catch (e) {}
    }
  };

  function mountChrome() {
    if (document.getElementById('bgt-chrome')) return;
    var old = document.getElementById('suite-chrome');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var bar = document.createElement('nav');
    bar.id = 'bgt-chrome';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Board Game Tracker');
    var lang = getLang();
    var isEn = lang === 'en';
    bar.innerHTML =
      '<a class="bgt-home" href="./index.html" title="Home / Начало">' +
        '🏠 <span data-i18n-bg="Начало" data-i18n-en="Home">' + (isEn ? 'Home' : 'Начало') + '</span></a>' +
      '<a class="bgt-apps" href="./index.html#companions" title="Companions / Апове">' +
        '🎮 <span data-i18n-bg="Апове" data-i18n-en="Apps">' + (isEn ? 'Apps' : 'Апове') + '</span></a>' +
      '<a class="bgt-log" href="./index.html#log" title="Log / Запис">' +
        '📝 <span data-i18n-bg="Запис" data-i18n-en="Log">' + (isEn ? 'Log' : 'Запис') + '</span></a>' +
      '<button type="button" class="bgt-lang" id="bgt-lang-btn" title="Language / Език">' +
        '🌐 <span id="bgt-lang-label">' + lang.toUpperCase() + '</span></button>';
    document.body.appendChild(bar);

    var langBtn = document.getElementById('bgt-lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        window.bgtToggleLanguage();
      });
    }

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n-bg]').forEach(function (node) {
      var bg = node.getAttribute('data-i18n-bg');
      var en = node.getAttribute('data-i18n-en') || bg;
      node.textContent = lang === 'en' ? en : bg;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})();
