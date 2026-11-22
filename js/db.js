// DBの薄いラッパー。Firebase RTDB か、ローカルお試しモード（localStorage）のどちらかで動く。
import { FIREBASE_CONFIG } from './config.js';

const forceMock = new URLSearchParams(location.search).has('mock');
export const MOCK = forceMock || !FIREBASE_CONFIG.apiKey;
export const TS = { '.sv': 'timestamp' };

let api, authApi;

if (!MOCK) {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const D = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const fapp = initializeApp(FIREBASE_CONFIG);
  const db = D.getDatabase(fapp);
  const auth = A.getAuth(fapp);
  await auth.authStateReady();
  // 参加者・タイマー画面は自動で匿名ログイン（管理者画面は Google ログイン）
  if (!auth.currentUser && !location.pathname.endsWith('admin.html')) await A.signInAnonymously(auth);
  authApi = {
    user: () => auth.currentUser,
    uid: () => auth.currentUser?.uid || null,
    google: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    signOut: () => A.signOut(auth),
  };
  const R = p => D.ref(db, p);
  let offset = 0;
  D.onValue(R('.info/serverTimeOffset'), s => { offset = s.val() || 0; });
  api = {
    get: async p => (await D.get(R(p))).val(),
    set: (p, v) => D.set(R(p), v),
    update: (p, v) => D.update(R(p), v),
    on: (p, cb) => D.onValue(R(p), s => cb(s.val())),
    // fn が undefined を返すと中止。allowNull=false のときは「まだ読めていないnull」を素通しする
    txn: async (p, fn, allowNull = false) => {
      const r = await D.runTransaction(R(p), cur => (cur === null && !allowNull) ? null : fn(cur));
      return r.committed ? r.snapshot.val() : undefined;
    },
    now: () => Date.now() + offset,
    presence: p => {
      D.onValue(R('.info/connected'), s => {
        if (s.val()) { D.onDisconnect(R(p)).remove(); D.set(R(p), true); }
      });
    },
  };
} else {
  // ---- ローカルお試しモード：同じブラウザのタブ間で localStorage を共有 ----
  const KEY = 'xmas_mockdb';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let data = load();
  const subs = new Set();
  const segs = p => p.split('/').filter(Boolean);
  const getP = (root, p) => segs(p).reduce((o, k) => (o == null ? undefined : o[k]), root) ?? null;
  const resolve = v => {
    if (v && typeof v === 'object') {
      if (v['.sv'] === 'timestamp') return Date.now();
      const o = Array.isArray(v) ? [] : {};
      for (const k in v) { const r = resolve(v[k]); if (r != null) o[k] = r; }
      return (Array.isArray(o) ? o.length : Object.keys(o).length) ? o : null;
    }
    return v;
  };
  const setP = (p, v) => {
    const s = segs(p); v = resolve(v);
    if (!s.length) { data = v || {}; return; }
    let o = data; const stack = [];
    for (const k of s.slice(0, -1)) {
      if (o[k] == null || typeof o[k] !== 'object') { if (v == null) return; o[k] = {}; }
      stack.push([o, k]); o = o[k];
    }
    const last = s[s.length - 1];
    if (v == null) delete o[last]; else o[last] = v;
    for (let i = stack.length - 1; i >= 0; i--) {        // 空になった親を消す
      const [par, k] = stack[i];
      if (par[k] && typeof par[k] === 'object' && !Object.keys(par[k]).length) delete par[k];
    }
  };
  const fire = () => {
    for (const s of subs) {
      const v = getP(data, s.p), j = JSON.stringify(v);
      if (j !== s.last) { s.last = j; s.cb(v == null ? null : JSON.parse(j)); }
    }
  };
  const commit = () => { localStorage.setItem(KEY, JSON.stringify(data)); setTimeout(fire, 0); };
  addEventListener('storage', e => { if (e.key === KEY) { data = load(); fire(); } });
  api = {
    get: async p => { data = load(); return structuredClone(getP(data, p)); },
    set: async (p, v) => { data = load(); setP(p, v); commit(); },
    update: async (p, obj) => {
      data = load();
      for (const [k, v] of Object.entries(obj)) setP(`${p}/${k}`, v);
      commit();
    },
    on: (p, cb) => {
      const s = { p, cb, last: undefined }; subs.add(s);
      setTimeout(() => { const v = getP(data, p); s.last = JSON.stringify(v); cb(v == null ? null : structuredClone(v)); }, 0);
      return () => subs.delete(s);
    },
    txn: async (p, fn, allowNull = false) => {
      data = load();
      const cur = getP(data, p);
      if (cur == null && !allowNull) return undefined;
      const nv = fn(cur == null ? null : structuredClone(cur));
      if (nv === undefined) return undefined;
      setP(p, nv); commit();
      return structuredClone(getP(data, p));
    },
    now: () => Date.now(),
    presence: p => {
      api.set(p, true);
      addEventListener('pagehide', () => { data = load(); setP(p, null); localStorage.setItem(KEY, JSON.stringify(data)); });
    },
  };
}

if (!authApi) authApi = { user: () => ({ email: 'local', uid: 'local' }), uid: () => 'local', google: async () => {}, signOut: async () => {} };
export const db = api;
export const auth = authApi;
