/* Board Game Tracker 3.0 — UI + features */
(function () {
  const BGT = window.BGT;

  /* ---------- Navigation ---------- */
  BGT.go = function (id) {
    if (id === 'shelf') id = 'library';
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === 'screen-' + id);
    });
    document.querySelectorAll('.bottom-nav button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === id);
    });
    if (id === 'home') BGT.renderHome();
    if (id === 'log') BGT.renderLog();
    if (id === 'stats') BGT.renderStats();
    if (id === 'more') BGT.renderMore();
    if (id === 'random') BGT.renderRandom();
    if (id === 'library') BGT.renderLibrary();
    window.scrollTo(0, 0);
  };

  BGT.toggleAcc = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const open = el.classList.contains('open');
    document.querySelectorAll('.acc.open').forEach(function (a) { a.classList.remove('open'); });
    if (!open) el.classList.add('open');
  };

  BGT.isGameActive = function (name) {
    const inactive = BGT.state.inactiveGames || [];
    return inactive.indexOf(name) === -1;
  };
  BGT.getActiveGames = function () {
    return Object.keys(BGT.state.myGamesObj || {}).filter(BGT.isGameActive);
  };

  BGT.collectKnownPlayers = function () {
    const set = new Set();
    function add(p) {
      p = String(p || '').trim();
      if (p) set.add(p);
    }
    try { BGT.getTableGroup().forEach(add); } catch (e) {}
    (BGT.state.myPlayers || []).forEach(add);
    const tables = BGT.state.tables || {};
    Object.keys(tables).forEach(function (k) {
      (tables[k] || []).forEach(add);
    });
    (BGT.state.gameLogs || []).forEach(function (l) {
      if (!l) return;
      if (l.type === 'coop') (l.participants || []).forEach(add);
      else {
        Object.keys(l.scores || {}).forEach(add);
        (l.winners || []).forEach(add);
        if (l.winner) add(l.winner);
      }
    });
    /* names already linked on any account */
    const links = BGT.state.accountLinks || {};
    Object.keys(links).forEach(function (k) { add(links[k]); });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'bg'); });
  };




  /* ---------- Collection / ownership ---------- */
  BGT.getOwnership = function (player) {
    const map = BGT.state.gameOwnership || {};
    return map[player] || {};
  };
  BGT.ownsGame = function (player, game) {
    const o = BGT.getOwnership(player);
    if (Object.keys(o).length === 0) return true; /* default: all owned until customized */
    return !!o[game];
  };
  BGT.setOwnsGame = function (player, game, on) {
    if (!player || !game) return;
    BGT.state.gameOwnership = BGT.state.gameOwnership || {};
    BGT.state.gameOwnership[player] = BGT.state.gameOwnership[player] || {};
    if (on) BGT.state.gameOwnership[player][game] = true;
    else delete BGT.state.gameOwnership[player][game];
    /* if user toggles first time from "all default", seed other games as owned */
    BGT.persistLocal();
    if (typeof BGT.saveAll === 'function') BGT.saveAll();
  };
  BGT.initOwnershipIfEmpty = function (player) {
    BGT.state.gameOwnership = BGT.state.gameOwnership || {};
    if (BGT.state.gameOwnership[player] && Object.keys(BGT.state.gameOwnership[player]).length) return;
    const all = {};
    Object.keys(BGT.state.myGamesObj || {}).forEach(function (g) { all[g] = true; });
    BGT.state.gameOwnership[player] = all;
  };

  /* ---------- Home ---------- */
  BGT.setHomeMode = function (mode) {
    BGT.state.homeMode = mode || 'buttons';
    BGT.persistLocal();
    const h2h = document.getElementById('homeH2HSettings');
    if (h2h) h2h.classList.toggle('hidden', mode !== 'h2h');
    BGT.renderHome();
  };

  BGT.setHomeH2H = function () {
    const a = document.getElementById('homeH2HLeft');
    const b = document.getElementById('homeH2HRight');
    BGT.state.homeH2HLeft = a ? a.value : '';
    BGT.state.homeH2HRight = b ? b.value : '';
    BGT.persistLocal();
    BGT.renderHome();
  };

  BGT.collectHomePlayers = function () {
    if (typeof BGT.collectKnownPlayers === 'function') return BGT.collectKnownPlayers();
    return BGT.getTableGroup().slice();
  };

  BGT.renderHomeModeSettings = function () {
    const sel = document.getElementById('homeModeSelect');
    if (sel) sel.value = BGT.state.homeMode || 'buttons';
    const h2h = document.getElementById('homeH2HSettings');
    if (h2h) h2h.classList.toggle('hidden', (BGT.state.homeMode || 'buttons') !== 'h2h');
    const players = BGT.collectHomePlayers();
    const fill = function (id, cur) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = players.map(function (p) {
        return '<option value="' + BGT.esc(p) + '"' + (p === cur ? ' selected' : '') + '>' + BGT.esc(p) + '</option>';
      }).join('') || '<option value="">—</option>';
      if (cur) el.value = cur;
    };
    let left = BGT.state.homeH2HLeft || '';
    let right = BGT.state.homeH2HRight || '';
    const me = BGT.getMyLinkedPlayer();
    if (!left && me) left = me;
    if (!right && players.length) {
      right = players.find(function (p) { return p !== left; }) || players[0] || '';
    }
    fill('homeH2HLeft', left);
    fill('homeH2HRight', right);
  };

  BGT.renderHomeButtons = function () {
    return '<div class="grid-2" style="margin-bottom:12px">' +
      '<button type="button" class="action-tile" onclick="BGT.go(\'log\')"><img class="icon-lg" src="./icons/nav-log.svg" alt=""><span class="t">Запис</span><span class="d">Логни резултат</span></button>' +
      '<button type="button" class="action-tile" onclick="BGT.go(\'random\')"><img class="icon-lg" src="./icons/nav-dice.svg" alt=""><span class="t">Рандом</span><span class="d">Какво играем?</span></button>' +
      '<button type="button" class="action-tile" onclick="BGT.go(\'stats\')"><img class="icon-lg" src="./icons/nav-stats.svg" alt=""><span class="t">Статистика</span><span class="d">Победи и серии</span></button>' +
      '<button type="button" class="action-tile" onclick="BGT.go(\'library\')"><img class="icon-lg" src="./icons/nav-shelf.svg" alt=""><span class="t">Игри</span><span class="d">Библиотека</span></button>' +
      '</div>';
  };

  BGT.renderHomeH2H = function () {
    if (!BGT.canViewStats()) {
      return '<div class="panel"><div class="empty">Влез и свържи профил, за да видиш H2H.</div></div>';
    }
    const players = BGT.collectHomePlayers();
    let a = BGT.state.homeH2HLeft || BGT.getMyLinkedPlayer() || '';
    let b = BGT.state.homeH2HRight || '';
    if (!b) b = players.find(function (p) { return p !== a; }) || '';
    if (!a || !b || a === b) {
      return '<div class="panel"><div class="empty">Нужни са поне двама играчи на масата. Добави ги в Още → Масата. Двойката за H2H се избира в Още → Изглед.</div></div>';
    }
    let aw = 0, bw = 0, n = 0;
    (BGT.state.gameLogs || []).forEach(function (l) {
      if (l.type === 'coop') return;
      const keys = Object.keys(l.scores || {});
      if (keys.length === 2 && keys.indexOf(a) !== -1 && keys.indexOf(b) !== -1) {
        n++;
        const w = BGT.getPvpWinners(l);
        if (w.indexOf(a) !== -1 && w.indexOf(b) === -1) aw++;
        else if (w.indexOf(b) !== -1 && w.indexOf(a) === -1) bw++;
      }
    });
    const total = aw + bw;
    const pct = total ? Math.round(aw / total * 100) : 50;
    return '<div class="panel"><h3>Head-to-head</h3>' +
      '<div class="home-h2h">' +
      '<div><div class="name">' + BGT.esc(a) + '</div><div class="sub">' + aw + ' победи</div></div>' +
      '<div class="score">' + aw + '–' + bw + '</div>' +
      '<div><div class="name">' + BGT.esc(b) + '</div><div class="sub">' + bw + ' победи</div></div>' +
      '</div>' +
      '<div class="home-h2h-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="hint" style="margin-top:8px">' + n + ' директни 1v1 · смяна в Още → Изглед</div></div>';
  };

  BGT.renderHomeWinsTable = function () {
    if (!BGT.canViewStats()) {
      return '<div class="panel"><div class="empty">Влез за таблица с победи</div></div>';
    }
    const logs = BGT.state.gameLogs || [];
    if (!logs.length) return '<div class="panel"><div class="empty">Няма партии</div></div>';
    const players = BGT.collectHomePlayers();
    if (!players.length) return '<div class="panel"><div class="empty">Няма играчи</div></div>';
    const gamesMap = {};
    logs.forEach(function (l) {
      if (!l.game) return;
      if (!gamesMap[l.game]) {
        gamesMap[l.game] = {};
        players.forEach(function (p) { gamesMap[l.game][p] = 0; });
      }
      if (l.type === 'coop') {
        if (l.coopResult === 'win') {
          (l.participants || []).forEach(function (p) {
            if (gamesMap[l.game][p] != null) gamesMap[l.game][p]++;
          });
        }
      } else {
        BGT.getPvpWinners(l).forEach(function (p) {
          if (gamesMap[l.game][p] != null) gamesMap[l.game][p]++;
        });
      }
    });
    const games = Object.keys(gamesMap).sort(function (x, y) { return x.localeCompare(y, 'bg'); });
    let html = '<div class="panel"><h3>Победи по игри</h3><div style="overflow:auto"><table class="home-wins-table"><thead><tr><th>Игра</th>';
    players.forEach(function (p) { html += '<th>' + BGT.esc(p) + '</th>'; });
    html += '</tr></thead><tbody>';
    games.forEach(function (g) {
      const row = gamesMap[g];
      const vals = players.map(function (p) { return row[p] || 0; });
      const max = Math.max.apply(null, vals);
      const leaders = vals.filter(function (v) { return v === max && max > 0; }).length;
      const gSafe = String(g).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      html += '<tr><td><button type="button" class="game-stat-btn" onclick="BGT.openStatsGameDetail(\'' + gSafe + '\')">' + BGT.esc(g) + '</button></td>';
      players.forEach(function (p) {
        const v = row[p] || 0;
        let cls = '';
        if (max > 0 && v === max) cls = leaders > 1 ? 'tie' : 'lead';
        html += '<td class="' + cls + '">' + v + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="hint">Зелено = водач · жълто = равенство</div></div>';
    return html;
  };

  BGT.renderHome = function () {
    const me = BGT.getMyLinkedPlayer();
    const can = BGT.canViewStats();
    const guest = document.getElementById('homeGuest');
    const guestText = document.getElementById('homeGuestText');
    if (guest) {
      let show = false;
      let msg = '';
      if (!BGT.isLoggedIn()) {
        show = true;
        msg = 'Влез в акаунт, за да sync-ваш между устройства.';
      } else if (!me) {
        show = true;
        msg = 'Свържи „Аз съм“ в Още → Акаунт.';
      }
      /* празен архив при нов акаунт е нормално — без подкана за теглене */
      guest.classList.toggle('hidden', !show);
      if (guestText && msg) guestText.textContent = msg;
    }

    const hello = document.getElementById('homeHello');
    if (hello) {
      hello.textContent = me ? ('Здравей, ' + me + '!') : 'Board Game Realm';
    }
    const sub = document.getElementById('homeSub');
    if (sub) {
      sub.textContent = can
        ? 'Готов ли си за следващата партия?'
        : 'Влез в акаунт, за да записваш и виждаш статистики.';
    }

    const scoped = can ? BGT.getScopedLogs() : [];
    const set = function (id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set('homeStatGames', can ? new Set(scoped.map(function (l) { return l.game; })).size : '–');
    set('homeStatLogs', can ? scoped.length : '–');
    set('homeStatTable', BGT.getTableGroup().length || '–');

    const main = document.getElementById('homeMain');
    if (main) {
      const mode = BGT.state.homeMode || 'h2h';
      if (mode === 'table') main.innerHTML = BGT.renderHomeWinsTable();
      else if (mode === 'buttons') main.innerHTML = BGT.renderHomeButtons();
      else if (mode === 'suggest') main.innerHTML = BGT.renderHomeSuggest();
      else main.innerHTML = BGT.renderHomeH2H();
    }

    const lastBox = document.getElementById('homeLast');
    if (lastBox) {
      if (!can || !scoped.length) {
        lastBox.innerHTML = '<div class="empty">Няма записани партии още</div>';
      } else {
        const last = scoped[0];
        let meta = BGT.formatDate(last.date);
        if (last.type === 'coop') {
          meta += ' · ' + (last.coopResult === 'win' ? 'Успех' : 'Неуспех');
        } else {
          const w = BGT.getPvpWinners(last);
          if (w.length) meta += ' · 🏆 ' + w.join(', ');
        }
        lastBox.innerHTML =
          '<div class="list-row list-tap" onclick="BGT.openLogSheet(\'' + String(last.id || '').replace(/'/g, "\\'") + '\')"><div class="meta"><div class="title">' + BGT.esc(last.game) +
          '</div><div class="sub">' + BGT.esc(meta) + '</div></div><span class="chev">›</span></div>';
      }
    }

    BGT.renderProfileChip();
  };

  BGT.openMyStats = function () {
    if (!BGT.isLoggedIn()) {
      BGT.toast('Влез в акаунт от Още', 'info');
      return BGT.go('more');
    }
    if (!BGT.getMyLinkedPlayer()) {
      BGT.toast('Свържи „Аз съм“ в Още → Акаунт', 'info');
      return BGT.go('more');
    }
    BGT._statsPlayer = BGT.getMyLinkedPlayer();
    BGT.go('stats');
    if (typeof BGT.setStatsTab === 'function') BGT.setStatsTab('player');
  };

  BGT.renderProfileChip = function () {
    const chip = document.getElementById('profileChip');
    if (!chip) return;
    const me = BGT.getMyLinkedPlayer();
    if (me && BGT.isLoggedIn()) {
      chip.classList.add('show');
      chip.querySelector('.profile-avatar').textContent = me.charAt(0).toUpperCase();
      chip.querySelector('.profile-name').textContent = me;
    } else {
      chip.classList.remove('show');
    }
  };

  /* ---------- Log ---------- */
  BGT.onLogGameChange = function () {
    const box = document.getElementById('logExpansions');
    if (!box) return;
    const game = (document.getElementById('logGameSelect') || {}).value || '';
    if (!game) { box.innerHTML = ''; return; }
    const all = BGT.getAllExpansions(game);
    const owned = BGT.getOwnedExpansions(game);
    if (!all.length) {
      box.innerHTML = '<div class="hint">Няма въведени разширения за тази игра (редактирай от Игри → ✎).</div>';
      return;
    }
    box.innerHTML = '<div class="hint">Разширения (собственост): ' +
      all.map(function (e) {
        const has = owned.indexOf(e) !== -1;
        return '<span class="chip' + (has ? ' active' : '') + '" style="pointer-events:none">' + BGT.esc(e) + (has ? ' ✓' : '') + '</span>';
      }).join(' ') + '</div>';
  };
  BGT.renderLog = function () {
    const games = BGT.getActiveGames().sort(function (a, b) {
      return a.localeCompare(b, 'bg');
    });
    const sel = document.getElementById('logGameSelect');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = '<option value="">— Избери игра —</option>' +
        games.map(function (g) {
          const pr = BGT.getGamePlayerRange(g);
          const label = g + ' (' + pr[0] + '–' + pr[1] + 'p)';
          return '<option value="' + BGT.esc(g) + '"' + (g === cur ? ' selected' : '') + '>' + BGT.esc(label) + '</option>';
        }).join('');
      sel.onchange = BGT.onLogGameChange;
    }
    BGT.onLogGameChange();
    BGT.renderLogPlayers();
    const status = document.getElementById('logAccountStatus');
    if (status) {
      if (!BGT.isLoggedIn()) status.textContent = 'Влез в акаунт, за да запишеш.';
      else if (!BGT.getMyLinkedPlayer()) status.textContent = 'Свържи „Аз съм“ в Настройки.';
      else status.textContent = 'Маса: ' + (BGT.getTableGroup().join(', ') || '—');
    }
  };

  BGT.setLogMode = function (mode) {
    BGT.state.currentLogFilter = mode;
    document.querySelectorAll('[data-log-mode]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.logMode === mode);
    });
    const coop = document.getElementById('logCoopResult');
    if (coop) coop.classList.toggle('hidden', mode !== 'coop');
    BGT.renderLogPlayers();
  };

  BGT.renderLogPlayers = function () {
    const box = document.getElementById('logPlayers');
    if (!box) return;
    const table = BGT.getTableGroup();
    const mode = BGT.state.currentLogFilter;
    box.innerHTML = table.map(function (p) {
      const id = 'lp_' + encodeURIComponent(p).replace(/%/g, '_');
      return '<div class="player-card" id="card_' + id + '">' +
        '<input type="checkbox" data-player="' + BGT.esc(p) + '" onchange="BGT.toggleLogPlayer(this)">' +
        '<span class="name">' + BGT.esc(p) + '</span>' +
        (mode === 'pvp'
          ? '<input type="number" inputmode="numeric" placeholder="pts" disabled data-score-for="' + BGT.esc(p) + '">'
          : '') +
        '</div>';
    }).join('') || '<div class="empty">Добави играчи в Масата (меню Още)</div>';
  };


  BGT.getLastComposition = function () {
    try {
      const raw = localStorage.getItem('bgLastComposition');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    /* fallback: last log players */
    const last = (BGT.state.gameLogs || [])[0];
    if (!last) return [];
    if (last.type === 'coop') return last.participants || [];
    return Object.keys(last.scores || {});
  };
  BGT.saveLastComposition = function (players) {
    try { localStorage.setItem('bgLastComposition', JSON.stringify(players || [])); } catch (e) {}
  };
  BGT.applyLastComposition = function () {
    const players = BGT.getLastComposition();
    if (!players.length) return BGT.toast('Няма предишен състав', 'info');
    document.querySelectorAll('#logPlayers input[type=checkbox]').forEach(function (cb) {
      const on = players.indexOf(cb.dataset.player) !== -1;
      cb.checked = on;
      BGT.toggleLogPlayer(cb);
    });
    BGT.toast('Състав: ' + players.join(', '), 'info');
  };

  BGT.toggleLogPlayer = function (cb) {
    const card = cb.closest('.player-card');
    if (card) card.classList.toggle('selected', cb.checked);
    const score = card && card.querySelector('input[type=number]');
    if (score) score.disabled = !cb.checked;
  };

  BGT.submitLog = async function () {
    if (!BGT.isLoggedIn()) {
      BGT.toast('Влез в акаунт', 'info');
      BGT.go('more');
      return;
    }
    if (!BGT.getMyLinkedPlayer()) {
      BGT.toast('Свържи „Аз съм“ в Настройки', 'info');
      BGT.go('more');
      return;
    }
    const game = document.getElementById('logGameSelect').value;
    if (!game) return BGT.toast('Избери игра', 'info');
    const mode = BGT.state.currentLogFilter;
    const checked = Array.from(document.querySelectorAll('#logPlayers input[type=checkbox]:checked'));
    const dateEl = document.getElementById('logDate');
    const dateVal = dateEl && dateEl.value ? new Date(dateEl.value).toISOString() : new Date().toISOString();

    let entry;
    if (mode === 'coop') {
      if (!checked.length) return BGT.toast('Избери отбор', 'info');
      const res = document.querySelector('[data-coop-res].active');
      if (!res) return BGT.toast('Избери успех или неуспех', 'info');
      entry = {
        id: crypto.randomUUID(),
        game: game,
        type: 'coop',
        participants: checked.map(function (c) { return c.dataset.player; }),
        coopResult: res.dataset.coopRes,
        date: dateVal
      };
    } else {
      if (checked.length < 2) return BGT.toast('Избери поне 2 играчи', 'info');
      const scores = {};
      for (let i = 0; i < checked.length; i++) {
        const p = checked[i].dataset.player;
        const inp = document.querySelector('input[data-score-for="' + p.replace(/"/g, '\\"') + '"]');
        const v = inp ? Number(inp.value) : NaN;
        if (!Number.isFinite(v)) return BGT.toast('Попълни точките', 'info');
        scores[p] = v;
      }
      const sorted = Object.entries(scores).sort(function (a, b) { return b[1] - a[1]; });
      const top = sorted[0][1];
      const winners = sorted.filter(function (x) { return x[1] === top; }).map(function (x) { return x[0]; });
      entry = {
        id: crypto.randomUUID(),
        game: game,
        type: 'pvp',
        scores: scores,
        winners: winners,
        winner: winners[0],
        date: dateVal
      };
    }
    BGT.state.gameLogs = [entry].concat(BGT.state.gameLogs || []);
    const comp = entry.type === 'coop' ? (entry.participants || []) : Object.keys(entry.scores || {});
    BGT.saveLastComposition(comp);
    BGT.saveAll();
    BGT.toast('✓ Партията е записана!');
    BGT.renderLogPlayers();
    document.getElementById('logGameSelect').value = '';
    if (dateEl) dateEl.value = '';
    BGT.updateSyncPill('local');
  };

  /* ---------- Randomizer ---------- */
  BGT.getGamePlayerRange = function (name) {
    const custom = (BGT.state.gamePlayers || {})[name];
    if (Array.isArray(custom) && custom.length >= 2) return [Number(custom[0]) || 1, Number(custom[1]) || 6];
    const conf = (BGT.GAME_PLAYERS || {})[name];
    if (Array.isArray(conf) && conf.length >= 2) return [Number(conf[0]) || 1, Number(conf[1]) || 6];
    return [2, 6];
  };
  BGT.setGamePlayerRange = function (name, min, max) {
    let a = Math.max(1, Math.min(20, Number(min) || 1));
    let b = Math.max(1, Math.min(20, Number(max) || a));
    if (b < a) { const t = a; a = b; b = t; }
    BGT.state.gamePlayers = BGT.state.gamePlayers || {};
    BGT.state.gamePlayers[name] = [a, b];
  };
  BGT.gameSupportsPlayers = function (name, n) {
    if (n === 'all' || n == null) return true;
    const num = Number(n);
    const range = BGT.getGamePlayerRange(name);
    if (num >= 5) return range[1] >= 5;
    return num >= range[0] && num <= range[1];
  };
  BGT.isSoloCapable = function (name) {
    return BGT.getGamePlayerRange(name)[0] <= 1;
  };


  BGT.getCompanionForGame = function (gameName) {
    const list = BGT.COMPANIONS || [];
    if (!gameName || !list.length) return null;
    const n = String(gameName).toLowerCase().trim();
    const aliases = {
      'everdell': 'everdell',
      'heat': 'heat',
      'carcassonne': 'carcassonne',
      'каркасон': 'carcassonne',
      'sky team': 'skyteam',
      'skyteam': 'skyteam',
      'castles of burgundy': 'castles',
      'castles': 'castles',
      'spirit island': 'spirit',
      'спирит': 'spirit'
    };
    let id = null;
    Object.keys(aliases).forEach(function (k) {
      if (n === k || n.indexOf(k) !== -1) id = aliases[k];
    });
    if (!id) {
      for (let i = 0; i < list.length; i++) {
        if (n.indexOf(String(list[i].name).toLowerCase()) !== -1) return list[i];
      }
      return null;
    }
    return list.find(function (c) { return c.id === id; }) || null;
  };

  BGT.renderCompanionList = function () {
    const cbox = document.getElementById('companionList');
    if (!cbox) return;
    const list = BGT.COMPANIONS || [];
    if (!list.length) {
      cbox.innerHTML = '<div class="empty">Няма companion apps</div>';
      return;
    }
    cbox.innerHTML = list.map(function (c) {
      const icon = (c.icon || '').indexOf('./') === 0 ? c.icon : ('./' + (c.icon || '').replace(/^\//, ''));
      const file = (c.file || '').indexOf('./') === 0 ? c.file : ('./' + (c.file || '').replace(/^\//, ''));
      return '<a class="companion-card tone-' + BGT.esc(c.tone || '') + '" href="' + file + '" target="_blank" rel="noopener">' +
        '<img class="icon-lg" src="' + icon + '" alt="">' +
        '<div class="cn">' + BGT.esc(c.name) + '</div>' +
        '<div class="cd">Companion</div></a>';
    }).join('');
  };

  BGT.renderRandom = function () {
    /* chips state */
    document.querySelectorAll('[data-rand-pl]').forEach(function (b) {
      b.classList.toggle('active', String(b.dataset.randPl) === String(BGT.state.randPlayers));
    });
    document.querySelectorAll('[data-rand-pri]').forEach(function (b) {
      b.classList.toggle('active', String(b.dataset.randPri) === String(BGT.state.randPriority));
    });
  };

  BGT.rollGame = function (mode) {
    const me = BGT.getMyLinkedPlayer();
    let names = BGT.getActiveGames();
    /* filter by mode */
    if (mode === 'pvp' || mode === 'coop') {
      names = names.filter(function (g) { return BGT.state.myGamesObj[g] === mode; });
    }
    /* player count */
    names = names.filter(function (g) {
      return BGT.gameSupportsPlayers(g, BGT.state.randPlayers);
    });
    /* ownership — if linked player has ownership map, prefer owned */
    /* Рафтът вече не филтрира рандома — активните игри = какво може да падне */
    if (!names.length) {
      BGT.toast('Няма подходящи игри', 'info');
      return;
    }
    /* priority: less played more likely */
    let pick;
    if (String(BGT.state.randPriority) === '1') {
      const counts = {};
      names.forEach(function (g) { counts[g] = 0; });
      (BGT.getScopedLogs() || BGT.state.gameLogs || []).forEach(function (l) {
        if (counts[l.game] != null) counts[l.game]++;
      });
      const weights = names.map(function (g) {
        return { g: g, w: 1 / (1 + (counts[g] || 0)) };
      });
      const sum = weights.reduce(function (a, x) { return a + x.w; }, 0);
      let r = Math.random() * sum;
      pick = weights[0].g;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i].w;
        if (r <= 0) { pick = weights[i].g; break; }
      }
    } else {
      pick = names[Math.floor(Math.random() * names.length)];
    }
    const out = document.getElementById('randResult');
    if (!out) return;
    if (out.dataset.spinning === '1') return;
    out.dataset.spinning = '1';

    const pool = names.slice();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const companion = BGT.getCompanionForGame(pick);
    const pr = BGT.getGamePlayerRange(pick);
    const safePick = String(pick).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    function finalHtml(game) {
      const comp = BGT.getCompanionForGame(game);
      let extra = '';
      if (comp) {
        const file = (comp.file || '').indexOf('./') === 0 ? comp.file : ('./' + comp.file);
        extra = '<a class="btn btn-secondary" style="margin-top:8px;text-decoration:none;display:block;text-align:center" href="' +
          file + '" target="_blank" rel="noopener">Companion · ' + BGT.esc(comp.name) + '</a>';
      }
      return '<div class="panel rand-result-panel">' +
        '<div class="rand-burst" aria-hidden="true">✨</div>' +
        '<div class="hint" style="text-align:center">Падна се</div>' +
        '<div class="rand-final-name">' + BGT.esc(game) + '</div>' +
        '<div class="hint" style="text-align:center">' +
          ((BGT.state.myGamesObj[game] === 'coop') ? 'Co-op' : 'PvP') +
          ' · ' + pr[0] + '–' + pr[1] + ' играчи</div>' +
        '<button type="button" class="btn btn-primary" onclick="BGT.quickLog(\'' + safePick + '\')">Запиши резултат</button>' +
        extra +
        '</div>';
    }

    if (reduce) {
      out.innerHTML = finalHtml(pick);
      out.dataset.spinning = '0';
      return;
    }

    out.innerHTML =
      '<div class="panel rand-spin-stage">' +
      '<div class="rand-spin-label">Завъртане…</div>' +
      '<div class="rand-spin-window"><div class="rand-spin-name is-blur" id="randSpinName">—</div></div>' +
      '<div class="rand-spin-dots"><span></span><span></span><span></span></div>' +
      '</div>';

    const nameEl = document.getElementById('randSpinName');
    let ticks = 0;
    const totalTicks = 18 + Math.floor(Math.random() * 8);
    const spin = setInterval(function () {
      ticks++;
      if (nameEl) {
        const flash = pool[Math.floor(Math.random() * pool.length)];
        nameEl.textContent = flash;
        nameEl.classList.add('is-blur');
      }
      if (ticks >= totalTicks) {
        clearInterval(spin);
        if (nameEl) {
          nameEl.textContent = pick;
          nameEl.classList.remove('is-blur');
          nameEl.classList.add('is-land');
        }
        setTimeout(function () {
          out.innerHTML = finalHtml(pick);
          out.dataset.spinning = '0';
        }, 420);
      }
    }, 70);
  };

  BGT.quickLog = function (game) {
    BGT.go('log');
    setTimeout(function () {
      const sel = document.getElementById('logGameSelect');
      if (sel) {
        sel.value = game;
        const type = BGT.state.myGamesObj[game];
        if (type === 'coop') BGT.setLogMode('coop');
        else BGT.setLogMode('pvp');
      }
    }, 50);
  };

  /* Stats module: js/stats.js */

  /* ---------- Shelf (collection) ---------- */
  BGT.renderShelf = function () {
    /* Рафтът е опростен: една колекция = активните игри в Игри */
    BGT.go('library');
  };

  BGT.renderShelfList = function () {
    const player = (document.getElementById('shelfPlayer') || {}).value || BGT.getMyLinkedPlayer();
    const box = document.getElementById('shelfList');
    if (!box || !player) {
      if (box) box.innerHTML = '<div class="empty">Няма играчи</div>';
      return;
    }
    BGT.initOwnershipIfEmpty(player);
    const games = BGT.getActiveGames().sort(function (a, b) {
      return a.localeCompare(b, 'bg');
    });
    box.innerHTML = games.map(function (g) {
      const on = BGT.ownsGame(player, g);
      const type = BGT.state.myGamesObj[g];
      return '<div class="list-row">' +
        '<div class="meta"><div class="title">' + BGT.esc(g) + '</div>' +
        '<div class="sub">' + (type === 'coop' ? 'Co-op' : 'PvP') + '</div></div>' +
        '<button type="button" class="toggle' + (on ? ' on' : '') + '" title="Притежавам" ' +
        'onclick="BGT.toggleOwn(\'' + String(player).replace(/'/g, "\\'") + '\',\'' + String(g).replace(/'/g, "\\'") + '\', this)"></button>' +
        '</div>';
    }).join('');
  };

  BGT.toggleOwn = function (player, game, btn) {
    BGT.initOwnershipIfEmpty(player);
    const next = !BGT.ownsGame(player, game);
    BGT.setOwnsGame(player, game, next);
    if (btn) btn.classList.toggle('on', next);
    BGT.toast(next ? ('✓ ' + game + ' е в колекцията') : (game + ' е махната'), 'info');
  };

  /* ---------- More / settings ---------- */
  BGT.renderMore = function () {
    const user = window.__bgtAuthUser;
    const loginFields = document.getElementById('authLoginFields');
    const loggedIn = document.getElementById('authLoggedIn');
    const authBox = document.getElementById('authStatus');
    if (user) {
      if (loginFields) loginFields.classList.add('hidden');
      if (loggedIn) loggedIn.classList.remove('hidden');
      if (authBox) {
        authBox.innerHTML = '<div class="list-row"><div class="meta"><div class="title">' +
          BGT.esc(user.email || 'Акаунт') +
          (BGT.isAdmin() ? ' <span class="admin-badge">ADMIN</span>' : '') +
          '</div><div class="sub">Аз съм: ' +
          BGT.esc(BGT.getMyLinkedPlayer() || '— не е свързано') +
          '</div></div></div>' +
          '<button type="button" class="btn btn-danger" style="margin-top:10px" onclick="BGT.doLogout()">Изход от акаунта</button>';
      }
    } else {
      if (loginFields) loginFields.classList.remove('hidden');
      if (loggedIn) loggedIn.classList.add('hidden');
      if (authBox) authBox.innerHTML = '<div class="empty">Не си влязъл — въведи email и парола</div>';
    }

    const linkSel = document.getElementById('linkPlayerSelect');
    if (linkSel) {
      const players = (typeof BGT.collectKnownPlayers === 'function') ? BGT.collectKnownPlayers() : [];
      const me = BGT.getMyLinkedPlayer();
      if (!players.length) {
        linkSel.innerHTML = '<option value="">— Няма играчи в архива —</option>';
      } else {
        linkSel.innerHTML = '<option value="">— Избери съществуващ —</option>' +
          players.map(function (p) {
            return '<option value="' + BGT.esc(p) + '"' + (p === me ? ' selected' : '') + '>' + BGT.esc(p) + '</option>';
          }).join('');
      }
      const hint = document.getElementById('linkPlayersHint');
      if (hint) {
        hint.textContent = players.length
          ? ('Намерени ' + players.length + ' играчи от архива/масата')
          : 'Архивът още се зарежда или е празен — изчакай 1–2 сек или създай нов играч по-долу.';
      }
    }

    const tableList = document.getElementById('tableList');
    if (tableList) {
      const tg = BGT.getTableGroup();
      tableList.innerHTML = tg.map(function (p) {
        const rm = BGT.isAdmin()
          ? '<button class="btn btn-secondary" style="width:auto;min-height:36px;padding:0 10px" onclick="BGT.removeFromTable(\'' + String(p).replace(/'/g, "\\'") + '\')">✕</button>'
          : '';
        return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(p) +
          '</div></div>' + rm + '</div>';
      }).join('') || '<div class="empty">Масата е празна</div>';
    }

    /* prefs toggles */
    [['togDice', 'interactiveDice'], ['togHero', 'interactiveHero'], ['togSplash', 'showSplash']].forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (el) el.classList.toggle('on', !!BGT.state[pair[1]]);
    });
    BGT.applyInteractivePrefs();

    BGT.renderCompanionList();
    BGT.renderProfileChip();
    BGT.applyAdminUI();
    BGT.renderHomeModeSettings();
  };

  BGT.togglePref = function (key, btn) {
    BGT.state[key] = !BGT.state[key];
    BGT.persistLocal();
    if (btn) btn.classList.toggle('on', !!BGT.state[key]);
    BGT.applyInteractivePrefs();
    BGT.toast(BGT.state[key] ? 'Включено' : 'Изключено', 'info');
  };

  BGT.applyInteractivePrefs = function () {
    const die = document.getElementById('diceLogo');
    if (die) {
      die.style.pointerEvents = BGT.state.interactiveDice ? '' : 'none';
      die.style.opacity = BGT.state.interactiveDice ? '' : '0.55';
    }
    const stage = document.getElementById('heroStage');
    if (stage) {
      stage.style.pointerEvents = BGT.state.interactiveHero ? '' : 'none';
      stage.classList.toggle('hero-locked', !BGT.state.interactiveHero);
    }
  };

  let _newGameType = 'pvp';
  BGT.setNewGameType = function (t) {
    _newGameType = t;
    document.querySelectorAll('[data-new-game-type]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.newGameType === t);
    });
  };
  BGT.addGame = function () {
    const inp = document.getElementById('newGameName');
    const name = (inp && inp.value || '').trim();
    if (!name) return BGT.toast('Въведи име', 'info');
    const minEl = document.getElementById('newGameMin');
    const maxEl = document.getElementById('newGameMax');
    const min = minEl ? Number(minEl.value) : 2;
    const max = maxEl ? Number(maxEl.value) : 4;
    BGT.state.myGamesObj = BGT.state.myGamesObj || {};
    BGT.state.myGamesObj[name] = _newGameType || 'pvp';
    BGT.setGamePlayerRange(name, min, max);
    BGT.state.inactiveGames = (BGT.state.inactiveGames || []).filter(function (g) { return g !== name; });
    BGT.saveAll();
    if (inp) inp.value = '';
    BGT.toast('В библиотеката: ' + name + ' (' + BGT.getGamePlayerRange(name).join('–') + ' играчи)');
    BGT.renderLibrary();
  };
  BGT.activateGame = function (name, type) {
    BGT.state.myGamesObj = BGT.state.myGamesObj || {};
    if (!BGT.state.myGamesObj[name]) BGT.state.myGamesObj[name] = type || 'pvp';
    if (!(BGT.state.gamePlayers || {})[name]) {
      const conf = (BGT.GAME_PLAYERS || {})[name] || [2, 4];
      BGT.setGamePlayerRange(name, conf[0], conf[1]);
    }
    BGT.state.inactiveGames = (BGT.state.inactiveGames || []).filter(function (g) { return g !== name; });
    BGT.saveAll();
    BGT.toast('Активна: ' + name);
    BGT.renderLibrary();
  };
  BGT.deactivateGame = function (name) {
    if (!BGT.isAdmin()) return BGT.toast('Само админ може да изключва игри', 'info');
    BGT.state.inactiveGames = BGT.state.inactiveGames || [];
    if (BGT.state.inactiveGames.indexOf(name) === -1) BGT.state.inactiveGames.push(name);
    BGT.saveAll();
    BGT.toast('Деактивирана: ' + name, 'info');
    BGT.renderLibrary();
  };
  BGT.toggleGameType = function (name) {
    const cur = BGT.state.myGamesObj[name];
    BGT.state.myGamesObj[name] = cur === 'coop' ? 'pvp' : 'coop';
    BGT.saveAll();
    BGT.renderLibrary();
  };
  let _libFilter = 'active';
  BGT.setLibFilter = function (f) {
    _libFilter = f;
    document.querySelectorAll('[data-lib-filter]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.libFilter === f);
    });
    BGT.renderLibrary();
  };

  BGT.escAttr = function (s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  };


  BGT.getOwnedExpansions = function (game) {
    const map = (BGT.state.gameExpansions || {})[game] || {};
    return Object.keys(map).filter(function (k) { return !!map[k]; }).sort(function (a, b) {
      return a.localeCompare(b, 'bg');
    });
  };
  BGT.getAllExpansions = function (game) {
    const map = (BGT.state.gameExpansions || {})[game] || {};
    return Object.keys(map).sort(function (a, b) { return a.localeCompare(b, 'bg'); });
  };

  let _editGameName = null;
  let _editGameType = 'pvp';
  BGT.openGameEdit = function (name) {
    _editGameName = name;
    _editGameType = (BGT.state.myGamesObj || {})[name] || 'pvp';
    const title = document.getElementById('gameEditTitle');
    if (title) title.textContent = name;
    const range = BGT.getGamePlayerRange(name);
    const minEl = document.getElementById('editGameMin');
    const maxEl = document.getElementById('editGameMax');
    if (minEl) minEl.value = range[0];
    if (maxEl) maxEl.value = range[1];
    document.getElementById('editTypePvp') && document.getElementById('editTypePvp').classList.toggle('active', _editGameType === 'pvp');
    document.getElementById('editTypeCoop') && document.getElementById('editTypeCoop').classList.toggle('active', _editGameType === 'coop');
    BGT.renderEditExpList();
    const sheet = document.getElementById('gameEditSheet');
    if (sheet) { sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); }
  };
  BGT.closeGameEdit = function () {
    const sheet = document.getElementById('gameEditSheet');
    if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
    _editGameName = null;
  };
  BGT.setEditGameType = function (t) {
    _editGameType = t;
    document.getElementById('editTypePvp') && document.getElementById('editTypePvp').classList.toggle('active', t === 'pvp');
    document.getElementById('editTypeCoop') && document.getElementById('editTypeCoop').classList.toggle('active', t === 'coop');
  };
  BGT.renderEditExpList = function () {
    const box = document.getElementById('editExpList');
    if (!box || !_editGameName) return;
    const map = (BGT.state.gameExpansions || {})[_editGameName] || {};
    const keys = Object.keys(map).sort(function (a, b) { return a.localeCompare(b, 'bg'); });
    if (!keys.length) {
      box.innerHTML = '<div class="empty">Няма въведени разширения</div>';
      return;
    }
    box.innerHTML = keys.map(function (exp) {
      const on = !!map[exp];
      const ea = String(exp).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(exp) + '</div></div>' +
        '<button type="button" class="toggle' + (on ? ' on' : '') + '" onclick="BGT.toggleEditExpansion(\'' + ea + '\', this)"></button></div>';
    }).join('');
  };
  BGT.toggleEditExpansion = function (exp, btn) {
    if (!_editGameName) return;
    BGT.state.gameExpansions = BGT.state.gameExpansions || {};
    BGT.state.gameExpansions[_editGameName] = BGT.state.gameExpansions[_editGameName] || {};
    const cur = !!BGT.state.gameExpansions[_editGameName][exp];
    BGT.state.gameExpansions[_editGameName][exp] = !cur;
    if (btn) btn.classList.toggle('on', !cur);
  };
  BGT.addEditExpansion = function () {
    if (!_editGameName) return;
    const inp = document.getElementById('editExpNew');
    const name = (inp && inp.value || '').trim();
    if (!name) return;
    BGT.state.gameExpansions = BGT.state.gameExpansions || {};
    BGT.state.gameExpansions[_editGameName] = BGT.state.gameExpansions[_editGameName] || {};
    BGT.state.gameExpansions[_editGameName][name] = true;
    if (inp) inp.value = '';
    BGT.renderEditExpList();
  };
  BGT.saveGameEdit = function () {
    if (!_editGameName) return;
    const min = document.getElementById('editGameMin');
    const max = document.getElementById('editGameMax');
    BGT.setGamePlayerRange(_editGameName, min && min.value, max && max.value);
    BGT.state.myGamesObj = BGT.state.myGamesObj || {};
    BGT.state.myGamesObj[_editGameName] = _editGameType;
    BGT.saveAll();
    BGT.toast('Запазено: ' + _editGameName + ' (' + BGT.getGamePlayerRange(_editGameName).join('–') + 'p)');
    BGT.closeGameEdit();
    BGT.renderLibrary();
  };

  BGT.renderLibrary = function () {
    const box = document.getElementById('libraryList');
    if (!box) return;
    const q = ((document.getElementById('libSearch') || {}).value || '').trim().toLowerCase();
    const catalog = Object.assign({}, BGT.CATALOG_GAMES || {}, BGT.state.myGamesObj || {});
    let names = Object.keys(catalog).sort(function (a, b) { return a.localeCompare(b, 'bg'); });
    if (q) names = names.filter(function (n) { return n.toLowerCase().indexOf(q) !== -1; });
    if (_libFilter === 'active') {
      names = names.filter(function (n) { return BGT.state.myGamesObj[n] && BGT.isGameActive(n); });
    } else if (_libFilter === 'inactive') {
      names = names.filter(function (n) { return BGT.state.myGamesObj[n] && !BGT.isGameActive(n); });
    } else if (_libFilter === 'catalog') {
      names = names.filter(function (n) { return !BGT.state.myGamesObj[n]; });
    }
    box.innerHTML = names.map(function (g) {
      const inLib = !!BGT.state.myGamesObj[g];
      const active = inLib && BGT.isGameActive(g);
      const type = BGT.state.myGamesObj[g] || catalog[g] || 'pvp';
      const ga = BGT.escAttr(g);
      let actions = '';
      if (!inLib) {
        actions += '<button type="button" class="btn btn-primary btn-xs" onclick="BGT.activateGame(\'' + ga + '\',\'' + type + '\')">Добави</button>';
      } else if (active) {
        actions += '<button type="button" class="btn btn-secondary btn-xs" onclick="BGT.openGameEdit(\'' + ga + '\')">✎</button>';
        if (BGT.isAdmin()) {
          actions += '<button type="button" class="btn btn-secondary btn-xs" onclick="BGT.deactivateGame(\'' + ga + '\')">Изкл.</button>';
        }
      } else if (BGT.isAdmin()) {
        actions += '<button type="button" class="btn btn-primary btn-xs" onclick="BGT.activateGame(\'' + ga + '\')">Вкл.</button>';
      }
      const pr = BGT.getGamePlayerRange(g);
      const exps = BGT.getOwnedExpansions(g);
      let sub = (type === 'coop' ? 'Co-op' : 'PvP') + ' · ' + pr[0] + '–' + pr[1] + 'p' +
        (pr[0] <= 1 ? ' · соло' : '') +
        (active ? '' : (inLib ? ' · изключена' : ' · каталог'));
      if (exps.length) sub += ' · ' + exps.join(', ');
      return '<div class="list-row' + (active || !inLib ? '' : ' dim') + '"><div class="meta"><div class="title">' +
        BGT.esc(g) + '</div><div class="sub">' + BGT.esc(sub) + '</div></div>' + actions + '</div>';
    }).join('') || '<div class="empty">Няма игри в този филтър</div>';
  };


  BGT.setLogMode = function (mode) {
    BGT.state.currentLogFilter = mode;
    document.querySelectorAll('[data-log-mode]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.logMode === mode);
    });
    const coop = document.getElementById('logCoopResult');
    if (coop) coop.classList.toggle('hidden', mode !== 'coop');
    BGT.renderLogPlayers();
  };

  BGT.renderLogPlayers = function () {
    const box = document.getElementById('logPlayers');
    if (!box) return;
    const table = BGT.getTableGroup();
    const mode = BGT.state.currentLogFilter;
    box.innerHTML = table.map(function (p) {
      const id = 'lp_' + encodeURIComponent(p).replace(/%/g, '_');
      return '<div class="player-card" id="card_' + id + '">' +
        '<input type="checkbox" data-player="' + BGT.esc(p) + '" onchange="BGT.toggleLogPlayer(this)">' +
        '<span class="name">' + BGT.esc(p) + '</span>' +
        (mode === 'pvp'
          ? '<input type="number" inputmode="numeric" placeholder="pts" disabled data-score-for="' + BGT.esc(p) + '">'
          : '') +
        '</div>';
    }).join('') || '<div class="empty">Добави играчи в Масата (меню Още)</div>';
  };


  BGT.getLastComposition = function () {
    try {
      const raw = localStorage.getItem('bgLastComposition');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    /* fallback: last log players */
    const last = (BGT.state.gameLogs || [])[0];
    if (!last) return [];
    if (last.type === 'coop') return last.participants || [];
    return Object.keys(last.scores || {});
  };
  BGT.saveLastComposition = function (players) {
    try { localStorage.setItem('bgLastComposition', JSON.stringify(players || [])); } catch (e) {}
  };
  BGT.applyLastComposition = function () {
    const players = BGT.getLastComposition();
    if (!players.length) return BGT.toast('Няма предишен състав', 'info');
    document.querySelectorAll('#logPlayers input[type=checkbox]').forEach(function (cb) {
      const on = players.indexOf(cb.dataset.player) !== -1;
      cb.checked = on;
      BGT.toggleLogPlayer(cb);
    });
    BGT.toast('Състав: ' + players.join(', '), 'info');
  };

  BGT.toggleLogPlayer = function (cb) {
    const card = cb.closest('.player-card');
    if (card) card.classList.toggle('selected', cb.checked);
    const score = card && card.querySelector('input[type=number]');
    if (score) score.disabled = !cb.checked;
  };

  BGT.submitLog = async function () {
    if (!BGT.isLoggedIn()) {
      BGT.toast('Влез в акаунт', 'info');
      BGT.go('more');
      return;
    }
    if (!BGT.getMyLinkedPlayer()) {
      BGT.toast('Свържи „Аз съм“ в Настройки', 'info');
      BGT.go('more');
      return;
    }
    const game = document.getElementById('logGameSelect').value;
    if (!game) return BGT.toast('Избери игра', 'info');
    const mode = BGT.state.currentLogFilter;
    const checked = Array.from(document.querySelectorAll('#logPlayers input[type=checkbox]:checked'));
    const dateEl = document.getElementById('logDate');
    const dateVal = dateEl && dateEl.value ? new Date(dateEl.value).toISOString() : new Date().toISOString();

    let entry;
    if (mode === 'coop') {
      if (!checked.length) return BGT.toast('Избери отбор', 'info');
      const res = document.querySelector('[data-coop-res].active');
      if (!res) return BGT.toast('Избери успех или неуспех', 'info');
      entry = {
        id: crypto.randomUUID(),
        game: game,
        type: 'coop',
        participants: checked.map(function (c) { return c.dataset.player; }),
        coopResult: res.dataset.coopRes,
        date: dateVal
      };
    } else {
      if (checked.length < 2) return BGT.toast('Избери поне 2 играчи', 'info');
      const scores = {};
      for (let i = 0; i < checked.length; i++) {
        const p = checked[i].dataset.player;
        const inp = document.querySelector('input[data-score-for="' + p.replace(/"/g, '\\"') + '"]');
        const v = inp ? Number(inp.value) : NaN;
        if (!Number.isFinite(v)) return BGT.toast('Попълни точките', 'info');
        scores[p] = v;
      }
      const sorted = Object.entries(scores).sort(function (a, b) { return b[1] - a[1]; });
      const top = sorted[0][1];
      const winners = sorted.filter(function (x) { return x[1] === top; }).map(function (x) { return x[0]; });
      entry = {
        id: crypto.randomUUID(),
        game: game,
        type: 'pvp',
        scores: scores,
        winners: winners,
        winner: winners[0],
        date: dateVal
      };
    }
    BGT.state.gameLogs = [entry].concat(BGT.state.gameLogs || []);
    const comp = entry.type === 'coop' ? (entry.participants || []) : Object.keys(entry.scores || {});
    BGT.saveLastComposition(comp);
    BGT.saveAll();
    BGT.toast('✓ Партията е записана!');
    BGT.renderLogPlayers();
    document.getElementById('logGameSelect').value = '';
    if (dateEl) dateEl.value = '';
    BGT.updateSyncPill('local');
  };

  /* ---------- Randomizer ---------- */
  BGT.getGamePlayerRange = function (name) {
    const custom = (BGT.state.gamePlayers || {})[name];
    if (Array.isArray(custom) && custom.length >= 2) return [Number(custom[0]) || 1, Number(custom[1]) || 6];
    const conf = (BGT.GAME_PLAYERS || {})[name];
    if (Array.isArray(conf) && conf.length >= 2) return [Number(conf[0]) || 1, Number(conf[1]) || 6];
    return [2, 6];
  };
  BGT.setGamePlayerRange = function (name, min, max) {
    let a = Math.max(1, Math.min(20, Number(min) || 1));
    let b = Math.max(1, Math.min(20, Number(max) || a));
    if (b < a) { const t = a; a = b; b = t; }
    BGT.state.gamePlayers = BGT.state.gamePlayers || {};
    BGT.state.gamePlayers[name] = [a, b];
  };
  BGT.gameSupportsPlayers = function (name, n) {
    if (n === 'all' || n == null) return true;
    const num = Number(n);
    const range = BGT.getGamePlayerRange(name);
    if (num >= 5) return range[1] >= 5;
    return num >= range[0] && num <= range[1];
  };
  BGT.isSoloCapable = function (name) {
    return BGT.getGamePlayerRange(name)[0] <= 1;
  };


  BGT.getCompanionForGame = function (gameName) {
    const list = BGT.COMPANIONS || [];
    if (!gameName || !list.length) return null;
    const n = String(gameName).toLowerCase().trim();
    const aliases = {
      'everdell': 'everdell',
      'heat': 'heat',
      'carcassonne': 'carcassonne',
      'каркасон': 'carcassonne',
      'sky team': 'skyteam',
      'skyteam': 'skyteam',
      'castles of burgundy': 'castles',
      'castles': 'castles',
      'spirit island': 'spirit',
      'спирит': 'spirit'
    };
    let id = null;
    Object.keys(aliases).forEach(function (k) {
      if (n === k || n.indexOf(k) !== -1) id = aliases[k];
    });
    if (!id) {
      for (let i = 0; i < list.length; i++) {
        if (n.indexOf(String(list[i].name).toLowerCase()) !== -1) return list[i];
      }
      return null;
    }
    return list.find(function (c) { return c.id === id; }) || null;
  };

  BGT.renderCompanionList = function () {
    const cbox = document.getElementById('companionList');
    if (!cbox) return;
    const list = BGT.COMPANIONS || [];
    if (!list.length) {
      cbox.innerHTML = '<div class="empty">Няма companion apps</div>';
      return;
    }
    cbox.innerHTML = list.map(function (c) {
      const icon = (c.icon || '').indexOf('./') === 0 ? c.icon : ('./' + (c.icon || '').replace(/^\//, ''));
      const file = (c.file || '').indexOf('./') === 0 ? c.file : ('./' + (c.file || '').replace(/^\//, ''));
      return '<a class="companion-card tone-' + BGT.esc(c.tone || '') + '" href="' + file + '" target="_blank" rel="noopener">' +
        '<img class="icon-lg" src="' + icon + '" alt="">' +
        '<div class="cn">' + BGT.esc(c.name) + '</div>' +
        '<div class="cd">Companion</div></a>';
    }).join('');
  };

  BGT.renderRandom = function () {
    /* chips state */
    document.querySelectorAll('[data-rand-pl]').forEach(function (b) {
      b.classList.toggle('active', String(b.dataset.randPl) === String(BGT.state.randPlayers));
    });
    document.querySelectorAll('[data-rand-pri]').forEach(function (b) {
      b.classList.toggle('active', String(b.dataset.randPri) === String(BGT.state.randPriority));
    });
  };

  BGT.rollGame = function (mode) {
    const me = BGT.getMyLinkedPlayer();
    let names = BGT.getActiveGames();
    /* filter by mode */
    if (mode === 'pvp' || mode === 'coop') {
      names = names.filter(function (g) { return BGT.state.myGamesObj[g] === mode; });
    }
    /* player count */
    names = names.filter(function (g) {
      return BGT.gameSupportsPlayers(g, BGT.state.randPlayers);
    });
    /* ownership — if linked player has ownership map, prefer owned */
    /* Рафтът вече не филтрира рандома — активните игри = какво може да падне */
    if (!names.length) {
      BGT.toast('Няма подходящи игри', 'info');
      return;
    }
    /* priority: less played more likely */
    let pick;
    if (String(BGT.state.randPriority) === '1') {
      const counts = {};
      names.forEach(function (g) { counts[g] = 0; });
      (BGT.getScopedLogs() || BGT.state.gameLogs || []).forEach(function (l) {
        if (counts[l.game] != null) counts[l.game]++;
      });
      const weights = names.map(function (g) {
        return { g: g, w: 1 / (1 + (counts[g] || 0)) };
      });
      const sum = weights.reduce(function (a, x) { return a + x.w; }, 0);
      let r = Math.random() * sum;
      pick = weights[0].g;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i].w;
        if (r <= 0) { pick = weights[i].g; break; }
      }
    } else {
      pick = names[Math.floor(Math.random() * names.length)];
    }
    const out = document.getElementById('randResult');
    if (!out) return;
    if (out.dataset.spinning === '1') return;
    out.dataset.spinning = '1';

    const pool = names.slice();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const companion = BGT.getCompanionForGame(pick);
    const pr = BGT.getGamePlayerRange(pick);
    const safePick = String(pick).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    function finalHtml(game) {
      const comp = BGT.getCompanionForGame(game);
      let extra = '';
      if (comp) {
        const file = (comp.file || '').indexOf('./') === 0 ? comp.file : ('./' + comp.file);
        extra = '<a class="btn btn-secondary" style="margin-top:8px;text-decoration:none;display:block;text-align:center" href="' +
          file + '" target="_blank" rel="noopener">Companion · ' + BGT.esc(comp.name) + '</a>';
      }
      return '<div class="panel rand-result-panel">' +
        '<div class="rand-burst" aria-hidden="true">✨</div>' +
        '<div class="hint" style="text-align:center">Падна се</div>' +
        '<div class="rand-final-name">' + BGT.esc(game) + '</div>' +
        '<div class="hint" style="text-align:center">' +
          ((BGT.state.myGamesObj[game] === 'coop') ? 'Co-op' : 'PvP') +
          ' · ' + pr[0] + '–' + pr[1] + ' играчи</div>' +
        '<button type="button" class="btn btn-primary" onclick="BGT.quickLog(\'' + safePick + '\')">Запиши резултат</button>' +
        extra +
        '</div>';
    }

    if (reduce) {
      out.innerHTML = finalHtml(pick);
      out.dataset.spinning = '0';
      return;
    }

    out.innerHTML =
      '<div class="panel rand-spin-stage">' +
      '<div class="rand-spin-label">Завъртане…</div>' +
      '<div class="rand-spin-window"><div class="rand-spin-name is-blur" id="randSpinName">—</div></div>' +
      '<div class="rand-spin-dots"><span></span><span></span><span></span></div>' +
      '</div>';

    const nameEl = document.getElementById('randSpinName');
    let ticks = 0;
    const totalTicks = 18 + Math.floor(Math.random() * 8);
    const spin = setInterval(function () {
      ticks++;
      if (nameEl) {
        const flash = pool[Math.floor(Math.random() * pool.length)];
        nameEl.textContent = flash;
        nameEl.classList.add('is-blur');
      }
      if (ticks >= totalTicks) {
        clearInterval(spin);
        if (nameEl) {
          nameEl.textContent = pick;
          nameEl.classList.remove('is-blur');
          nameEl.classList.add('is-land');
        }
        setTimeout(function () {
          out.innerHTML = finalHtml(pick);
          out.dataset.spinning = '0';
        }, 420);
      }
    }, 70);
  };

  BGT.quickLog = function (game) {
    BGT.go('log');
    setTimeout(function () {
      const sel = document.getElementById('logGameSelect');
      if (sel) {
        sel.value = game;
        const type = BGT.state.myGamesObj[game];
        if (type === 'coop') BGT.setLogMode('coop');
        else BGT.setLogMode('pvp');
      }
    }, 50);
  };

  /* Stats module: js/stats.js */

  /* ---------- Shelf (collection) ---------- */
  BGT.renderShelf = function () {
    /* Рафтът е опростен: една колекция = активните игри в Игри */
    BGT.go('library');
  };

  BGT.renderShelfList = function () {
    const player = (document.getElementById('shelfPlayer') || {}).value || BGT.getMyLinkedPlayer();
    const box = document.getElementById('shelfList');
    if (!box || !player) {
      if (box) box.innerHTML = '<div class="empty">Няма играчи</div>';
      return;
    }
    BGT.initOwnershipIfEmpty(player);
    const games = BGT.getActiveGames().sort(function (a, b) {
      return a.localeCompare(b, 'bg');
    });
    box.innerHTML = games.map(function (g) {
      const on = BGT.ownsGame(player, g);
      const type = BGT.state.myGamesObj[g];
      return '<div class="list-row">' +
        '<div class="meta"><div class="title">' + BGT.esc(g) + '</div>' +
        '<div class="sub">' + (type === 'coop' ? 'Co-op' : 'PvP') + '</div></div>' +
        '<button type="button" class="toggle' + (on ? ' on' : '') + '" title="Притежавам" ' +
        'onclick="BGT.toggleOwn(\'' + String(player).replace(/'/g, "\\'") + '\',\'' + String(g).replace(/'/g, "\\'") + '\', this)"></button>' +
        '</div>';
    }).join('');
  };

  BGT.toggleOwn = function (player, game, btn) {
    BGT.initOwnershipIfEmpty(player);
    const next = !BGT.ownsGame(player, game);
    BGT.setOwnsGame(player, game, next);
    if (btn) btn.classList.toggle('on', next);
    BGT.toast(next ? ('✓ ' + game + ' е в колекцията') : (game + ' е махната'), 'info');
  };

  /* ---------- More / settings ---------- */
  BGT.renderLogsManage = function () {
    const box = document.getElementById('logsManageList');
    if (!box) return;
    const q = ((document.getElementById('logsSearch') || {}).value || '').trim().toLowerCase();
    let list = (BGT.state.gameLogs || []).slice();
    if (q) list = list.filter(function (l) { return String(l.game || '').toLowerCase().indexOf(q) !== -1; });
    list = list.slice(0, 60);
    if (!list.length) {
      box.innerHTML = '<div class="empty">Няма записи</div>';
      return;
    }
    box.innerHTML = list.map(function (l) {
      let sub = BGT.formatDate(l.date);
      if (l.type === 'coop') sub += ' · ' + (l.coopResult === 'win' ? 'Успех' : 'Неуспех');
      else if (l.winners) sub += ' · ' + (l.winners || []).join(', ');
      const id = String(l.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '<div class="list-row list-tap" onclick="BGT.openLogSheet(\'' + id + '\')"><div class="meta"><div class="title">' + BGT.esc(l.game) +
        '</div><div class="sub">' + BGT.esc(sub) + '</div></div><span class="chev">›</span></div>';
    }).join('');
  };

  BGT.openLogsSheet = function () {
    const s = document.getElementById('logsListSheet');
    if (!s) return;
    BGT.renderLogsManage();
    s.classList.add('open');
    s.setAttribute('aria-hidden', 'false');
  };
  BGT.closeLogsSheet = function () {
    const s = document.getElementById('logsListSheet');
    if (s) { s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); }
  };
  BGT.openLogSheet = function (id) {
    const log = (BGT.state.gameLogs || []).find(function (l) { return l.id === id; });
    if (!log) return BGT.toast('Записът не е намерен', 'info');
    _sheetLogId = id;
    BGT.closeLogsSheet();
    const sheet = document.getElementById('logSheet');
    const title = document.getElementById('logSheetTitle');
    const body = document.getElementById('logSheetBody');
    if (title) title.textContent = log.game || 'Партия';
    let html = '<div class="sheet-meta">' + BGT.formatDate(log.date) + ' · ' + (log.type === 'coop' ? 'Co-op' : 'PvP') + '</div>';
    if (log.type === 'coop') {
      html += '<div class="list-row"><div class="meta"><div class="title">Резултат</div><div class="sub">' +
        (log.coopResult === 'win' ? 'Успех' : 'Неуспех') + '</div></div></div>';
      html += '<div class="list-row"><div class="meta"><div class="title">Отбор</div><div class="sub">' +
        BGT.esc((log.participants || []).join(', ')) + '</div></div></div>';
    } else {
      const scores = Object.entries(log.scores || {}).sort(function (a, b) { return Number(b[1]) - Number(a[1]); });
      scores.forEach(function (e) {
        const isW = (log.winners || []).includes(e[0]) || log.winner === e[0];
        html += '<div class="list-row"><div class="meta"><div class="title">' + (isW ? '🏆 ' : '') + BGT.esc(e[0]) +
          '</div></div><div class="sheet-score">' + e[1] + '</div></div>';
      });
    }
    html += '<div class="field" style="margin-top:12px"><label>Редакция на точки (PvP)</label></div>';
    if (log.type !== 'coop') {
      Object.keys(log.scores || {}).forEach(function (p) {
        html += '<div class="field"><label>' + BGT.esc(p) + '</label><input type="number" data-edit-score="' + BGT.esc(p) + '" value="' + log.scores[p] + '"></div>';
      });
      html += '<button type="button" class="btn btn-primary" onclick="BGT.saveLogEdits()">Запази промените</button>';
    }
    if (body) body.innerHTML = html;
    if (sheet) { sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); }
  };
  BGT.closeLogSheet = function () {
    const s = document.getElementById('logSheet');
    if (s) { s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); }
    _sheetLogId = null;
  };
  BGT.saveLogEdits = function () {
    if (!_sheetLogId) return;
    const log = (BGT.state.gameLogs || []).find(function (l) { return l.id === _sheetLogId; });
    if (!log || log.type === 'coop') return;
    const scores = {};
    document.querySelectorAll('#logSheetBody [data-edit-score]').forEach(function (inp) {
      scores[inp.getAttribute('data-edit-score')] = Number(inp.value);
    });
    log.scores = scores;
    const sorted = Object.entries(scores).sort(function (a, b) { return b[1] - a[1]; });
    const top = sorted[0][1];
    log.winners = sorted.filter(function (x) { return x[1] === top; }).map(function (x) { return x[0]; });
    log.winner = log.winners[0];
    BGT.saveAll();
    BGT.toast('Записът е обновен');
    BGT.openLogSheet(_sheetLogId);
    if (typeof BGT.renderStatsBody === 'function') BGT.renderStatsBody();
  };
  BGT.deleteLogFromSheet = function () {
    if (!_sheetLogId) return;
    BGT.deleteLog(_sheetLogId);
    BGT.closeLogSheet();
  };
  BGT.deleteLog = function (id) {
    if (!id) return;
    if (!BGT.isAdmin()) return BGT.toast('Само админ може да трие партии', 'info');
    if (!confirm('Изтриване на този запис?')) return;
    if (!confirm('Сигурно?')) return;
    if (typeof BGT.markLogDeleted === 'function') BGT.markLogDeleted(id);
    BGT.state.gameLogs = (BGT.state.gameLogs || []).filter(function (l) { return l.id !== id; });
    BGT.saveAll();
    BGT.toast('Записът е изтрит');
    BGT.renderLogsManage();
    if (typeof BGT.renderStatsBody === 'function') BGT.renderStatsBody();
    if (typeof BGT.renderHome === 'function') BGT.renderHome();
  };

  BGT.forcePullCloud = async function () {
    if (!BGT.isLoggedIn()) return BGT.toast('Влез в акаунт', 'info');
    BGT.toast('Изтегляне от облака…', 'info');
    try {
      const fn = window.forcePullFromCloud;
      if (!fn) return BGT.toast('Cloud модулът не е готов — refresh', 'info');
      const ok = await fn();
      const n = (BGT.state.gameLogs || []).length;
      if (ok) BGT.toast('Заредени ' + n + ' партии от облака');
      else BGT.toast('Неуспешно изтегляне (' + n + ' локални)', 'info');
      if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill(ok ? 'ok' : 'off');
      BGT.renderHome();
      if (typeof BGT.renderStatsBody === 'function') BGT.renderStatsBody();
      BGT.renderMore();
    } catch (e) {
      BGT.toast('Грешка: ' + (e.message || 'pull'), 'info');
    }
  };

  BGT.forcePushCloud = async function () {
    if (!BGT.isLoggedIn()) return BGT.toast('Влез в акаунт', 'info');
    if (!BGT.isAdmin()) return BGT.toast('Само админ може да качи архива принудително', 'info');
    const n = (BGT.state.gameLogs || []).length;
    if (!n) return BGT.toast('Локално няма партии за качване', 'info');
    if (!confirm('Качване на ' + n + ' локални партии в облака?\nЛаптопът става източник; merge пази и евентуални нови id от облака.')) return;
    BGT.toast('Качване…', 'info');
    if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('local');
    try {
      const fn = window.saveDataToFirebase || (window.BGTCloud && window.BGTCloud.save);
      if (!fn) return BGT.toast('Cloud модулът не е готов', 'info');
      const ok = await fn({ forceLogs: true, forcePush: true });
      if (ok) {
        BGT.toast('Облакът е обновен (' + (BGT.state.gameLogs || []).length + ' партии)');
        if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');
      } else {
        const why = window.__bgtLastCloudError || 'неизвестна грешка';
        BGT.toast('Качването не успя: ' + why, 'info');
        console.error('forcePush failed', why);
      }
    } catch (e) {
      BGT.toast('Грешка: ' + (e.message || e.code || 'sync'), 'info');
      console.error(e);
    }
  };

  BGT.exportLogs = function () {
    const data = {
      exportedAt: new Date().toISOString(),
      gameLogs: BGT.state.gameLogs || [],
      myGamesObj: BGT.state.myGamesObj,
      myPlayers: BGT.state.myPlayers
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bgt-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    BGT.toast('Backup изтеглен');
  };
  BGT.importLogs = function (ev) {
    const file = ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        const incoming = Array.isArray(data.gameLogs) ? data.gameLogs : (Array.isArray(data) ? data : []);
        if (!incoming.length) return BGT.toast('Няма партии в файла', 'info');
        if (!confirm('Импорт на ' + incoming.length + ' партии (merge с текущите)?')) return;
        const mapped = incoming.map(function (l) {
          return Object.assign({}, l, { id: BGT.ensureLogId(l) });
        });
        BGT.state.gameLogs = BGT.mergeLogsById(BGT.state.gameLogs || [], mapped);
        if (data.myGamesObj) BGT.state.myGamesObj = Object.assign({}, BGT.state.myGamesObj, data.myGamesObj);
        BGT.saveAll();
        BGT.toast('Импортирани / слети партии');
        BGT.renderMore();
      } catch (e) {
        BGT.toast('Невалиден JSON', 'info');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  };

  BGT.doLogin = async function () {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    try {
      await window.authSignIn(email, pass);
      BGT.toast('Влязохте успешно');
      BGT.renderMore();
    } catch (e) {
      BGT.toast('Грешка: ' + (e.message || 'вход'), 'info');
    }
  };
  BGT.doRegister = async function () {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    try {
      await window.authRegister(email, pass);
      BGT.toast('Регистрацията е успешна');
      BGT.renderMore();
    } catch (e) {
      BGT.toast('Грешка: ' + (e.message || 'регистрация'), 'info');
    }
  };
  BGT.doLogout = async function () {
    try {
      if (typeof window.authSignOut === 'function') await window.authSignOut();
      else if (window.BGTCloud && window.BGTCloud.signOut) await window.BGTCloud.signOut();
      document.body.classList.remove('bgt-authed', 'bgt-linked', 'bgt-admin');
      window.__bgtAuthUser = null;
      if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('off');
      BGT.toast('Излязохте', 'info');
    } catch (e) {
      BGT.toast('Грешка при изход: ' + (e.message || ''), 'info');
    }
    BGT.renderMore();
    BGT.renderHome();
  };
  BGT.applyAccountLink = function (name) {
    const user = window.__bgtAuthUser;
    if (!user) return BGT.toast('Първо влез', 'info');
    name = String(name || '').trim();
    if (!name) return BGT.toast('Избери или въведи име', 'info');
    BGT.state.accountLinks = BGT.state.accountLinks || {};
    BGT.state.accountLinks[user.uid] = name;
    if (user.email) BGT.state.accountLinks['email:' + String(user.email).toLowerCase()] = name;
    BGT.state.activePlayer = name;
    const tg = BGT.getTableGroup();
    if (tg.indexOf(name) === -1) {
      tg.push(name);
      BGT.setTableGroup(tg);
    }
    BGT.saveAll();
    document.body.classList.add('bgt-linked');
    BGT.toast('Свързан като ' + name);
    BGT.renderMore();
    BGT.renderHome();
    if (typeof BGT.renderStatsBody === 'function') BGT.renderStatsBody();
  };

  BGT.linkMe = function () {
    const name = (document.getElementById('linkPlayerSelect') || {}).value;
    if (!name) return BGT.toast('Избери съществуващ играч от списъка', 'info');
    BGT.applyAccountLink(name);
  };

  BGT.linkMeAsNew = function () {
    const inp = document.getElementById('linkNewPlayerName');
    const name = (inp && inp.value || '').trim();
    if (!name) return BGT.toast('Въведи име за нов играч', 'info');
    BGT.applyAccountLink(name);
    if (inp) inp.value = '';
  };
  BGT.addToTable = function () {
    const inp = document.getElementById('newPlayerName');
    const name = (inp && inp.value || '').trim();
    if (!name) return;
    const tg = BGT.getTableGroup();
    if (tg.includes(name)) return BGT.toast('Вече е на масата', 'info');
    tg.push(name);
    BGT.setTableGroup(tg);
    if (inp) inp.value = '';
    BGT.saveAll();
    BGT.renderMore();
  };
  BGT.removeFromTable = function (name) {
    if (!BGT.isAdmin()) return BGT.toast('Само админ може да маха играчи от масата', 'info');
    BGT.setTableGroup(BGT.getTableGroup().filter(function (p) { return p !== name; }));
    BGT.saveAll();
    BGT.renderMore();
  };
  BGT.toggleTheme = function () {
    BGT.state.theme = BGT.state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', BGT.state.theme);
    BGT.persistLocal();
  };

  BGT.refreshAll = function () {
    const active = document.querySelector('.screen.active');
    const id = active ? active.id.replace('screen-', '') : 'home';
    BGT.go(id);
    /* always refresh account/link UI after cloud hydrate */
    if (typeof BGT.renderMore === 'function') BGT.renderMore();
  };


  /* ---------- Playful interactions ---------- */
  const DICE_FACES = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
  const DICE_WORDS = { 1: 'едно', 2: 'две', 3: 'три', 4: 'четири', 5: 'пет', 6: 'шест' };
  const HERO_SETS = [
    ['./icons/nav-dice.svg', './icons/nav-log.svg', './icons/nav-stats.svg'],
    ['./icons/game-everdell.svg', './icons/game-heat.svg', './icons/game-sky.svg'],
    ['./icons/game-carc.svg', './icons/game-castle.svg', './icons/game-spirit.svg'],
    ['./icons/nav-shelf.svg', './icons/nav-home.svg', './icons/nav-apps.svg']
  ];
  const HERO_LINES = [
    'Добра партия!', 'Нова кампания?', 'Кой води?', 'Време за реванш',
    'Зарът е благосклонен', 'Масата вика', 'Една още…', 'Легендите се пишат тук'
  ];

  BGT.rollDiceLogo = function () {
    if (!BGT.state.interactiveDice) return;
    const el = document.getElementById('diceLogo');
    const face = document.getElementById('diceFace');
    const stage = document.getElementById('diceStage');
    const stageDie = document.getElementById('diceStageDie');
    const stageFace = document.getElementById('diceStageFace');
    const stageLabel = document.getElementById('diceStageLabel');
    if (!el || !face || el.classList.contains('rolling') || !stage) return;
    if (stage.classList.contains('active')) return;

    el.classList.add('rolling');
    /* fly from top bar to center */
    stage.classList.add('active');
    stage.setAttribute('aria-hidden', 'false');
    stageDie.classList.remove('settle', 'return');
    stageDie.classList.add('drop');
    stageLabel.textContent = '';
    stageLabel.classList.remove('show');

    let n = 0;
    const iv = setInterval(function () {
      const r = 1 + Math.floor(Math.random() * 6);
      const f = DICE_FACES[r];
      face.textContent = f;
      if (stageFace) stageFace.textContent = f;
      n++;
      if (n > 14) {
        clearInterval(iv);
        const num = 1 + Math.floor(Math.random() * 6);
        const final = DICE_FACES[num];
        face.textContent = final;
        if (stageFace) stageFace.textContent = final;
        el.classList.remove('rolling');
        stageDie.classList.remove('drop');
        stageDie.classList.add('settle');
        if (stageLabel) {
          stageLabel.textContent = num + ' · ' + DICE_WORDS[num];
          stageLabel.classList.add('show');
        }
        try { if (navigator.vibrate) navigator.vibrate([12, 40, 12]); } catch (e) {}

        setTimeout(function () {
          stageDie.classList.remove('settle');
          stageDie.classList.add('return');
          stageLabel.classList.remove('show');
          setTimeout(function () {
            stage.classList.remove('active');
            stage.setAttribute('aria-hidden', 'true');
            stageDie.classList.remove('return');
            face.textContent = final;
          }, 480);
        }, 1600);
      }
    }, 50);
  };

  BGT.playHeroShow = function () {
    if (!BGT.state.interactiveHero) return;
    const stage = document.getElementById('heroStage');
    const result = document.getElementById('heroResult');
    const hint = document.getElementById('heroHint');
    if (!stage || stage.classList.contains('playing')) return;
    stage.classList.add('playing');
    if (result) { result.classList.remove('show'); result.textContent = ''; }
    if (hint) hint.style.opacity = '0.4';
    const icons = [document.getElementById('hi0'), document.getElementById('hi1'), document.getElementById('hi2')];
    let ticks = 0;
    const pool = HERO_SETS.flat();
    const iv = setInterval(function () {
      icons.forEach(function (el) {
        if (!el) return;
        const img = el.querySelector('img');
        if (img) img.src = pool[Math.floor(Math.random() * pool.length)];
      });
      ticks++;
      if (ticks > 12) {
        clearInterval(iv);
        const set = HERO_SETS[Math.floor(Math.random() * HERO_SETS.length)];
        icons.forEach(function (el, i) {
          const img = el && el.querySelector('img');
          if (img) img.src = set[i];
        });
        const line = HERO_LINES[Math.floor(Math.random() * HERO_LINES.length)];
        if (result) {
          result.textContent = line;
          result.classList.add('show');
        }
        if (hint) {
          hint.textContent = 'докосни пак';
          hint.style.opacity = '';
        }
        stage.classList.remove('playing');
        try { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); } catch (e) {}
      }
    }, 50);
  };


  BGT.updateSyncPill = function (state) {
    const el = document.getElementById('syncPill');
    if (!el) return;
    if (state === 'ok') {
      el.textContent = '☁';
      el.className = 'sync-pill ok';
      el.title = 'Синхронизирано';
    } else if (state === 'local') {
      el.textContent = '↑';
      el.className = 'sync-pill pending';
      el.title = 'Локални промени';
    } else if (state === 'off') {
      el.textContent = '○';
      el.className = 'sync-pill';
      el.title = 'Офлайн / гост';
    } else {
      el.textContent = '·';
      el.className = 'sync-pill';
    }
  };

  BGT.runSplash = function () {
    const splash = document.getElementById('splash');
    const face = document.getElementById('splashFace');
    if (!splash) return;
    /* само първо отваряне в тази tab-сесия — refresh не показва отново */
    let already = false;
    try { already = sessionStorage.getItem('bgSplashShown') === '1'; } catch (e) {}
    if (!BGT.state.showSplash || already) {
      splash.classList.add('done');
      return;
    }
    try { sessionStorage.setItem('bgSplashShown', '1'); } catch (e) {}
    let n = 0;
    const faces = [1, 2, 3, 4, 5, 6];
    const iv = setInterval(function () {
      if (face) face.textContent = DICE_FACES[faces[n % 6]];
      n++;
    }, 120);
    setTimeout(function () {
      clearInterval(iv);
      if (face) face.textContent = '⚄';
      splash.classList.add('hiding');
      setTimeout(function () {
        splash.classList.add('done');
        splash.classList.remove('hiding');
      }, 500);
    }, 3200);
  };

  /* boot */
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('data-theme', BGT.state.theme || 'dark');
    BGT.applyInteractivePrefs();
    BGT.updateSyncPill(BGT.isLoggedIn() ? 'ok' : 'off');
    BGT.renderCompanionList();
    BGT.go('home');
    BGT.runSplash();
  });
})();
