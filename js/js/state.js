/* Board Game Tracker 3.0 — local state */
(function () {
  const BGT = window.BGT || (window.BGT = {});

  function loadJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  BGT.state = {
    myGamesObj: loadJSON('myGamesObj', Object.assign({}, BGT.INITIAL_GAMES)),
    myPlayers: loadJSON('myPlayers', ['Нина', 'Митко']),
    gameLogs: loadJSON('gameLogs', []),
    /** per player ownership: { "Митко": { "Everdell": true, ... }, ... } */
    gameOwnership: loadJSON('bgGameOwnership', {}),
    inactiveGames: loadJSON('bgInactiveGames', []),
    activePlayer: localStorage.getItem('bgActivePlayer') || '',
    accountLinks: loadJSON('bgAccountLinks', {}),
    tables: loadJSON('bgTables', {}),
    activeTable: localStorage.getItem('bgActiveTable') || 'Основна',
    deletedLogIds: loadJSON('bgDeletedLogIds', []),
    theme: localStorage.getItem('bgTheme') || 'dark',
    homeH2H: localStorage.getItem('bgHomeH2H') === '1',
    currentLogFilter: 'pvp',
    randPlayers: 'all',
    randPriority: '0',
    interactiveDice: localStorage.getItem('bgInteractiveDice') !== '0',
    interactiveHero: localStorage.getItem('bgInteractiveHero') !== '0',
    showSplash: localStorage.getItem('bgShowSplash') !== '0'
  };

  BGT.persistLocal = function () {
    const s = BGT.state;
    saveJSON('myGamesObj', s.myGamesObj);
    saveJSON('myPlayers', s.myPlayers);
    saveJSON('gameLogs', s.gameLogs);
    saveJSON('bgGameOwnership', s.gameOwnership);
    saveJSON('bgInactiveGames', s.inactiveGames || []);
    saveJSON('bgAccountLinks', s.accountLinks);
    saveJSON('bgTables', s.tables);
    saveJSON('bgDeletedLogIds', s.deletedLogIds);
    if (s.activePlayer) localStorage.setItem('bgActivePlayer', s.activePlayer);
    else localStorage.removeItem('bgActivePlayer');
    if (s.activeTable) localStorage.setItem('bgActiveTable', s.activeTable);
    localStorage.setItem('bgTheme', s.theme);
    localStorage.setItem('bgHomeH2H', s.homeH2H ? '1' : '0');
    localStorage.setItem('bgInteractiveDice', s.interactiveDice ? '1' : '0');
    localStorage.setItem('bgInteractiveHero', s.interactiveHero ? '1' : '0');
    localStorage.setItem('bgShowSplash', s.showSplash ? '1' : '0');
  };

  BGT.ensureLogId = function (log) {
    if (log && log.id) return log.id;
    const key = (log.date || '') + '|' + (log.game || '') + '|' +
      (log.type === 'coop'
        ? ((log.participants || []).join(',') + '|' + (log.coopResult || ''))
        : JSON.stringify(log.scores || {}));
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return 'old_' + Math.abs(hash).toString(36);
  };

  BGT.mergeLogsById = function (a, b) {
    const map = new Map();
    (a || []).forEach(function (log) {
      const id = BGT.ensureLogId(log);
      map.set(id, Object.assign({}, log, { id: id }));
    });
    (b || []).forEach(function (log) {
      const id = BGT.ensureLogId(log);
      map.set(id, Object.assign({}, log, { id: id }));
    });
    return Array.from(map.values()).sort(function (x, y) {
      return new Date(y.date || 0) - new Date(x.date || 0);
    });
  };

  BGT.markLogDeleted = function (id) {
    if (!id) return;
    const arr = BGT.state.deletedLogIds || [];
    if (arr.indexOf(id) === -1) arr.push(id);
    BGT.state.deletedLogIds = arr.slice(-800);
    BGT.persistLocal();
  };

  BGT.getTableGroup = function () {
    const map = BGT.state.tables || {};
    const name = BGT.state.activeTable || 'Основна';
    if (map[name] && Array.isArray(map[name])) return map[name].filter(Boolean);
    return (BGT.state.myPlayers || []).slice();
  };

  BGT.setTableGroup = function (arr) {
    const clean = Array.from(new Set((arr || []).map(function (s) { return String(s).trim(); }).filter(Boolean)));
    const map = Object.assign({}, BGT.state.tables || {});
    const name = BGT.state.activeTable || 'Основна';
    map[name] = clean;
    BGT.state.tables = map;
    BGT.state.myPlayers = clean.slice();
    BGT.persistLocal();
  };

  BGT.isLoggedIn = function () {
    return !!(window.__bgtAuthUser || (typeof window.getAuthUser === 'function' && window.getAuthUser()));
  };

  BGT.getAdmins = function () {
    let a = window.__bgtAdmins;
    if (!a) {
      try { a = JSON.parse(localStorage.getItem('bgAdmins') || '{}'); } catch (e) { a = {}; }
    }
    return {
      uids: Array.isArray(a.uids) ? a.uids.slice() : [],
      emails: Array.isArray(a.emails) ? a.emails.map(function (e) { return String(e).toLowerCase(); }) : []
    };
  };

  BGT.isAdmin = function () {
    if (!BGT.isLoggedIn()) return false;
    const u = window.__bgtAuthUser || (typeof window.getAuthUser === 'function' ? window.getAuthUser() : null);
    if (!u) return false;
    const hard = (BGT.ADMIN_EMAILS || []).map(function (e) { return String(e).toLowerCase(); }).filter(Boolean);
    if (hard.length && u.email && hard.indexOf(String(u.email).toLowerCase()) !== -1) return true;
    const a = BGT.getAdmins();
    if (a.uids.indexOf(u.uid) !== -1) return true;
    if (u.email && a.emails.indexOf(String(u.email).toLowerCase()) !== -1) return true;
    return false;
  };

  BGT.claimAdminIfNone = function () {
    const hard = (BGT.ADMIN_EMAILS || []).filter(Boolean);
    if (hard.length) return false;
    const a = BGT.getAdmins();
    if (a.uids.length || a.emails.length) return false;
    const u = window.__bgtAuthUser || (typeof window.getAuthUser === 'function' ? window.getAuthUser() : null);
    if (!u) return false;
    const next = {
      uids: [u.uid],
      emails: u.email ? [String(u.email).toLowerCase()] : []
    };
    try { localStorage.setItem('bgAdmins', JSON.stringify(next)); } catch (e) {}
    window.__bgtAdmins = next;
    return true;
  };

  BGT.applyAdminUI = function () {
    const admin = BGT.isAdmin();
    document.body.classList.toggle('bgt-admin', admin);
    const badge = document.getElementById('authAdminBadge');
    if (badge) badge.style.display = admin ? 'inline-block' : 'none';
    const delBtn = document.getElementById('logSheetDelete');
    if (delBtn) delBtn.classList.toggle('hidden', !admin);
  };


  BGT.getMyLinkedPlayer = function () {
    if (!BGT.isLoggedIn()) return '';
    const user = window.__bgtAuthUser || (typeof window.getAuthUser === 'function' ? window.getAuthUser() : null);
    if (!user) return BGT.state.activePlayer || '';
    const links = BGT.state.accountLinks || {};
    if (links[user.uid]) return links[user.uid];
    const em = (user.email || '').toLowerCase();
    if (em && links['email:' + em]) return links['email:' + em];
    return BGT.state.activePlayer || '';
  };

  BGT.canViewStats = function () {
    return BGT.isLoggedIn() && !!BGT.getMyLinkedPlayer();
  };

  BGT.playerInLog = function (log, player) {
    if (!player || !log) return false;
    if (log.type === 'coop') return Array.isArray(log.participants) && log.participants.includes(player);
    return log.scores && Object.prototype.hasOwnProperty.call(log.scores, player);
  };

  BGT.getScopedLogs = function () {
    if (!BGT.isLoggedIn()) return [];
    const me = BGT.getMyLinkedPlayer();
    if (!me) return [];
    return (BGT.state.gameLogs || []).filter(function (l) { return BGT.playerInLog(l, me); });
  };

  BGT.getPvpScores = function (log) {
    return Object.entries(log.scores || {}).map(function (e) {
      return { player: e[0], score: Number(e[1]) };
    }).sort(function (a, b) { return b.score - a.score; });
  };

  BGT.getPvpWinners = function (log) {
    if (log.winners && log.winners.length) return log.winners;
    if (log.winner) return [log.winner];
    const scores = BGT.getPvpScores(log);
    if (!scores.length) return [];
    const top = scores[0].score;
    return scores.filter(function (x) { return x.score === top; }).map(function (x) { return x.player; });
  };

  BGT.esc = function (v) {
    return String(v ?? '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  BGT.toast = function (msg, type) {
    const host = document.getElementById('toastHost');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'info' ? ' toast-info' : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 280);
    }, 2600);
  };

  BGT.formatDate = function (d) {
    if (!d) return '–';
    const date = new Date(d);
    if (isNaN(date)) return BGT.esc(d);
    return date.toLocaleDateString('bg-BG');
  };
})();
