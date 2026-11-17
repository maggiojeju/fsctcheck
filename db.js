// 데이터 저장소: Firebase Realtime Database, 설정이 없으면 데모 모드(localStorage + 탭 간 동기화)
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const hub = window.parent !== window && new URLSearchParams(location.search).has("hub");
  const useFirebase = !hub && !!(cfg.apiKey && cfg.databaseURL && window.firebase);
  const ROOT = "factcheck_d1";

  function split(path) { return path.split("/").filter(Boolean); }

  let api;
  if (useFirebase) {
    firebase.initializeApp(cfg);
    const db = firebase.database();
    api = {
      mode: "firebase",
      set: (path, val) => db.ref(`${ROOT}/${path}`).set(val),
      update: (path, val) => db.ref(`${ROOT}/${path}`).update(val),
      remove: path => db.ref(`${ROOT}/${path}`).remove(),
      listen(path, cb) {
        const r = db.ref(`${ROOT}/${path}`);
        const h = s => cb(s.val());
        r.on("value", h);
        return () => r.off("value", h);
      },
      onConnection(cb) {
        const r = db.ref(".info/connected");
        r.on("value", s => cb(!!s.val()));
      },
      now: () => firebase.database.ServerValue.TIMESTAMP
    };
  } else if (hub) {
    // 미리보기: 바깥 화면(index.html)이 데이터를 갖고, 안쪽 화면들은 postMessage로 주고받기
    let tree = {}; const listeners = new Set();
    const get = (t, path) => split(path).reduce((o, k) => (o == null ? null : (o[k] === undefined ? null : o[k])), t);
    const notify = () => listeners.forEach(l => l.cb(get(tree, l.path)));
    window.addEventListener("message", e => { if (e.data && e.data.fc === "tree") { tree = e.data.tree || {}; notify(); } });
    const send = (path, val, merge) => { window.parent.postMessage({ fc: "write", path: `${ROOT}/${path}`, val, merge }, "*"); return Promise.resolve(); };
    window.parent.postMessage({ fc: "hello" }, "*");
    api = {
      mode: "demo",
      set: (p, v) => send(p, v, false), update: (p, v) => send(p, v, true), remove: p => send(p, null, false),
      listen(path, cb) { const l = { path: `${ROOT}/${path}`, cb }; listeners.add(l); cb(get(tree, l.path)); return () => listeners.delete(l); },
      onConnection(cb) { cb(true); },
      now: () => Date.now()
    };
  } else {
    const KEY = "fc_demo_db";
    const chan = "BroadcastChannel" in window ? new BroadcastChannel("fc_demo") : null;
    const listeners = new Set();
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const get = (tree, path) => split(path).reduce((o, k) => (o == null ? null : (o[k] === undefined ? null : o[k])), tree);
    const notify = () => { const t = load(); listeners.forEach(l => l.cb(get(t, l.path))); };
    function write(path, val, merge) {
      const t = load(); const ks = split(`${ROOT}/${path}`); let o = t;
      for (let i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
      const last = ks[ks.length - 1];
      if (val === null) delete o[last];
      else if (merge && typeof o[last] === "object" && o[last]) Object.assign(o[last], val);
      else o[last] = val;
      try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {}
      notify(); if (chan) chan.postMessage("x");
      return Promise.resolve();
    }
    if (chan) chan.onmessage = notify;
    window.addEventListener("storage", e => { if (e.key === KEY) notify(); });
    api = {
      mode: "demo",
      set: (p, v) => write(p, v, false),
      update: (p, v) => write(p, v, true),
      remove: p => write(p, null, false),
      listen(path, cb) {
        const l = { path: `${ROOT}/${path}`, cb }; listeners.add(l);
        cb(get(load(), l.path));
        return () => listeners.delete(l);
      },
      onConnection(cb) { cb(true); },
      now: () => Date.now()
    };
  }
  window.DB = api;
})();
