/* Board Game Tracker 3.0 — Statistics module (widgets) */
(function () {
  const BGT = window.BGT || (window.BGT = {});

  const DEFAULT_WIDGETS = {
    overview: true,
    winrate: true,
    recent: true,
    byGame: true,
    h2h: true,
    records: true,
    streaks: true,
    coop: true,
    activity: true,
    leaders: false
  };

  function loadWidgetPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem('bgStatWidgets') || '{}');
      return Object.assign({}, DEFAULT_WIDGETS, raw);
    } catch (e) {
      return Object.assign({}, DEFAULT_WIDGETS);
    }
  }
  function saveWidgetPrefs(prefs) {
    try { localStorage.setItem('bgStatWidgets', JSON.stringify(prefs)); } catch (e) {}
  }
  function loadWidgetOrder() {
    try {
      const o = JSON.parse(localStorage.getItem('bgStatWidgetOrder') || 'null');
      if (Array.isArray(o) && o.length) return o;
    } catch (e) {}
    return WIDGET_META.map(function (w) { return w.id; });
  }
  function saveWidgetOrder(order) {
    try { localStorage.setItem('bgStatWidgetOrder', JSON.stringify(order)); } catch (e) {}
  }

  BGT.statWidgets = loadWidgetPrefs();
  /* WIDGET_META defined below — order init deferred */


  function me() { return BGT.getMyLinkedPlayer() || ''; }
  function logs() { return BGT.getScopedLogs() || []; }
  function pvp(list) { return (list || logs()).filter(function (l) { return l.type !== 'coop'; }); }
  function coop(list) { return (list || logs()).filter(function (l) { return l.type === 'coop'; }); }

  function won(log, player) {
    if (!player) return false;
    if (log.type === 'coop') return log.coopResult === 'win' && BGT.playerInLog(log, player);
    return BGT.getPvpWinners(log).includes(player);
  }

  function opponentsOf(player) {
    const set = new Set();
    pvp().forEach(function (l) {
      Object.keys(l.scores || {}).forEach(function (p) {
        if (p !== player) set.add(p);
      });
    });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'bg'); });
  }

  function h2hPair(a, b) {
    let aw = 0, bw = 0, n = 0;
    pvp().forEach(function (l) {
      const keys = Object.keys(l.scores || {});
      if (keys.length === 2 && keys.includes(a) && keys.includes(b)) {
        n++;
        const w = BGT.getPvpWinners(l);
        if (w.includes(a) && !w.includes(b)) aw++;
        else if (w.includes(b) && !w.includes(a)) bw++;
        else if (w.includes(a) && w.includes(b)) { /* draw — skip or half */ }
      }
    });
    return { n: n, a: aw, b: bw };
  }

  function streakInfo(player) {
    const seq = pvp().slice().sort(function (x, y) {
      return new Date(x.date || 0) - new Date(y.date || 0);
    });
    let cur = 0, bestW = 0, bestL = 0, curType = null, run = 0;
    seq.forEach(function (l) {
      const w = won(l, player);
      if (curType === null) { curType = w; run = 1; }
      else if (curType === w) run++;
      else { curType = w; run = 1; }
      if (w) bestW = Math.max(bestW, run);
      else bestL = Math.max(bestL, run);
    });
    /* current streak from newest */
    const newest = pvp().slice().sort(function (x, y) {
      return new Date(y.date || 0) - new Date(x.date || 0);
    });
    if (newest.length) {
      const first = won(newest[0], player);
      cur = 1;
      for (let i = 1; i < newest.length; i++) {
        if (won(newest[i], player) === first) cur++;
        else break;
      }
      curType = first;
    } else {
      cur = 0;
      curType = null;
    }
    return { current: cur, isWin: curType, bestWin: bestW, bestLoss: bestL };
  }

  function records(player) {
    let bestScore = null, worstScore = null, bestGame = null, worstGame = null;
    pvp().forEach(function (l) {
      if (!l.scores || l.scores[player] == null) return;
      const s = Number(l.scores[player]);
      if (!Number.isFinite(s)) return;
      if (bestScore === null || s > bestScore) {
        bestScore = s;
        bestGame = l;
      }
      if (worstScore === null || s < worstScore) {
        worstScore = s;
        worstGame = l;
      }
    });
    return { bestScore: bestScore, bestGame: bestGame, worstScore: worstScore, worstGame: worstGame };
  }

  function activityByMonth() {
    const map = {};
    logs().forEach(function (l) {
      const d = new Date(l.date || 0);
      if (isNaN(d)) return;
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(function (a, b) { return a[0].localeCompare(b[0]); }).slice(-8);
  }

  function byGameStats(player) {
    const map = {};
    pvp().forEach(function (l) {
      if (!map[l.game]) map[l.game] = { n: 0, w: 0, pts: 0, ptsN: 0 };
      map[l.game].n++;
      if (won(l, player)) map[l.game].w++;
      if (l.scores && l.scores[player] != null) {
        map[l.game].pts += Number(l.scores[player]) || 0;
        map[l.game].ptsN++;
      }
    });
    return Object.entries(map).map(function (e) {
      return {
        game: e[0],
        n: e[1].n,
        w: e[1].w,
        rate: e[1].n ? Math.round(e[1].w / e[1].n * 100) : 0,
        avg: e[1].ptsN ? Math.round(e[1].pts / e[1].ptsN) : null
      };
    }).sort(function (a, b) { return b.n - a.n; });
  }

  /* ----- Widget renderers ----- */
  const WIDGET_META = [
    { id: 'overview', title: 'Общ преглед', desc: 'Партии, победи, win rate' },
    { id: 'winrate', title: 'Win rate', desc: 'Визуален процент' },
    { id: 'recent', title: 'Последни партии', desc: 'Хронология' },
    { id: 'byGame', title: 'По игри', desc: 'Разбивка и средни точки' },
    { id: 'h2h', title: 'Head-to-head', desc: '1v1 срещу опоненти' },
    { id: 'records', title: 'Рекорди', desc: 'Най-висок / най-нисък резултат' },
    { id: 'streaks', title: 'Серии', desc: 'Текуща и най-добра серия' },
    { id: 'coop', title: 'Co-op', desc: 'Успехи в кооперативни' },
    { id: 'activity', title: 'Активност', desc: 'Партии по месеци' },
    { id: 'leaders', title: 'Таблица на масата', desc: 'Сравнение на играчите' }
  ];

  function widgetShell(id, title, bodyHtml) {
    return (
      '<article class="stat-widget" data-widget="' + id + '">' +
      '<header class="sw-head"><h3>' + BGT.esc(title) + '</h3></header>' +
      '<div class="sw-body">' + bodyHtml + '</div></article>'
    );
  }

  function renderOverview(player) {
    const all = logs();
    const pv = pvp();
    const cp = coop();
    let wins = 0;
    pv.forEach(function (l) { if (won(l, player)) wins++; });
    const rate = pv.length ? Math.round(wins / pv.length * 100) : 0;
    const games = new Set(all.map(function (l) { return l.game; })).size;
    return widgetShell('overview', 'Общ преглед',
      '<div class="sw-grid4">' +
      '<div class="sw-metric"><div class="n">' + all.length + '</div><div class="l">Партии</div></div>' +
      '<div class="sw-metric"><div class="n">' + games + '</div><div class="l">Игри</div></div>' +
      '<div class="sw-metric"><div class="n">' + wins + '</div><div class="l">Победи</div></div>' +
      '<div class="sw-metric"><div class="n">' + rate + '%</div><div class="l">Win rate</div></div>' +
      '</div>' +
      '<div class="sw-sub">PvP ' + pv.length + ' · Co-op ' + cp.length + '</div>'
    );
  }

  function renderWinrate(player) {
    const pv = pvp();
    let wins = 0;
    pv.forEach(function (l) { if (won(l, player)) wins++; });
    const rate = pv.length ? Math.round(wins / pv.length * 100) : 0;
    const losses = pv.length - wins;
    return widgetShell('winrate', 'Win rate',
      '<div class="sw-rate">' +
      '<div class="sw-rate-num">' + rate + '<span>%</span></div>' +
      '<div class="winbar sw-bar"><span style="width:' + rate + '%"></span></div>' +
      '<div class="sw-sub">' + wins + ' победи · ' + losses + ' загуби · ' + pv.length + ' PvP</div>' +
      '</div>'
    );
  }

  function renderRecent() {
    const list = logs().slice(0, 12);
    if (!list.length) return widgetShell('recent', 'Последни партии', '<div class="empty">Няма записи</div>');
    const rows = list.map(function (l) {
      let sub = BGT.formatDate(l.date);
      if (l.type === 'coop') {
        sub += ' · ' + (l.coopResult === 'win' ? 'Успех' : 'Неуспех');
      } else {
        const w = BGT.getPvpWinners(l);
        if (w.length) sub += ' · ' + w.join(', ');
        if (l.scores) {
          const sc = Object.entries(l.scores).map(function (e) { return e[0] + ' ' + e[1]; }).join(' · ');
          sub += ' · ' + sc;
        }
      }
      const id = String(l.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '<div class="list-row list-tap" onclick="BGT.openLogSheet(\'' + id + '\')"><div class="meta"><div class="title">' + BGT.esc(l.game) +
        '</div><div class="sub">' + BGT.esc(sub) + '</div></div><span class="chev">›</span></div>';
    }).join('');
    return widgetShell('recent', 'Последни партии', rows);
  }

  function renderByGame(player) {
    const rows = byGameStats(player);
    if (!rows.length) return widgetShell('byGame', 'По игри', '<div class="empty">Няма PvP</div>');
    const html = rows.map(function (r) {
      return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(r.game) +
        '</div><div class="sub">' + r.n + ' партии · ' + r.w + 'W · ' + r.rate + '%' +
        (r.avg != null ? ' · ср. ' + r.avg + ' pts' : '') +
        '</div><div class="winbar"><span style="width:' + r.rate + '%"></span></div></div></div>';
    }).join('');
    return widgetShell('byGame', 'По игри', html);
  }

  function renderH2H(player) {
    const ops = opponentsOf(player);
    if (!ops.length) return widgetShell('h2h', 'Head-to-head', '<div class="empty">Няма 1v1 още</div>');
    const html = ops.map(function (op) {
      const h = h2hPair(player, op);
      if (!h.n) return '';
      const total = h.a + h.b;
      const pct = total ? Math.round(h.a / total * 100) : 50;
      return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(player) +
        ' vs ' + BGT.esc(op) + '</div><div class="sub">' + h.a + '–' + h.b + ' · ' + h.n + ' партии</div>' +
        '<div class="winbar"><span style="width:' + pct + '%"></span></div></div></div>';
    }).filter(Boolean).join('') || '<div class="empty">Няма 1v1 още</div>';
    return widgetShell('h2h', 'Head-to-head', html);
  }

  function renderRecords(player) {
    const r = records(player);
    if (r.bestScore == null) return widgetShell('records', 'Рекорди', '<div class="empty">Няма резултати</div>');
    let html = '<div class="sw-grid2">';
    html += '<div class="sw-metric"><div class="n">' + r.bestScore + '</div><div class="l">Рекорд</div>' +
      '<div class="sw-mini">' + BGT.esc(r.bestGame && r.bestGame.game) + ' · ' +
      BGT.formatDate(r.bestGame && r.bestGame.date) + '</div></div>';
    html += '<div class="sw-metric"><div class="n">' + r.worstScore + '</div><div class="l">Най-нисък</div>' +
      '<div class="sw-mini">' + BGT.esc(r.worstGame && r.worstGame.game) + ' · ' +
      BGT.formatDate(r.worstGame && r.worstGame.date) + '</div></div>';
    html += '</div>';
    return widgetShell('records', 'Рекорди', html);
  }

  function renderStreaks(player) {
    const s = streakInfo(player);
    const curLabel = s.current
      ? (s.isWin ? s.current + ' победи подред' : s.current + ' загуби подред')
      : 'Няма серия';
    return widgetShell('streaks', 'Серии',
      '<div class="sw-grid3">' +
      '<div class="sw-metric"><div class="n">' + s.current + '</div><div class="l">Текуща</div><div class="sw-mini">' + BGT.esc(curLabel) + '</div></div>' +
      '<div class="sw-metric"><div class="n">' + s.bestWin + '</div><div class="l">Най-добра W</div></div>' +
      '<div class="sw-metric"><div class="n">' + s.bestLoss + '</div><div class="l">Най-дълга L</div></div>' +
      '</div>'
    );
  }

  function renderCoop() {
    const cp = coop();
    const w = cp.filter(function (l) { return l.coopResult === 'win'; }).length;
    const rate = cp.length ? Math.round(w / cp.length * 100) : 0;
    const byG = {};
    cp.forEach(function (l) {
      if (!byG[l.game]) byG[l.game] = { n: 0, w: 0 };
      byG[l.game].n++;
      if (l.coopResult === 'win') byG[l.game].w++;
    });
    let rows = Object.entries(byG).map(function (e) {
      return '<div class="list-row"><div class="meta"><div class="title">' + BGT.esc(e[0]) +
        '</div><div class="sub">' + e[1].w + '/' + e[1].n + ' успехи</div></div></div>';
    }).join('');
    return widgetShell('coop', 'Co-op',
      '<div class="sw-metric" style="margin-bottom:10px"><div class="n">' + w + '/' + cp.length +
      '</div><div class="l">Успехи · ' + rate + '%</div></div>' +
      (rows || '<div class="empty">Няма co-op</div>')
    );
  }

  function renderActivity() {
    const months = activityByMonth();
    if (!months.length) return widgetShell('activity', 'Активност', '<div class="empty">Няма данни</div>');
    const max = Math.max.apply(null, months.map(function (m) { return m[1]; })) || 1;
    const bars = months.map(function (m) {
      const h = Math.max(8, Math.round(m[1] / max * 64));
      return '<div class="sw-act-col"><div class="sw-act-bar" style="height:' + h + 'px"></div>' +
        '<div class="sw-act-lab">' + BGT.esc(m[0].slice(5)) + '</div></div>';
    }).join('');
    return widgetShell('activity', 'Активност', '<div class="sw-act">' + bars + '</div>');
  }

  function renderLeaders() {
    const table = BGT.getTableGroup();
    if (table.length < 2) return widgetShell('leaders', 'Таблица на масата', '<div class="empty">Добави играчи на масата</div>');
    const all = BGT.state.gameLogs || [];
    const rows = table.map(function (p) {
      let w = 0, n = 0;
      all.forEach(function (l) {
        if (l.type === 'coop') return;
        if (!BGT.playerInLog(l, p)) return;
        n++;
        if (BGT.getPvpWinners(l).includes(p)) w++;
      });
      return { p: p, n: n, w: w, rate: n ? Math.round(w / n * 100) : 0 };
    }).sort(function (a, b) { return b.w - a.w || b.rate - a.rate; });
    const html = rows.map(function (r, i) {
      return '<div class="list-row"><div class="meta"><div class="title">' + (i + 1) + '. ' + BGT.esc(r.p) +
        '</div><div class="sub">' + r.w + 'W / ' + r.n + ' · ' + r.rate + '%</div></div></div>';
    }).join('');
    return widgetShell('leaders', 'Таблица на масата', html);
  }

  const RENDERERS = {
    overview: renderOverview,
    winrate: renderWinrate,
    recent: function () { return renderRecent(); },
    byGame: renderByGame,
    h2h: renderH2H,
    records: renderRecords,
    streaks: renderStreaks,
    coop: function () { return renderCoop(); },
    activity: function () { return renderActivity(); },
    leaders: function () { return renderLeaders(); }
  };

  BGT.getWidgetOrder = function () {
    let order = loadWidgetOrder();
    const ids = WIDGET_META.map(function (w) { return w.id; });
    ids.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
    order = order.filter(function (id) { return ids.indexOf(id) !== -1; });
    return order;
  };

  BGT.renderStatsCustomize = function () {
    const box = document.getElementById('statsCustomize');
    if (!box) return;
    const prefs = BGT.statWidgets;
    const order = BGT.getWidgetOrder();
    box.innerHTML = order.map(function (id, idx) {
      const w = WIDGET_META.find(function (x) { return x.id === id; });
      if (!w) return '';
      const on = prefs[w.id] !== false;
      return '<div class="list-row">' +
        '<div class="meta"><div class="title">' + BGT.esc(w.title) + '</div>' +
        '<div class="sub">' + BGT.esc(w.desc) + '</div></div>' +
        '<button type="button" class="btn btn-secondary btn-xs" onclick="BGT.moveWidget(\'' + w.id + '\',-1)">↑</button>' +
        '<button type="button" class="btn btn-secondary btn-xs" onclick="BGT.moveWidget(\'' + w.id + '\',1)">↓</button>' +
        '<button type="button" class="toggle' + (on ? ' on' : '') + '" data-wid="' + w.id + '" ' +
        'onclick="BGT.toggleStatWidget(\'' + w.id + '\', this)"></button></div>';
    }).join('');
  };

  BGT.moveWidget = function (id, dir) {
    const order = BGT.getWidgetOrder();
    const i = order.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    saveWidgetOrder(order);
    BGT.renderStatsCustomize();
    BGT.renderStatsBody();
  };


  BGT.toggleStatWidget = function (id, btn) {
    BGT.statWidgets[id] = !BGT.statWidgets[id];
    saveWidgetPrefs(BGT.statWidgets);
    if (btn) btn.classList.toggle('on', !!BGT.statWidgets[id]);
    BGT.renderStatsBody();
  };

  BGT.toggleStatsCustomizePanel = function () {
    const p = document.getElementById('statsCustomizePanel');
    if (!p) return;
    p.classList.toggle('hidden');
    if (!p.classList.contains('hidden')) BGT.renderStatsCustomize();
  };

  BGT.renderStatsBody = function () {
    const out = document.getElementById('statsBody');
    if (!out) return;
    if (!BGT.canViewStats()) {
      out.innerHTML = '<div class="empty">Влез и свържи „Аз съм“, за да видиш статистики.</div>';
      return;
    }
    const player = me();
    const prefs = BGT.statWidgets;
    let html = '';
    BGT.getWidgetOrder().forEach(function (id) {
      if (prefs[id] === false) return;
      const fn = RENDERERS[id];
      if (!fn) return;
      html += fn(player);
    });
    if (!html) {
      html = '<div class="empty">Включи поне един widget от Настройки на статистики.</div>';
    }
    out.innerHTML = html;
  };

  BGT.renderStats = function () {
    BGT.renderStatsBody();
  };
})();
