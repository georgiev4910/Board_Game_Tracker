/* Board Game Tracker 3.0 — Firebase + safe sync
   NEVER overwrite non-empty cloud gameLogs with empty local data. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const BGT = window.BGT;
const app = initializeApp(BGT.FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
const docRef = doc(db, "boardgame_data", "main_tracker");
const backupDocRef = doc(db, "boardgame_data", "main_tracker_backup");

let isSaving = false;
let lastKnownUpdated = null;
let unsubSnapshot = null;
let cloudReady = false;

function collectPrefs() {
  const s = BGT.state;
  return {
    colors: JSON.parse(localStorage.getItem('bgPlayerColors') || '{}'),
    figures: JSON.parse(localStorage.getItem('bgPlayerFigures') || '{}'),
    gender: JSON.parse(localStorage.getItem('bgPlayerGender') || '{}'),
    activePlayer: s.activePlayer || '',
    accountLinks: s.accountLinks || {},
    tableGroup: BGT.getTableGroup(),
    tables: s.tables || {},
    activeTable: s.activeTable || 'Основна',
    gameOwnership: s.gameOwnership || {}
  };
}

function applyPrefs(prefs) {
  if (!prefs) return;
  const s = BGT.state;
  if (prefs.accountLinks) s.accountLinks = prefs.accountLinks;
  if (prefs.tables) s.tables = prefs.tables;
  if (typeof prefs.activeTable === 'string') s.activeTable = prefs.activeTable;
  if (Array.isArray(prefs.tableGroup)) {
    s.tables = s.tables || {};
    const name = s.activeTable || 'Основна';
    s.tables[name] = prefs.tableGroup;
    s.myPlayers = prefs.tableGroup.slice();
  }
  if (typeof prefs.activePlayer === 'string') s.activePlayer = prefs.activePlayer;
  if (prefs.gameOwnership && typeof prefs.gameOwnership === 'object') {
    s.gameOwnership = prefs.gameOwnership;
  }
  if (prefs.colors) try { localStorage.setItem('bgPlayerColors', JSON.stringify(prefs.colors)); } catch (e) {}
  if (prefs.figures) try { localStorage.setItem('bgPlayerFigures', JSON.stringify(prefs.figures)); } catch (e) {}
  if (prefs.gender) try { localStorage.setItem('bgPlayerGender', JSON.stringify(prefs.gender)); } catch (e) {}
  BGT.persistLocal();
}

async function loadFromCloud() {
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const b = await getDoc(backupDocRef);
      if (b.exists() && Array.isArray(b.data().gameLogs) && b.data().gameLogs.length) {
        const recovered = b.data().gameLogs.map(function (l) {
          return Object.assign({}, l, { id: BGT.ensureLogId(l) });
        });
        BGT.state.gameLogs = recovered;
        BGT.persistLocal();
        cloudReady = true;
        BGT.toast('Възстановени ' + recovered.length + ' партии от backup', 'info');
        if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');
        setTimeout(function () { saveToCloud({ forceLogs: true }); }, 400);
        return true;
      }
      cloudReady = true;
      return false;
    }
    const cloud = snap.data();
    if (cloud.myGamesObj) BGT.state.myGamesObj = cloud.myGamesObj;
    if (cloud.myPlayers) BGT.state.myPlayers = cloud.myPlayers;
    if (cloud.gamePlayers && typeof cloud.gamePlayers === 'object') {
      BGT.state.gamePlayers = Object.assign({}, BGT.GAME_PLAYERS || {}, cloud.gamePlayers);
    }
    if (cloud.gameExpansions && typeof cloud.gameExpansions === 'object') {
      BGT.state.gameExpansions = Object.assign({}, BGT.state.gameExpansions || {}, cloud.gameExpansions);
    }

    let cloudLogs = Array.isArray(cloud.gameLogs)
      ? cloud.gameLogs.map(function (l) { return Object.assign({}, l, { id: BGT.ensureLogId(l) }); })
      : [];

    if (!cloudLogs.length) {
      try {
        const b = await getDoc(backupDocRef);
        if (b.exists() && Array.isArray(b.data().gameLogs) && b.data().gameLogs.length) {
          cloudLogs = b.data().gameLogs.map(function (l) {
            return Object.assign({}, l, { id: BGT.ensureLogId(l) });
          });
          BGT.toast('Заредени ' + cloudLogs.length + ' партии от backup', 'info');
        }
      } catch (e) {}
    }

    const localLogs = (BGT.state.gameLogs || []).map(function (l) {
      return Object.assign({}, l, { id: BGT.ensureLogId(l) });
    });
    const delSet = new Set(BGT.state.deletedLogIds || []);
    let merged = BGT.mergeLogsById(cloudLogs, localLogs).filter(function (l) { return !delSet.has(l.id); });
    if (!merged.length && cloudLogs.length) merged = cloudLogs.filter(function (l) { return !delSet.has(l.id); });
    /* телефон с 0–3 локални vs пълен облак → вземи облака като основа */
    if (cloudLogs.length > localLogs.length + 3 && cloudLogs.length >= merged.length) {
      merged = BGT.mergeLogsById(cloudLogs, localLogs).filter(function (l) { return !delSet.has(l.id); });
    }
    if (cloudLogs.length && localLogs.length <= 3 && cloudLogs.length > localLogs.length) {
      merged = BGT.mergeLogsById(cloudLogs, localLogs).filter(function (l) { return !delSet.has(l.id); });
    }

    BGT.state.gameLogs = merged;
    console.info('[BGT] loadFromCloud local=', localLogs.length, 'cloud=', cloudLogs.length, 'merged=', merged.length);
    if (cloud.playerPrefs) applyPrefs(cloud.playerPrefs);
    if (cloud.admins) {
      try { localStorage.setItem('bgAdmins', JSON.stringify(cloud.admins)); } catch (e) {}
      window.__bgtAdmins = cloud.admins;
    }
    lastKnownUpdated = cloud.lastUpdated || '';
    BGT.persistLocal();
    cloudReady = true;
    if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');

    if (merged.length && (!cloud.gameLogs || !cloud.gameLogs.length)) {
      setTimeout(function () { saveToCloud({ forceLogs: true, forcePush: true }); }, 400);
    } else if (localLogs.length > (cloudLogs.length || 0) + 3) {
      /* локалният архив е ясно по-пълен от облака — качи merge (лаптоп 57–78 vs телефон 1–3) */
      setTimeout(function () { saveToCloud({ forceLogs: true, forcePush: true }); }, 600);
    }
    return true;
  } catch (e) {
    console.error(e);
    cloudReady = true;
    return false;
  }
}

function stripUndefined(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter(function (x) { return x !== undefined; });
  }
  const out = {};
  Object.keys(value).forEach(function (k) {
    const v = stripUndefined(value[k]);
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function sanitizeLog(l) {
  if (!l || typeof l !== 'object') return null;
  const o = {
    id: BGT.ensureLogId(l),
    game: l.game || '',
    type: l.type === 'coop' ? 'coop' : 'pvp',
    date: l.date || new Date().toISOString()
  };
  if (o.type === 'coop') {
    o.participants = Array.isArray(l.participants) ? l.participants.filter(Boolean) : [];
    o.coopResult = l.coopResult === 'win' ? 'win' : 'loss';
  } else {
    o.scores = {};
    const sc = l.scores || {};
    Object.keys(sc).forEach(function (p) {
      const n = Number(sc[p]);
      if (Number.isFinite(n)) o.scores[p] = n;
    });
    o.winners = Array.isArray(l.winners) ? l.winners.filter(Boolean) : BGT.getPvpWinners(l);
    if (l.winner) o.winner = l.winner;
  }
  if (l.notes) o.notes = String(l.notes).slice(0, 500);
  return o;
}

async function saveToCloud(opts) {
  opts = opts || {};
  window.__bgtLastCloudError = '';
  if (!auth.currentUser) {
    window.__bgtLastCloudError = 'Няма логнат потребител';
    return false;
  }
  if (!cloudReady && !opts.forceLogs) {
    window.__bgtLastCloudError = 'Облакът още не е готов (cloudReady=false)';
    return false;
  }
  try {
    isSaving = true;
    let cloudLogs = [];
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        cloudLogs = Array.isArray(snap.data().gameLogs)
          ? snap.data().gameLogs.map(function (l) { return Object.assign({}, l, { id: BGT.ensureLogId(l) }); })
          : [];
      }
    } catch (e) {
      cloudLogs = null;
      console.warn('getDoc during save failed', e);
    }

    const delSet = new Set(BGT.state.deletedLogIds || []);
    const localLogs = (BGT.state.gameLogs || []).map(function (l) {
      return Object.assign({}, l, { id: BGT.ensureLogId(l) });
    });

    let logsWithId = null;
    if (cloudLogs !== null) {
      logsWithId = BGT.mergeLogsById(cloudLogs, localLogs).filter(function (l) { return !delSet.has(l.id); });
      if (!logsWithId.length && cloudLogs.length && delSet.size === 0) {
        logsWithId = cloudLogs.slice();
      }
      if (opts.forcePush && localLogs.length > (cloudLogs ? cloudLogs.length : 0)) {
        logsWithId = BGT.mergeLogsById(localLogs, cloudLogs || []).filter(function (l) { return !delSet.has(l.id); });
      }
      BGT.state.gameLogs = logsWithId;
      BGT.persistLocal();
    } else if (opts.forcePush && localLogs.length) {
      logsWithId = localLogs.filter(function (l) { return !delSet.has(l.id); });
      BGT.state.gameLogs = logsWithId;
      BGT.persistLocal();
    }

    const cleanLogs = (logsWithId || []).map(sanitizeLog).filter(Boolean);

    const payload = stripUndefined({
      myGamesObj: BGT.state.myGamesObj || {},
      myPlayers: BGT.state.myPlayers || [],
      gamePlayers: BGT.state.gamePlayers || {},
      gameExpansions: BGT.state.gameExpansions || {},
      playerPrefs: collectPrefs(),
      lastUpdated: new Date().toISOString(),
      updatedBy: auth.currentUser.uid
    });
    if (typeof BGT.isAdmin === 'function' && BGT.isAdmin()) {
      payload.admins = BGT.getAdmins();
    }
    if (cleanLogs.length > 0 || opts.allowEmptyLogs) {
      payload.gameLogs = cleanLogs;
    }

    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (e1) {
      /* ако документът е твърде голям — опитай без expansions/prefs тежести */
      const msg = String(e1 && e1.message || e1);
      if (/exceeds|too large|size/i.test(msg) && payload.gameLogs) {
        const slim = Object.assign({}, payload, {
          gameLogs: payload.gameLogs.map(function (l) {
            return {
              id: l.id, game: l.game, type: l.type, date: l.date,
              scores: l.scores, winners: l.winners, winner: l.winner,
              participants: l.participants, coopResult: l.coopResult
            };
          })
        });
        await setDoc(docRef, stripUndefined(slim), { merge: true });
      } else {
        throw e1;
      }
    }
    lastKnownUpdated = payload.lastUpdated;
    if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');

    if (cleanLogs.length > 0) {
      try {
        await setDoc(backupDocRef, stripUndefined({
          gameLogs: cleanLogs,
          myGamesObj: BGT.state.myGamesObj || {},
          myPlayers: BGT.state.myPlayers || [],
          savedAt: new Date().toISOString(),
          count: cleanLogs.length
        }), { merge: true });
      } catch (e) {
        console.warn('backup save failed', e);
      }
    }
    return true;
  } catch (e) {
    console.error(e);
    window.__bgtLastCloudError = (e && (e.code || e.message)) ? String(e.code || e.message) : String(e);
    return false;
  } finally {
    setTimeout(function () { isSaving = false; }, 800);
  }
}

function startListener() {
  if (unsubSnapshot) return;
  unsubSnapshot = onSnapshot(docRef, function (docSnap) {
    if (!docSnap.exists() || isSaving || !auth.currentUser) return;
    const cloud = docSnap.data();
    if ((cloud.lastUpdated || '') === lastKnownUpdated) return;
    if (cloud.myGamesObj) BGT.state.myGamesObj = cloud.myGamesObj;
    if (cloud.myPlayers) BGT.state.myPlayers = cloud.myPlayers;
    if (cloud.gamePlayers && typeof cloud.gamePlayers === 'object') {
      BGT.state.gamePlayers = Object.assign({}, BGT.GAME_PLAYERS || {}, cloud.gamePlayers);
    }
    if (Array.isArray(cloud.gameLogs)) {
      const mapped = cloud.gameLogs.map(function (l) {
        return Object.assign({}, l, { id: BGT.ensureLogId(l) });
      });
      const local = BGT.state.gameLogs || [];
      if (mapped.length === 0 && local.length > 0) {
        /* ignore empty destructive snapshot */
      } else {
        const delSet = new Set(BGT.state.deletedLogIds || []);
        BGT.state.gameLogs = BGT.mergeLogsById(mapped, local).filter(function (l) {
          return !delSet.has(l.id);
        });
      }
    }
    if (cloud.playerPrefs) applyPrefs(cloud.playerPrefs);
    lastKnownUpdated = cloud.lastUpdated || '';
    BGT.persistLocal();
    if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  });
}

window.saveDataToFirebase = saveToCloud;

window.forcePullFromCloud = async function () {
  cloudReady = false;
  if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('local');
  const ok = await loadFromCloud();
  if (ok && typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');
  if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  return ok;
};

window.getAuthUser = function () { return auth.currentUser || window.__bgtAuthUser; };

window.authSignIn = async function (email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};
window.authRegister = async function (email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
};
window.authSignOut = async function () {
  if (unsubSnapshot) { try { unsubSnapshot(); } catch (e) {} unsubSnapshot = null; }
  cloudReady = false;
  await signOut(auth);
};

onAuthStateChanged(auth, async function (user) {
  window.__bgtAuthUser = user || null;
  document.body.classList.toggle('bgt-authed', !!user);
  if (user) {
    cloudReady = false;
    startListener();
    await loadFromCloud();
    if (typeof BGT.claimAdminIfNone === 'function' && BGT.claimAdminIfNone()) {
      try { await saveToCloud({ forceLogs: true }); } catch (e) {}
    }
    const linked = BGT.getMyLinkedPlayer();
    document.body.classList.toggle('bgt-linked', !!linked);
    if (typeof BGT.applyAdminUI === 'function') BGT.applyAdminUI();
    if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('ok');
    if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  } else {
    if (unsubSnapshot) { try { unsubSnapshot(); } catch (e) {} unsubSnapshot = null; }
    cloudReady = false;
    document.body.classList.remove('bgt-linked');
    document.body.classList.remove('bgt-admin');
    if (typeof BGT.applyAdminUI === 'function') BGT.applyAdminUI();
    if (typeof BGT.updateSyncPill === 'function') BGT.updateSyncPill('off');
    if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  }
});

BGT.saveAll = function () {
  BGT.persistLocal();
  if (cloudReady) saveToCloud();
};

window.BGTCloud = { save: saveToCloud, load: loadFromCloud, ready: function () { return cloudReady; } };
