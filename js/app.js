/* Board Game Tracker 3.0 — UI + features */
(function () {
  const BGT = window.BGT;

  /* ---------- Navigation ---------- */
  BGT.go = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === 'screen-' + id);
    });
    document.querySelectorAll('.bottom-nav button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === id);
    });
    if (id === 'home') BGT.renderHome();
    if (id === 'log') BGT.renderLog();
    if (id === 'stats') BGT.renderStats();
    if (id === 'shelf') BGT.renderShelf();
    if (id === 'more') BGT.renderMore();
    if (id === 'random') BGT.renderRandom();
    window.scrollTo(0, 0);
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
  BGT.renderHome = function () {
    const me = BGT.getMyLinkedPlayer();
    const can = BGT.canViewStats();
    const guest = document.getElementById('homeGuest');
    if (guest) guest.classList.toggle('hidden', can);

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

    /* last game */
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
          '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(last.game) +
          '</div><div class="sub">' + BGT.esc(meta) + '</div></div></div>';
      }
    }

    BGT.renderProfileChip();
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
  BGT.renderLog = function () {
    const games = Object.keys(BGT.state.myGamesObj || {}).sort(function (a, b) {
      return a.localeCompare(b, 'bg');
    });
    const sel = document.getElementById('logGameSelect');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = '<option value="">— Избери игра —</option>' +
        games.map(function (g) {
          return '<option value="' + BGT.esc(g) + '"' + (g === cur ? ' selected' : '') + '>' + BGT.esc(g) + '</option>';
        }).join('');
    }
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
    BGT.saveAll();
    BGT.toast('✓ Партията е записана!');
    BGT.renderLogPlayers();
    document.getElementById('logGameSelect').value = '';
    if (dateEl) dateEl.value = '';
  };

  /* ---------- Randomizer ---------- */
  BGT.gameSupportsPlayers = function (name, n) {
    if (n === 'all' || n == null) return true;
    const num = Number(n);
    const range = BGT.GAME_PLAYERS[name] || [2, 6];
    if (num >= 5) return range[1] >= 5;
    return num >= range[0] && num <= range[1];
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
    let names = Object.keys(BGT.state.myGamesObj || {});
    /* filter by mode */
    if (mode === 'pvp' || mode === 'coop') {
      names = names.filter(function (g) { return BGT.state.myGamesObj[g] === mode; });
    }
    /* player count */
    names = names.filter(function (g) {
      return BGT.gameSupportsPlayers(g, BGT.state.randPlayers);
    });
    /* ownership — if linked player has ownership map, prefer owned */
    if (me) {
      const owned = names.filter(function (g) { return BGT.ownsGame(me, g); });
      if (owned.length) names = owned;
    }
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
    if (out) {
      out.innerHTML =
        '<div class="panel" style="text-align:center">' +
        '<div class="section-title" style="justify-content:center">Падна се</div>' +
        '<div style="font-size:28px;font-weight:900;letter-spacing:-.03em;margin:8px 0 14px">' + BGT.esc(pick) + '</div>' +
        '<button class="btn btn-primary" onclick="BGT.quickLog(\'' + String(pick).replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">Запиши резултат</button>' +
        '</div>';
    }
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
    const playerSel = document.getElementById('shelfPlayer');
    const players = Array.from(new Set([].concat(BGT.state.myPlayers || [], BGT.getTableGroup())));
    const me = BGT.getMyLinkedPlayer() || players[0] || '';
    if (playerSel) {
      playerSel.innerHTML = players.map(function (p) {
        return '<option value="' + BGT.esc(p) + '"' + (p === me ? ' selected' : '') + '>' + BGT.esc(p) + '</option>';
      }).join('');
      if (!playerSel.value && me) playerSel.value = me;
    }
    BGT.renderShelfList();
  };

  BGT.renderShelfList = function () {
    const player = (document.getElementById('shelfPlayer') || {}).value || BGT.getMyLinkedPlayer();
    const box = document.getElementById('shelfList');
    if (!box || !player) {
      if (box) box.innerHTML = '<div class="empty">Няма играчи</div>';
      return;
    }
    BGT.initOwnershipIfEmpty(player);
    const games = Object.keys(BGT.state.myGamesObj || {}).sort(function (a, b) {
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
    const authBox = document.getElementById('authStatus');
    const user = window.__bgtAuthUser;
    if (authBox) {
      if (user) {
        authBox.innerHTML = '<div class="list-row"><div class="meta"><div class="title">' +
          BGT.esc(user.email || 'Акаунт') + '</div><div class="sub">Аз съм: ' +
          BGT.esc(BGT.getMyLinkedPlayer() || '— не е свързано') +
          '</div></div></div>';
      } else {
        authBox.innerHTML = '<div class="empty">Не си влязъл</div>';
      }
    }
    const linkSel = document.getElementById('linkPlayerSelect');
    if (linkSel) {
      const players = BGT.getTableGroup();
      linkSel.innerHTML = '<option value="">— Избери —</option>' +
        players.map(function (p) {
          return '<option value="' + BGT.esc(p) + '">' + BGT.esc(p) + '</option>';
        }).join('');
    }
    const tableList = document.getElementById('tableList');
    if (tableList) {
      const tg = BGT.getTableGroup();
      tableList.innerHTML = tg.map(function (p) {
        return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(p) +
          '</div></div><button class="btn btn-secondary" style="width:auto;min-height:36px;padding:0 10px" ' +
          'onclick="BGT.removeFromTable(\'' + String(p).replace(/'/g, "\\'") + '\')">✕</button></div>';
      }).join('') || '<div class="empty">Масата е празна</div>';
    }
    /* companions */
    const cbox = document.getElementById('companionList');
    if (cbox) {
      cbox.innerHTML = (BGT.COMPANIONS || []).map(function (c) {
        return '<a class="companion-card" href="./' + c.file + '">' +
          '<img class="icon-lg" src="' + c.icon + '" alt="">' +
          '<div class="cn">' + BGT.esc(c.name) + '</div>' +
          '<div class="cd">Companion</div></a>';
      }).join('');
    }
    BGT.renderProfileChip();
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
    await window.authSignOut();
    BGT.toast('Излязохте', 'info');
    BGT.renderMore();
    BGT.renderHome();
  };
  BGT.linkMe = function () {
    const name = document.getElementById('linkPlayerSelect').value;
    if (!name) return BGT.toast('Избери име', 'info');
    const user = window.__bgtAuthUser;
    if (!user) return BGT.toast('Първо влез', 'info');
    BGT.state.accountLinks = BGT.state.accountLinks || {};
    BGT.state.accountLinks[user.uid] = name;
    if (user.email) BGT.state.accountLinks['email:' + user.email.toLowerCase()] = name;
    BGT.state.activePlayer = name;
    BGT.saveAll();
    document.body.classList.add('bgt-linked');
    BGT.toast('Свързан като ' + name);
    BGT.renderMore();
    BGT.renderHome();
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
    const el = document.getElementById('diceLogo');
    const face = document.getElementById('diceFace');
    if (!el || !face || el.classList.contains('rolling')) return;
    el.classList.add('rolling');
    el.classList.remove('dice-result');
    let n = 0;
    const iv = setInterval(function () {
      const r = 1 + Math.floor(Math.random() * 6);
      face.textContent = DICE_FACES[r];
      n++;
      if (n > 10) {
        clearInterval(iv);
        const num = 1 + Math.floor(Math.random() * 6);
        face.textContent = DICE_FACES[num];
        el.classList.remove('rolling');
        el.classList.add('dice-result');
        BGT.toast('Падна се: ' + num + ' (' + DICE_WORDS[num] + ') ' + DICE_FACES[num], 'info');
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
        setTimeout(function () {
          el.classList.remove('dice-result');
          face.textContent = '⚄';
        }, 2200);
      }
    }, 55);
  };

  BGT.playHeroShow = function () {
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


  /* boot */
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('data-theme', BGT.state.theme || 'dark');
    BGT.go('home');
  });
})();
