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
        setTimeout(function () { saveToCloud({ forceLogs: true }); }, 400);
        return true;
      }
      cloudReady = true;
      return false;
    }
    const cloud = snap.data();
    if (cloud.myGamesObj) BGT.state.myGamesObj = cloud.myGamesObj;
    if (cloud.myPlayers) BGT.state.myPlayers = cloud.myPlayers;

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

    BGT.state.gameLogs = merged;
    if (cloud.playerPrefs) applyPrefs(cloud.playerPrefs);
    if (cloud.admins) {
      try { localStorage.setItem('bgAdmins', JSON.stringify(cloud.admins)); } catch (e) {}
      window.__bgtAdmins = cloud.admins;
    }
    lastKnownUpdated = cloud.lastUpdated || '';
    BGT.persistLocal();
    cloudReady = true;

    if (merged.length && (!cloud.gameLogs || !cloud.gameLogs.length)) {
      setTimeout(function () { saveToCloud({ forceLogs: true }); }, 400);
    }
    return true;
  } catch (e) {
    console.error(e);
    cloudReady = true;
    return false;
  }
}

async function saveToCloud(opts) {
  opts = opts || {};
  if (!auth.currentUser) return false;
  if (!cloudReady && !opts.forceLogs) return false;
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
      BGT.state.gameLogs = logsWithId;
      BGT.persistLocal();
    }

    let admins = { uids: [], emails: [] };
    try { admins = JSON.parse(localStorage.getItem('bgAdmins') || '{"uids":[],"emails":[]}'); } catch (e) {}

    const payload = {
      myGamesObj: BGT.state.myGamesObj,
      myPlayers: BGT.state.myPlayers,
      playerPrefs: collectPrefs(),
      admins: admins,
      lastUpdated: new Date().toISOString(),
      updatedBy: auth.currentUser.uid
    };
    if (logsWithId !== null && (logsWithId.length > 0 || opts.allowEmptyLogs)) {
      payload.gameLogs = logsWithId;
    }

    await setDoc(docRef, payload, { merge: true });
    lastKnownUpdated = payload.lastUpdated;

    if (logsWithId && logsWithId.length > 0) {
      try {
        await setDoc(backupDocRef, {
          gameLogs: logsWithId,
          myGamesObj: BGT.state.myGamesObj,
          myPlayers: BGT.state.myPlayers,
          playerPrefs: collectPrefs(),
          savedAt: new Date().toISOString(),
          count: logsWithId.length
        }, { merge: true });
      } catch (e) {}
    }
    return true;
  } catch (e) {
    console.error(e);
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
    const linked = BGT.getMyLinkedPlayer();
    document.body.classList.toggle('bgt-linked', !!linked);
    if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  } else {
    if (unsubSnapshot) { try { unsubSnapshot(); } catch (e) {} unsubSnapshot = null; }
    cloudReady = false;
    document.body.classList.remove('bgt-linked');
    if (typeof BGT.refreshAll === 'function') BGT.refreshAll();
  }
});

BGT.saveAll = function () {
  BGT.persistLocal();
  if (cloudReady) saveToCloud();
};

window.BGTCloud = { save: saveToCloud, load: loadFromCloud, ready: function () { return cloudReady; } };
