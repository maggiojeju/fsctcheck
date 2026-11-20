// 3일차 활동 화면 (교사·학생 공용). app2.js 뒤에 불러옵니다.
// 데이터 위치: ans/{활동id}/{학생id} (작은 정보), blob/site/{학생id} (사이트 코드), blob/card/{학생id} (카드뉴스 그림들)
// blob은 화면 목록에서 듣지 않고, 열어 볼 때만 한 번 불러옵니다(데이터 절약).
(function () {
  const { esc, frame, bars, stat, pct } = UI;
  const NEW = ["pvote", "recap", "codelab", "siteup", "sitegal", "report", "cardup", "cardvote", "cardresult", "award3"];
  const INPUT = ["codelab", "siteup", "report", "cardup"];
  UI2.TYPES.push(...NEW); UI2.INPUT_TYPES.push(...INPUT); UI2.REVEAL_TYPES.push("cardresult", "award3", "pvote");

  const A = (D, id) => ((D.ans || {})[id]) || {};
  const nameOf = (D, sid) => ((D.students || {})[sid] || {}).name || "";
  const room = () => (typeof ROOM !== "undefined" ? ROOM : (window.DEFAULT_ROOM || "3-2"));
  const put = (path, val) => (val === null ? DB.remove(`${room()}/${path}`) : DB.set(`${room()}/${path}`, val));
  const LS = { get(k) { try { return JSON.parse(SAFE.get(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  const dkey = (sid, id) => `fc3_${room()}_${sid}_${id}`;
  const $1 = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  let C = { D: { state: {} }, ctx: { role: "student" } };

  function once(path) {
    return new Promise(res => {
      let done = false, off = null;
      off = DB.listen(`${room()}/${path}`, v => { if (done) return; done = true; res(v); if (off) setTimeout(() => off(), 0); });
      if (done && off) off();
    });
  }
  function siteUrl(sid) { const u = new URL("site.html", location.href); u.search = ""; u.searchParams.set("room", room()); u.searchParams.set("sid", sid); return u.href; }
  function copyText(t, btn) {
    const ok = () => { if (btn) { const o = btn.textContent; btn.textContent = "✓ 복사했어요"; setTimeout(() => (btn.textContent = o), 1500); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove(); }
  }

  // ---------- 화면 위에 뜨는 창 (사이트 보기, 카드뉴스 넘겨 보기, 보고서 보기)
  function ov(html) {
    let o = document.getElementById("x3ov");
    if (!o) { o = document.createElement("div"); o.id = "x3ov"; document.body.appendChild(o); }
    o.innerHTML = html || ""; document.body.style.overflow = html ? "hidden" : "";
  }
  const BADGE = `<div style="position:fixed;right:8px;bottom:8px;z-index:2147483647;background:#d2423a;color:#fff;font:700 12px/1.2 sans-serif;padding:5px 9px;border-radius:8px;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.3)">수업용 가짜 사이트</div>`;
  const SHIM = `<script>(function(){function M(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].length}catch(e){try{Object.defineProperty(window,n,{value:M(),configurable:true})}catch(e2){}}})})();<\/script>`;
  function wrapSite(code) {
    let c = String(code || ""); const lo = c.toLowerCase(), h = lo.indexOf("<head"), he = h >= 0 ? lo.indexOf(">", h) : -1;
    c = he >= 0 ? c.slice(0, he + 1) + SHIM + c.slice(he + 1) : SHIM + c;
    const i = c.toLowerCase().lastIndexOf("</body>"); return i >= 0 ? c.slice(0, i) + BADGE + c.slice(i) : c + BADGE;
  }
  window.X3 = { wrapSite, BADGE };


  // ======================================================== 1교시: 옛날 기사 전시 · 투표
  function pvote(step, D, ctx) {
    const H = ((D.hidden2 || {})[step.src]) || {}, votes = A(D, step.id), rv = !!D.state.reveal;
    const list = Object.entries(((D.posts || {})[step.src]) || {}).filter(([sid, e]) => e && (ctx.role === "teacher" || !H[sid])).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    const cnt = {}; Object.values(votes).forEach(t => { if (t) cnt[t] = (cnt[t] || 0) + 1; });
    const my = votes[ctx.sid];
    const tile = ([sid, e]) => `<div class="ent x3card ${sid === ctx.sid ? "mine" : ""} ${my === sid ? "voted" : ""}"><button class="x3cov" data-open="${step.src}/${sid}">${e.img ? `<img src="${e.img}" alt="">` : `<div class="noimg">📰 ${esc(e.kw || "")}</div>`}</button>
      <div class="b"><div class="k">${esc(e.kw || "")} · ${esc(e.m2date || "")}</div><div class="tt">${esc(e.title || "")}</div><div class="nm" style="margin:4px 0">${esc(String(e.m2what || "").slice(0, 70))}${String(e.m2what || "").length > 70 ? "…" : ""}</div><div class="nm">${esc(nameOf(D, sid) || e.name || "")}${H[sid] ? " <span style='color:#d2423a'>숨김</span>" : ""}${rv ? ` · <b>${cnt[sid] || 0}표</b>` : ""}</div>
      ${ctx.role === "student" && !rv ? (sid === ctx.sid ? `<small class="hint">내 기사</small>` : `<button class="btn ${my === sid ? "" : "ghost"}" data-x3="pv" data-sid="${sid}">${my === sid ? "✓ 투표함" : "투표하기"}</button>`) : ""}</div></div>`;
    let top = "";
    if (rv) {
      const R = list.filter(([sid]) => !H[sid]).map(x => ({ x, n: cnt[x[0]] || 0 })).filter(r => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 3), medal = ["🥇", "🥈", "🥉"];
      top = R.length ? `<div class="x3pod" style="margin-bottom:14px">${R.map((r, i) => `<div class="p${i}"><div class="md">${medal[i]}</div><b>${esc(r.x[1].title || "")}</b><span>${esc(r.x[1].m2date || "")}</span><span>${esc(nameOf(D, r.x[0]) || r.x[1].name || "")} · ${r.n}표</span></div>`).join("")}</div>` : "<p class='hint'>투표가 없어요.</p>";
    }
    const head = rv ? "" : ctx.role === "teacher" ? `<div class="sub">카드를 누르면 자세히 볼 수 있어요. 투표가 끝나면 <b>R 키</b>로 결과를 발표해요.</div>` : `<div class="sub">카드를 눌러 읽어 보고, 가장 놀랍거나 지금의 가짜뉴스와 닮은 기사에 <b>1표</b>! (내 기사에는 투표할 수 없어요 · 발표 전까지 바꿀 수 있어요)</div>`;
    return frame(`${step.title2 || step.title} (${list.length})`, `${head}<div class="stats">${stat("투표", `${Object.keys(votes).length}<small>명</small>`)}${ctx.role === "student" && !rv ? stat("내 투표", my ? "완료" : "아직") : ""}</div>${top}
      ${list.length ? `<div class="gal">${list.map(tile).join("")}</div>` : "<p class='hint'>아직 올라온 기사가 없어요.</p>"}`);
  }
  // ======================================================== 1교시: 우리가 만든 결과물
  function recap(step, D) {
    const P = D.posts || {}, H = D.hidden2 || {};
    const list = id => Object.entries(P[id] || {}).filter(([sid]) => !((H[id] || {})[sid])).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    const ent = Object.entries(D.entries || {}).filter(([sid]) => !(D.hidden || {})[sid]);
    const ai = list("aiimg"), fp = list("fakepost"), iq = list("imgquiz");
    const chips = arr => arr.length ? `<div class="x3chips">${arr.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : `<p class="hint">아직 없어요.</p>`;
    const thumbs = arr => arr.length ? `<div class="x3thumbs">${arr.slice(0, 16).map(([sid, e]) => `<figure><img src="${e.img}" alt=""><figcaption>${esc(nameOf(D, sid) || e.name || "")}</figcaption></figure>`).join("")}</div>` : `<p class="hint">아직 없어요.</p>`;
    return frame("1~2일차에 우리가 만든 것들", `<div class="stats">${stat("가짜뉴스 출품", `${ent.length}<small>개</small>`)}${stat("이미지 퀴즈", `${iq.length}<small>개</small>`)}${stat("AI 그림", `${ai.length}<small>장</small>`)}${stat("가짜 게시물", `${fp.length}<small>개</small>`)}</div>
      <div class="g2"><div><h3 class="h">1일차 · 역대급 가짜뉴스 출품작</h3>${chips(ent.map(([, e]) => e.title))}
      <h3 class="h">2일차 · 가짜 게시물 (오늘의 재료!)</h3>${chips(fp.map(([sid, e]) => `${e.title} — ${nameOf(D, sid) || e.name || ""}`))}</div>
      <div><h3 class="h">2일차 · AI 그림</h3>${thumbs(ai)}</div></div>
      <div class="callout" style="margin:12px 0 0">어제 만든 가짜 게시물 → 2교시에 ‘가짜 뉴스 사이트’로 키우고 → 3교시에 친구들이 팩트체크해요</div>`);
  }

  // ======================================================== 2교시: 코드 실습
  const LAB_DEF = {
    html: `<h1 id="name">체카</h1>
<p id="hello">안녕하세요! 만나서 반가워요.</p>
<button id="btn">점수 올리기</button>
<p>점수: <b id="score">0</b></p>`,
    css: `body { background: #fff3c4; text-align: center; font-family: sans-serif; }
h1 { color: #1b2a6b; font-size: 40px; }
button { background: #2f5bd3; color: white; font-size: 20px;
  padding: 10px 20px; border: 0; border-radius: 12px; }`,
    js: `let score = 0;
document.getElementById("btn").onclick = function () {
  score = score + 1;
  document.getElementById("score").textContent = score;
};`
  };
  const grab = (s, re) => { const m = String(s || "").match(re); return m ? m[1].replace(/\s+/g, " ").trim() : null; };
  const LAB_M = [
    { k: "name", lang: "HTML", t: "이름 바꾸기", how: "<code>&lt;h1&gt;</code> 안의 ‘체카’를 내 이름으로", ok: c => { const v = grab(c.html, /<h1[^>]*>([\s\S]*?)<\/h1>/i); return !!v && v !== "체카"; } },
    { k: "hello", lang: "HTML", t: "인사말 바꾸기", how: "<code>id=\"hello\"</code> 문장을 나만의 인사말로", ok: c => { const v = grab(c.html, /<p[^>]*id=["']?hello["']?[^>]*>([\s\S]*?)<\/p>/i); return !!v && v !== "안녕하세요! 만나서 반가워요."; } },
    { k: "bg", lang: "CSS", t: "배경색 바꾸기", how: "<code>body</code>의 <code>background</code> 값을 바꾸기 (예: <code>pink</code>, <code>#c8f7dc</code>)", ok: c => { const v = grab(c.css, /body\s*\{[^}]*background(?:-color)?\s*:\s*([^;}]+)/i); return !!v && v.toLowerCase() !== "#fff3c4"; } },
    { k: "title", lang: "CSS", t: "제목 꾸미기", how: "<code>h1</code>의 <code>color</code>나 <code>font-size</code> 바꾸기", ok: c => { const v = grab(c.css, /h1\s*\{([^}]*)\}/i); return v != null && v.replace(/\s/g, "") !== "color:#1b2a6b;font-size:40px;"; } },
    { k: "score", lang: "JS", t: "점수 규칙 바꾸기", how: "<code>score + 1</code>을 <code>score + 10</code>처럼 바꾸기", ok: c => { const m = String(c.js).match(/score\s*=\s*score\s*\+\s*(\d+)/) || String(c.js).match(/score\s*\+=\s*(\d+)/); return !!m && +m[1] !== 1; } },
    { k: "msg", lang: "JS", t: "도전! 누르면 인사말도 바뀌게", how: "함수 안에 한 줄 추가:<br><code>document.getElementById(\"hello\").textContent = \"점수가 올랐어요!\";</code>", ok: c => /getElementById\(\s*["']hello["']\s*\)\s*\.\s*(textContent|innerText|innerHTML)\s*=/.test(String(c.js)) }
  ];
  const labDoc = c => `<!doctype html><html><head><meta charset="utf-8"><style>${c.css}</style></head><body>${c.html}<script>window.onerror=function(m){parent.postMessage({x3err:String(m)},"*")};<\/script><script>${String(c.js).replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
  const labCode = sid => Object.assign({}, LAB_DEF, LS.get(dkey(sid, "lab")) || {});
  function codelab(step, D, ctx) {
    const a = A(D, step.id);
    const head = `<div class="g3 x3roles"><div class="r html"><b>HTML</b> 뼈대 · 무엇이 있나</div><div class="r css"><b>CSS</b> 옷 · 어떻게 보이나</div><div class="r js"><b>JS</b> 움직임 · 누르면 어떻게 되나</div></div>`;
    if (ctx.role !== "student") {
      const done = k => Object.values(a).filter(v => v && (v.done || []).includes(k)).length;
      const rows = Object.entries(a).map(([sid, v]) => ({ sid, n: (v.done || []).length })).sort((x, y) => y.n - x.n);
      return frame("코드 실습 · 세 언어 바꿔 보기", `${head}<div class="g2"><div><iframe class="x3pv" sandbox="allow-scripts" srcdoc="${esc(labDoc(LAB_DEF))}"></iframe>
        <h3 class="h">미션별 성공 인원 (${Object.keys(a).length}명 저장)</h3>${bars(LAB_M.map(m => [`${m.lang} · ${m.t}`, done(m.k), ""]))}</div>
        <div><h3 class="h">미션 개수 순위</h3><table class="rank"><tr><th>순</th><th>이름</th><th>미션</th></tr>${rows.slice(0, 15).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(nameOf(D, r.sid))}</td><td>${"✓".repeat(r.n)} ${r.n}/${LAB_M.length}</td></tr>`).join("")}</table></div></div>`);
    }
    const c = labCode(ctx.sid), saved = (a[ctx.sid] || {}).done || [];
    const ed = (k, label) => `<label class="x3lab-l ${k}">${label}</label><textarea class="x3ed ${k}" data-lab="${k}" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${k === "html" ? 5 : 6}">${esc(c[k])}</textarea>`;
    return frame("코드 실습 · 세 언어 바꿔 보기", `${head}<div class="x3lab"><div>${ed("html", "HTML · 뼈대")}${ed("css", "CSS · 옷")}${ed("js", "JavaScript · 움직임")}</div>
      <div><div class="x3pvh">미리 보기 <small>(고치면 바로 바뀌어요 · 버튼도 눌러 보세요)</small></div><iframe class="x3pv" id="x3pv" sandbox="allow-scripts"></iframe><div class="x3err" id="x3err"></div>
      <div class="x3ms" id="x3ms">${labMissions(c, saved)}</div>
      <div class="actions"><button class="btn" data-x3="labsave">미션 확인하고 저장</button><button class="btn ghost" data-x3="labreset">처음 코드로</button></div>
      <p class="hint">저장한 미션: <b>${saved.length} / ${LAB_M.length}</b> · 저장해야 선생님 화면에 기록돼요</p></div></div>`);
  }
  function labMissions(c, saved) {
    return LAB_M.map(m => { const ok = m.ok(c); return `<div class="x3m1 ${ok ? "ok" : ""}"><span class="lg ${m.lang.toLowerCase()}">${m.lang}</span><div><b>${ok ? "✓ " : ""}${m.t}</b>${saved.includes(m.k) ? " <small>(저장됨)</small>" : ""}<br><small>${m.how}</small></div></div>`; }).join("");
  }
  let labTimer = null;
  function labLive(sid, now) {
    clearTimeout(labTimer);
    labTimer = setTimeout(() => {
      const f = $1("#x3pv"); if (!f) return;
      const c = labCode(sid); const e = $1("#x3err"); if (e) e.textContent = "";
      f.srcdoc = labDoc(c);
      const ms = $1("#x3ms"); if (ms) ms.innerHTML = labMissions(c, ((A(C.D, "codelab")[sid]) || {}).done || []);
    }, now ? 0 : 350);
  }
  window.addEventListener("message", e => { if (e.data && e.data.x3err) { const el = $1("#x3err"); if (el) el.textContent = "⚠️ 자바스크립트 오류: " + e.data.x3err + " (괄호, 따옴표, 세미콜론을 확인해 보세요)"; } });

  // ======================================================== 2교시: 사이트 올리기 · 전시장
  const TRICKS3 = ["진짜 같은 디자인", "속보·단독 표시", "기자 이름·날짜", "감정 자극", "출처 불분명", "일부 사실 섞기", "자극적 제목", "빠른 공유 유도", "조회수·댓글 부풀리기"];
  const MAX_CODE = 400000;
  function siteCard(D, sid, e, ctx) {
    const fool = Object.values(A(D, "sitefool")).filter(m => m && m[sid]).length;
    return `<button class="ent x3site ${sid === ctx.sid ? "mine" : ""}" data-x3="site" data-sid="${sid}"><span class="stamp">수업용 가짜</span><div class="x3mast"><b>${esc(e.title || "")}</b><span>${esc(e.headline || "")}</span></div>
      <div class="b"><div class="nm">${esc(nameOf(D, sid) || e.name || "")}${fool ? ` · 😱 ${fool}` : ""}${(D.hidden2 && (D.hidden2.site || {})[sid]) ? " <span style='color:#d2423a'>숨김</span>" : ""}</div></div></button>`;
  }
  function siteList(D, ctx) {
    const H = (D.hidden2 || {}).site || {};
    return Object.entries(A(D, "site")).filter(([sid, e]) => e && e.title && (ctx.role === "teacher" || !H[sid])).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  }
  function siteup(step, D, ctx) {
    if (ctx.role !== "student") {
      const list = siteList(D, ctx);
      return frame("가짜 뉴스 사이트 올리기", `<div class="stats">${stat("올린 사이트", `${list.length}<small>개</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div>
        ${list.length ? `<div class="gal">${list.map(([sid, e]) => siteCard(D, sid, e, ctx)).join("")}</div>` : "<p class='hint'>아직 올라온 사이트가 없어요.</p>"}<p class="hint">카드를 누르면 사이트가 열려요. 🔒 숨긴 거짓도 거기서 볼 수 있어요.</p>`);
    }
    const saved = A(D, "site")[ctx.sid];
    const dr = Object.assign({}, saved || {}, LS.get(dkey(ctx.sid, "site")) || {});
    const v = k => esc(dr[k] || "");
    return frame("가짜 뉴스 사이트 올리기", `<div class="form">
      ${saved ? `<div class="done">올리기 완료! 고쳐서 다시 올리면 바뀌어요. <div class="actions" style="margin:8px 0 0"><button class="btn" data-x3="site" data-sid="${ctx.sid}">내 사이트 보기</button><button class="btn ghost" data-x3="copylink" data-url="${esc(siteUrl(ctx.sid))}">🔗 내 사이트 주소 복사</button></div></div>` : `<div class="sub">제미나이에서 만든 코드를 붙여 넣거나 .html 파일을 골라요. 🔒 칸은 선생님만 봐요.</div>`}
      <label>가짜 언론사(사이트) 이름 *</label><input type="text" data-s="title" maxlength="40" value="${v("title")}" placeholder="예: 제주해피뉴스">
      <label>메인 기사 제목 *</label><input type="text" data-s="headline" maxlength="100" value="${v("headline")}">
      <label>사용한 속임수 * <small>(2개 이상)</small></label><div class="checks">${TRICKS3.map(o => `<label><input type="checkbox" data-sc="${esc(o)}" ${(dr.tricks || []).includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>
      <label>🔒 숨겨 둔 거짓 *</label><textarea data-s="lie" maxlength="1000" rows="3">${v("lie")}</textarea>
      <label>🔒 진실과 근거 출처 *</label><textarea data-s="truth" maxlength="1000" rows="3">${v("truth")}</textarea>
      <label>사이트 코드 * <small>(파일 고르기 또는 붙여 넣기)</small></label>
      <input type="file" data-x3file="site" accept=".html,.htm,text/html">
      <textarea data-s="code" class="x3codein" rows="7" spellcheck="false" placeholder="여기에 &lt;!DOCTYPE html&gt; 로 시작하는 코드를 통째로 붙여 넣어요">${v("code")}</textarea>
      <div class="cnt" id="x3csize">${dr.code ? `${Math.round(dr.code.length / 1000)}KB` : saved ? `이미 올린 코드가 있어요 (${Math.round((saved.size || 0) / 1000)}KB). 바꾸려면 새 코드를 넣어요.` : ""}</div>
      <div class="actions"><button class="btn ghost" data-x3="sitepre">미리 보기</button><button class="btn" data-x3="sitesend">올리기</button></div><p class="hint" id="x3msg"></p></div>`);
  }
  function siteCollect(sid) {
    const d = Object.assign({}, LS.get(dkey(sid, "site")) || {});
    $$("[data-s]").forEach(i => (d[i.dataset.s] = i.value));
    d.tricks = $$("[data-sc]").filter(c => c.checked).map(c => c.dataset.sc);
    if (!LS.set(dkey(sid, "site"), d)) { const c = d.code; delete d.code; LS.set(dkey(sid, "site"), d); d.code = c; }
    const z = $1("#x3csize"); if (z && d.code) z.textContent = `${Math.round(d.code.length / 1000)}KB${d.code.length > MAX_CODE ? " · 너무 커요(400KB까지)" : ""}`;
    return d;
  }
  async function siteSend(btn) {
    const sid = C.ctx.sid, d = siteCollect(sid), saved = A(C.D, "site")[sid], m = $1("#x3msg");
    const miss = [];
    if (!String(d.title || "").trim()) miss.push("사이트 이름"); if (!String(d.headline || "").trim()) miss.push("메인 기사 제목");
    if ((d.tricks || []).length < 2) miss.push("속임수 2개 이상");
    if (!String(d.lie || "").trim()) miss.push("숨겨 둔 거짓"); if (!String(d.truth || "").trim()) miss.push("진실과 근거");
    const code = String(d.code || "").trim();
    if (!code && !saved) miss.push("사이트 코드");
    if (miss.length) { m.textContent = "아직 비어 있어요: " + miss.join(", "); return; }
    if (code && !/<[a-z!]/i.test(code)) { m.textContent = "HTML 코드가 아닌 것 같아요. 제미나이 캔버스의 ‘코드’를 통째로 복사해 붙여 넣어요."; return; }
    if (code.length > MAX_CODE) { m.textContent = "코드가 너무 커요(400KB까지). 그림을 코드 안에 넣었다면 빼 달라고 제미나이에게 부탁해요."; return; }
    btn.disabled = true; m.textContent = "올리는 중…";
    try {
      if (code) await put(`blob/site/${sid}`, code);
      await put(`ans/site/${sid}`, { title: d.title.trim(), headline: d.headline.trim(), tricks: d.tricks, lie: d.lie.trim(), truth: d.truth.trim(), size: code ? code.length : (saved.size || 0), name: C.ctx.name, at: Date.now() });
      put(`hidden2/site/${sid}`, null);
      LS.set(dkey(sid, "site"), {});
      m.textContent = "올렸어요!";
    } catch (e) { m.textContent = "올리지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요."; btn.disabled = false; }
  }
  function sitegal(step, D, ctx) {
    const list = siteList(D, ctx);
    return frame(`우리 반 가짜 뉴스 사이트 전시장 (${list.length})`, `<div class="sub">카드를 눌러 사이트에 들어가 보세요. ‘가짜 사이트 알아보는 5가지 방법’으로 수상한 점을 찾고, 속을 뻔했으면 😱를 눌러요.</div>
      ${list.length ? `<div class="gal">${list.map(([sid, e]) => siteCard(D, sid, e, ctx)).join("")}</div>` : "<p class='hint'>아직 올라온 사이트가 없어요.</p>"}`);
  }
  let siteOpen = null, showPriv3 = false;
  function siteBar(sid) {
    const D = C.D, e = A(D, "site")[sid] || {}, me = C.ctx;
    const fooled = ((A(D, "sitefool")[me.sid]) || {})[sid];
    const fool = Object.values(A(D, "sitefool")).filter(m => m && m[sid]).length;
    return `<div class="x3bar"><b>⚠️ 수업용 가짜 사이트 · 실제 뉴스가 아니에요</b><span>${esc(e.title || "미리 보기")} · ${esc(nameOf(D, sid) || e.name || "")}${fool ? ` · 😱 ${fool}` : ""}</span><span class="sp"></span>
      ${me.role === "student" && sid !== me.sid && e.title ? `<button class="btn ghost" data-x3="fool" data-sid="${sid}">${fooled ? "😱 취소" : "😱 속을 뻔!"}</button>` : ""}
      ${e.title ? `<button class="btn ghost" data-x3="copylink" data-url="${esc(siteUrl(sid))}">🔗 주소 복사</button><a class="btn ghost" href="${esc(siteUrl(sid))}" target="_blank" rel="noopener">새 창 ↗</a>` : ""}
      ${me.role === "teacher" && e.title ? `<button class="btn ghost" data-x3="priv">${showPriv3 ? "🔒 감추기" : "🔒 숨긴 거짓 보기"}</button><button class="btn warn" data-x3="hide" data-sid="${sid}">${((D.hidden2 || {}).site || {})[sid] ? "숨김 풀기" : "이 사이트 숨기기"}</button>` : ""}
      <button class="btn" data-x3="close">닫기</button></div>
      ${me.role === "teacher" && showPriv3 && e.title ? `<div class="x3priv"><b>🔒 숨긴 거짓</b> ${esc(e.lie)}<br><b>🔒 진실·근거</b> ${esc(e.truth)}<br><small>속임수: ${(e.tricks || []).map(esc).join(" · ")}</small></div>` : ""}`;
  }
  async function openSite(sid, codeOverride) {
    siteOpen = sid;
    ov(`<div class="x3ov"><div class="x3win"><div id="x3barw">${siteBar(sid)}</div><div class="x3frame"><p class="hint" style="padding:20px">사이트를 불러오는 중…</p></div></div></div>`);
    const code = codeOverride != null ? codeOverride : await once(`blob/site/${sid}`);
    const box = $1("#x3ov .x3frame"); if (!box || siteOpen !== sid) return;
    if (!code) { box.innerHTML = "<p class='hint' style='padding:20px'>사이트 코드를 찾을 수 없어요.</p>"; return; }
    const f = document.createElement("iframe"); f.setAttribute("sandbox", "allow-scripts"); f.srcdoc = wrapSite(code);
    box.innerHTML = ""; box.appendChild(f);
  }
  const refreshBar = () => { const w = $1("#x3barw"); if (w && siteOpen) w.innerHTML = siteBar(siteOpen); };

  // ======================================================== 3교시: 팩트체크 보고서
  const METHODS3 = ["논문 검색", "통계 자료", "언론 보도 검색", "옛날 신문(뉴스 라이브러리)", "전문가·기관 자료", "이미지 검색(렌즈)", "법령 검색", "직접 실험·설문", "AI 답변 교차 확인"];
  const SRC3 = ["교안 주제 7개 중 하나", "친구가 만든 가짜 사이트·게시물", "내가 궁금했던 주장"];
  const rpDraft = sid => Object.assign({}, (A(C.D, "report")[sid]) || {}, LS.get(dkey(sid, "report")) || {});
  function report(step, D, ctx) {
    const a = A(D, "report");
    if (ctx.role !== "student") {
      const list = Object.entries(a).filter(([, e]) => e && e.claim).sort((x, y) => (x[1].at || 0) - (y[1].at || 0));
      return frame("팩트체크 보고서", `<div class="stats">${stat("제출", `${list.length}<small>명</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div>
        <div class="g2"><div><h3 class="h">판정 분포</h3>${bars(VERDICTS3.map(([k]) => [k, list.filter(([, e]) => e.verdict === k).length, ""]))}</div>
        <div><h3 class="h">검증 대상 종류</h3>${bars(SRC3.map(k => [k, list.filter(([, e]) => e.src === k).length, ""]))}</div></div>
        <h3 class="h">제출한 보고서 (누르면 크게 보기)</h3><div class="x3rlist">${list.map(([sid, e]) => `<button data-x3="rpview" data-sid="${sid}"><span class="x3v v${VERDICTS3.findIndex(v => v[0] === e.verdict)}">${esc(e.verdict || "")}</span><b>${esc(e.headline || e.claim)}</b><small>${esc(nameOf(D, sid) || e.name || "")}</small></button>`).join("") || "<p class='hint'>아직 없어요.</p>"}</div>`);
    }
    const saved = a[ctx.sid], d = Object.assign({}, saved || {}, LS.get(dkey(ctx.sid, "report")) || {});
    const v = k => esc(d[k] || "");
    const T = (k, label, ph, mx = 300) => `<label>${label}</label><input type="text" data-r="${k}" maxlength="${mx}" value="${v(k)}" placeholder="${esc(ph || "")}">`;
    const TA = (k, label, ph, rows = 3, mx = 1500) => `<label>${label}</label><textarea data-r="${k}" maxlength="${mx}" rows="${rows}" placeholder="${esc(ph || "")}">${v(k)}</textarea>`;
    const friends = [];
    Object.entries(A(D, "site")).forEach(([sid, e]) => { if (e && e.headline && sid !== ctx.sid && !(((D.hidden2 || {}).site || {})[sid])) friends.push([`${e.headline}`, `${e.title} 사이트 · ${nameOf(D, sid) || e.name || ""}`]); });
    Object.entries(((D.posts || {}).fakepost) || {}).forEach(([sid, e]) => { if (e && e.title && sid !== ctx.sid && !(((D.hidden2 || {}).fakepost || {})[sid])) friends.push([e.title, `2일차 가짜 게시물 · ${nameOf(D, sid) || e.name || ""}`]); });
    const ev = n => `<div class="x3ev"><b>근거 ${n}${n === 1 ? " *" : n === 2 ? " (권장)" : " (선택)"}</b>
      <div class="g2"><div>${T(`e${n}s`, "자료·출처 이름", "예: 국가통계포털 / ○○신문 / 논문 제목", 120)}</div><div>${T(`e${n}d`, "발행일·작성일", "예: 2024.05.10", 40)}</div></div>
      ${T(`e${n}u`, "주소(링크)", "https://…", 400)}${TA(`e${n}c`, "이 자료에서 확인한 내용", "숫자, 결론, 인용 등을 내 말로 정리", 3, 800)}</div>`;
    return frame("팩트체크 보고서 쓰기 (워크북 결과지)", `<div class="form x3rp-form">
      ${saved ? `<div class="done">제출 완료! 고쳐서 다시 제출하면 바뀌어요. PDF는 언제든 받을 수 있어요.</div>` : `<div class="sub">별표(*)는 꼭 채워요. 쓰는 중에 화면이 넘어가도 이 기기에 남아 있어요.</div>`}
      <h3 class="h">① 검증 대상</h3>
      <label>어디서 골랐나요? *</label><select data-r="src">${SRC3.map(o => `<option ${d.src === o ? "selected" : ""}>${o}</option>`).join("")}</select>
      <details class="x3pick"><summary>교안 주제 7개 보기 (누르면 아래 칸에 들어가요)</summary>${TOPICS3.map(t => `<button type="button" data-x3="rpick" data-v="${esc(t)}" data-src="${SRC3[0]}">${esc(t)}</button>`).join("")}</details>
      <details class="x3pick"><summary>친구가 만든 가짜 사이트·게시물 보기 (${friends.length})</summary>${friends.map(([t, s]) => `<button type="button" data-x3="rpick" data-v="${esc(t)}" data-src="${SRC3[1]}" data-where="${esc(s)}">${esc(t)}<small>${esc(s)}</small></button>`).join("") || "<p class='hint'>아직 없어요.</p>"}</details>
      ${TA("claim", "검증 대상 (한 문장으로) *", "예: 커피를 마시면 당뇨병 위험이 낮아진다.", 2, 300)}
      ${T("where", "어디서 봤나요? · 관련 링크", "예: 유튜브 쇼츠 / 친구의 ○○뉴스 사이트 / https://…", 400)}
      ${TA("why", "선정 이유 *", "왜 이 주장을 확인해 보고 싶었나요?", 2, 500)}
      <h3 class="h">② 검증 방법 *</h3><div class="checks">${METHODS3.map(o => `<label><input type="checkbox" data-rc="${esc(o)}" ${(d.methods || []).includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>
      <h3 class="h">③ 검증 내용</h3>${ev(1)}${ev(2)}${ev(3)}
      ${TA("counter", "반대 근거 · 확인하지 못한 점", "다른 결과를 보여 주는 자료, 더 알아봐야 할 점", 2, 800)}
      <h3 class="h">④ 검증 결과 *</h3>
      <div class="x3verds">${VERDICTS3.map(([k, desc], i) => `<label class="x3v v${i}"><input type="radio" name="x3v" value="${k}" ${d.verdict === k ? "checked" : ""}><b>${k}</b><small>${desc}</small></label>`).join("")}</div>
      ${TA("reason", "판정 이유 *", "근거 1, 2를 바탕으로 왜 이렇게 판정했는지", 3, 1000)}
      <h3 class="h">⑤ 보도하기</h3>
      ${T("headline", "보도 제목 *", "예: “커피가 당뇨병을 막는다?” 연구로 확인해 보니 ‘절반의 사실’", 80)}
      ${T("summary", "독자에게 한 줄 *", "예: 커피는 약이 아니에요. 설탕 듬뿍 커피는 오히려 반대!", 120)}
      <div class="actions"><button class="btn" data-x3="rpsend">제출하기</button><button class="btn ghost" data-x3="rppdf">📄 PDF 받기</button><button class="btn ghost" data-x3="rpprint">🖨 인쇄 화면</button><button class="btn ghost" data-x3="rpcopy">📋 글 복사</button></div>
      <p class="hint" id="x3msg"></p>
      <p class="hint">PDF는 그림 PDF라 제미나이·챗GPT에 올려 디자인을 부탁하기 좋아요. 캔바에서 글자를 고치고 싶으면 ‘인쇄 화면’에서 ‘PDF로 저장’을 고르세요.</p></div>`);
  }
  function rpCollect(sid) {
    const d = Object.assign({}, LS.get(dkey(sid, "report")) || {});
    $$("[data-r]").forEach(i => (d[i.dataset.r] = i.value));
    d.methods = $$("[data-rc]").filter(c => c.checked).map(c => c.dataset.rc);
    const r = $1("input[name=x3v]:checked"); if (r) d.verdict = r.value;
    LS.set(dkey(sid, "report"), d);
    return d;
  }
  function rpMissing(d) {
    const m = [];
    [["claim", "검증 대상"], ["why", "선정 이유"], ["e1s", "근거 1 출처"], ["e1c", "근거 1 내용"], ["reason", "판정 이유"], ["headline", "보도 제목"], ["summary", "독자에게 한 줄"]].forEach(([k, l]) => { if (!String(d[k] || "").trim()) m.push(l); });
    if (!(d.methods || []).length) m.push("검증 방법"); if (!d.verdict) m.push("검증 결과");
    return m;
  }
  const RP_CSS = `.x3rp{width:794px;background:#fff;color:#1c2440;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;padding:40px 48px 36px;box-sizing:border-box;line-height:1.6;font-size:15px}
.x3rp *{box-sizing:border-box}.x3rp .mast{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #1b2a6b;padding-bottom:8px;font-weight:800;color:#1b2a6b;letter-spacing:.06em}
.x3rp .mast b{font-size:22px}.x3rp .mast span{font-size:12px;color:#5f6b85;letter-spacing:0;font-weight:600}
.x3rp h1{font-size:28px;line-height:1.35;margin:18px 0 6px;color:#111a3d}.x3rp .by{color:#5f6b85;font-size:13px;margin-bottom:14px}
.x3rp .claim{background:#eef3ff;border-left:6px solid #2f5bd3;border-radius:10px;padding:12px 16px;font-size:18px;font-weight:700}
.x3rp .claim small{display:block;font-size:12px;color:#2f5bd3;font-weight:800;margin-bottom:2px}
.x3rp .meter{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:16px 0 4px}.x3rp .meter div{border-radius:8px;padding:8px 2px;text-align:center;font-size:11.5px;font-weight:700;background:#f0f2f7;color:#9aa3b8}
.x3rp .meter div.on{color:#fff;transform:scale(1.06);box-shadow:0 2px 6px rgba(0,0,0,.2)}
.x3rp .m0.on{background:#1f9d55}.x3rp .m1.on{background:#6bb34a}.x3rp .m2.on{background:#e0a21b}.x3rp .m3.on{background:#e8742c}.x3rp .m4.on{background:#d2423a}.x3rp .m5.on{background:#6b7590}
.x3rp h2{font-size:16px;color:#1b2a6b;border-bottom:2px solid #d9e1f2;padding-bottom:3px;margin:20px 0 8px}
.x3rp p{margin:4px 0;white-space:pre-wrap}.x3rp .chips span{display:inline-block;background:#eef3ff;color:#2f5bd3;border-radius:99px;padding:2px 10px;margin:2px 4px 2px 0;font-size:13px;font-weight:700}
.x3rp .ev{border:1.5px solid #d9e1f2;border-radius:10px;padding:10px 14px;margin:8px 0}.x3rp .ev b{color:#1b2a6b}.x3rp .ev .src{font-size:12.5px;color:#5f6b85;word-break:break-all}
.x3rp .sum{margin-top:18px;background:#1b2a6b;color:#fff;border-radius:12px;padding:12px 16px;font-weight:700;font-size:16px}
.x3rp ol{margin:4px 0;padding-left:20px;font-size:13px;word-break:break-all}.x3rp .foot{margin-top:18px;border-top:1px solid #d9e1f2;padding-top:6px;font-size:11.5px;color:#8a93a8;display:flex;justify-content:space-between}`;
  function reportHtml(d, name) {
    const vi = VERDICTS3.findIndex(x => x[0] === d.verdict);
    const evs = [1, 2, 3].filter(n => String(d[`e${n}s`] || d[`e${n}c`] || "").trim());
    const P = s => `<p>${esc(s || "")}</p>`;
    return `<div class="x3rp"><div class="mast"><b>FACT CHECK</b><span>효돈중 3-2 팩트체크 데스크 · 2026.11.20</span></div>
      <h1>${esc(d.headline || "(보도 제목)")}</h1><div class="by">팩트체크 기자 ${esc(name || "")} · 검증 대상: ${esc(d.src || "")}</div>
      <div class="claim"><small>검증 대상</small>“${esc(d.claim || "")}”</div>
      <div class="meter">${VERDICTS3.map(([k], i) => `<div class="m${i} ${i === vi ? "on" : ""}">${k}</div>`).join("")}</div>
      <h2>왜 검증했나요?</h2>${P(d.why)}${d.where ? `<p style="font-size:13px;color:#5f6b85">어디서 봤나: ${esc(d.where)}</p>` : ""}
      <h2>어떻게 검증했나요?</h2><div class="chips">${(d.methods || []).map(m => `<span>${esc(m)}</span>`).join("")}</div>
      <h2>확인한 근거</h2>${evs.map(n => `<div class="ev"><b>근거 ${n} · ${esc(d[`e${n}s`] || "")}</b>${P(d[`e${n}c`])}<div class="src">${esc([d[`e${n}d`], d[`e${n}u`]].filter(Boolean).join(" · "))}</div></div>`).join("")}
      ${d.counter ? `<h2>반대 근거 · 확인하지 못한 점</h2>${P(d.counter)}` : ""}
      <h2>판정: ${esc(d.verdict || "")}</h2>${P(d.reason)}
      <div class="sum">${esc(d.summary || "")}</div>
      <h2>근거 출처</h2><ol>${evs.map(n => `<li>${esc([d[`e${n}s`], d[`e${n}d`], d[`e${n}u`]].filter(Boolean).join(", "))}</li>`).join("")}</ol>
      <div class="foot"><span>디지털새싹 · 속지 말고 잡아라! 팩트체크</span><span>${esc(name || "")}</span></div></div>`;
  }
  function reportText(d, name) {
    const evs = [1, 2, 3].filter(n => String(d[`e${n}s`] || d[`e${n}c`] || "").trim());
    return [`[팩트체크 보고서] ${d.headline || ""}`, `팩트체크 기자: ${name || ""}`, "", `■ 검증 대상: ${d.claim || ""}`, `■ 어디서 봤나: ${d.where || ""}`, `■ 선정 이유: ${d.why || ""}`, `■ 검증 방법: ${(d.methods || []).join(", ")}`,
      ...evs.map(n => `■ 근거 ${n}: ${d[`e${n}s`] || ""} (${[d[`e${n}d`], d[`e${n}u`]].filter(Boolean).join(", ")})\n   ${d[`e${n}c`] || ""}`), d.counter ? `■ 반대 근거·확인 못한 점: ${d.counter}` : "",
      `■ 검증 결과: ${d.verdict || ""}`, `■ 판정 이유: ${d.reason || ""}`, `■ 독자에게: ${d.summary || ""}`].filter(x => x !== "").join("\n");
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function makePdf(d, name) {
    if (!window.html2canvas) await loadScript("lib/html2canvas.min.js");
    if (!window.jspdf) await loadScript("lib/jspdf.umd.min.js");
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;background:#fff";
    host.innerHTML = `<style>${RP_CSS}</style>${reportHtml(d, name)}`;
    document.body.appendChild(host);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const el = host.querySelector(".x3rp");
      const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const k = canvas.width / el.offsetWidth, pageCss = el.offsetWidth * 297 / 210;
      const ends = [...el.children].map(c => c.offsetTop + c.offsetHeight);
      const total = el.offsetHeight, cuts = [];
      let start = 0;
      while (start < total - 2) {
        let end = Math.min(total, start + pageCss);
        if (end < total) { const fit = ends.filter(e => e > start + 40 && e <= end); if (fit.length) end = Math.max(...fit) + 8; }
        cuts.push([start, Math.min(end, total)]); start = end;
      }
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      cuts.forEach(([s, e], i) => {
        const sl = document.createElement("canvas"); sl.width = canvas.width; sl.height = Math.max(1, Math.round((e - s) * k));
        const g = sl.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, sl.width, sl.height); g.drawImage(canvas, 0, Math.round(s * k), canvas.width, sl.height, 0, 0, canvas.width, sl.height);
        if (i) pdf.addPage();
        pdf.addImage(sl.toDataURL("image/jpeg", 0.92), "JPEG", 0, i ? 8 : 0, 210, sl.height * 210 / canvas.width);
      });
      pdf.save(`팩트체크보고서_${String(name || "").replace(/[\\/:*?"<>|\s]+/g, "_")}.pdf`);
    } finally { host.remove(); }
  }
  function printReport(d, name) {
    const w = window.open("", "_blank");
    if (!w) return false;
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>팩트체크 보고서 - ${esc(name || "")}</title><style>${RP_CSS}@page{size:A4;margin:10mm}body{margin:0;background:#fff}.x3rp{width:auto;padding:8px 6px}.x3rp .ev,.x3rp .claim,.x3rp .sum{break-inside:avoid}.tip{font:14px sans-serif;background:#fff4d6;padding:10px;margin:10px}@media print{.tip{display:none}}</style></head><body><div class="tip">인쇄 창에서 대상(프린터)을 <b>PDF로 저장</b>으로 고르면 글자가 살아 있는 PDF가 돼요. 캔바에서 열어 고칠 수 있어요.</div>${reportHtml(d, name)}<script>setTimeout(function(){window.print()},400)<\/script></body></html>`);
    w.document.close();
    return true;
  }
  function viewReport(d, name) {
    ov(`<div class="x3ov" data-x3="close"><div class="x3win x3paper"><div class="x3bar"><b>팩트체크 보고서</b><span>${esc(name || "")}</span><span class="sp"></span><button class="btn ghost" data-x3="ovpdf">📄 PDF</button><button class="btn" data-x3="close">닫기</button></div><div class="x3scroll"><style>${RP_CSS}.x3scroll .x3rp{margin:0 auto;max-width:100%}</style>${reportHtml(d, name)}</div></div></div>`);
    ovReport = [d, name];
  }
  let ovReport = null;

  // ======================================================== 4교시: 카드뉴스
  const CARD_DRAFT = {};
  function compressImg(file, max, limit) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        let q = 0.82, out = c.toDataURL("image/jpeg", q);
        while (out.length > limit && q > 0.35) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
        res(out); }; img.onerror = rej; img.src = r.result; };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }
  function cardList(D, ctx) {
    const H = (D.hidden2 || {}).cardup || {};
    return Object.entries(A(D, "cardup")).filter(([sid, e]) => e && e.cover && (ctx.role === "teacher" || !H[sid])).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  }
  function cardTile(D, sid, e, ctx, voteMode) {
    const my = A(D, "cvote")[ctx.sid] === sid;
    return `<div class="ent x3card ${sid === ctx.sid ? "mine" : ""} ${my ? "voted" : ""}"><button class="x3cov" data-x3="deck" data-sid="${sid}"><img src="${e.cover}" alt=""><span class="x3n">${e.n || 1}장</span></button>
      <div class="b"><div class="k">${esc(e.verdict || "")}</div><div class="tt">${esc(e.title || "")}</div><div class="nm">${esc(nameOf(D, sid) || e.name || "")}${((D.hidden2 || {}).cardup || {})[sid] ? " <span style='color:#d2423a'>숨김</span>" : ""}</div>
      ${voteMode && ctx.role === "student" ? (sid === ctx.sid ? `<small class="hint">내 카드뉴스</small>` : `<button class="btn ${my ? "" : "ghost"}" data-x3="vote" data-sid="${sid}">${my ? "✓ 투표함" : "투표하기"}</button>`) : ""}</div></div>`;
  }
  function cardup(step, D, ctx) {
    if (ctx.role !== "student") {
      const list = cardList(D, ctx);
      return frame("카드뉴스 올리기", `<div class="stats">${stat("올린 카드뉴스", `${list.length}<small>개</small>`)}${stat("보고서 제출", `${Object.keys(A(D, "report")).length}<small>명</small>`)}</div>
        ${list.length ? `<div class="gal">${list.map(([sid, e]) => cardTile(D, sid, e, ctx)).join("")}</div>` : "<p class='hint'>아직 없어요.</p>"}`);
    }
    const saved = A(D, "cardup")[ctx.sid], rp = A(D, "report")[ctx.sid] || {};
    const dr = Object.assign({ title: rp.headline || "", verdict: rp.verdict || "" }, saved || {}, LS.get(dkey(ctx.sid, "card")) || {});
    return frame("카드뉴스 올리기", `<div class="form">
      ${saved ? `<div class="done">올리기 완료! (${saved.n}장) 다시 올리면 바뀌어요. <button class="btn ghost" data-x3="deck" data-sid="${ctx.sid}">내 카드뉴스 보기</button></div>` : `<div class="sub">캔바에서 PNG(또는 JPG)로 받은 그림을 <b>순서대로</b> 골라요 (최대 8장). 압축 파일(zip)로 받아졌다면 압축을 먼저 풀어요.</div>`}
      <label>카드뉴스 제목 *</label><input type="text" data-c3="title" maxlength="80" value="${esc(dr.title || "")}">
      <label>판정 *</label><select data-c3="verdict"><option value="">고르기</option>${VERDICTS3.map(([k]) => `<option ${dr.verdict === k ? "selected" : ""}>${k}</option>`).join("")}</select>
      <label>카드 그림 * <small>(여러 장 한꺼번에 골라도 돼요)</small></label><input type="file" data-x3file="card" accept="image/*" multiple>
      <div class="x3cprev" id="x3cprev">${cardPrev(ctx.sid)}</div>
      <label>캔바 보기 링크 (선택)</label><input type="text" data-c3="link" maxlength="300" value="${esc(dr.link || "")}" placeholder="캔바 공유 → 보기 전용 링크">
      <div class="actions"><button class="btn" data-x3="cardsend">올리기</button></div><p class="hint" id="x3msg"></p></div>`);
  }
  function cardPrev(sid) {
    const a = CARD_DRAFT[sid] || [];
    if (!a.length) return "";
    return `<div class="x3strip">${a.map((s, i) => `<figure><img src="${s}" alt=""><figcaption>${i + 1}장 <button type="button" data-x3="cmove" data-i="${i}" data-d="-1">◀</button><button type="button" data-x3="cmove" data-i="${i}" data-d="1">▶</button><button type="button" data-x3="cdel" data-i="${i}">✕</button></figcaption></figure>`).join("")}</div>`;
  }
  const cardDraftSave = sid => { const d = {}; $$("[data-c3]").forEach(i => (d[i.dataset.c3] = i.value)); LS.set(dkey(sid, "card"), d); return d; };
  async function cardSend(btn) {
    const sid = C.ctx.sid, d = cardDraftSave(sid), imgs = CARD_DRAFT[sid] || [], m = $1("#x3msg"), saved = A(C.D, "cardup")[sid];
    const miss = []; if (!String(d.title || "").trim()) miss.push("제목"); if (!d.verdict) miss.push("판정"); if (!imgs.length && !saved) miss.push("카드 그림");
    if (miss.length) { m.textContent = "아직 비어 있어요: " + miss.join(", "); return; }
    btn.disabled = true; m.textContent = "올리는 중…";
    try {
      let cover = saved && saved.cover, n = saved ? saved.n : 0;
      if (imgs.length) {
        await put(`blob/card/${sid}`, imgs);
        cover = await new Promise(res => { const img = new Image(); img.onload = () => { const s = Math.min(1, 380 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.72)); }; img.src = imgs[0]; });
        n = imgs.length;
      }
      await put(`ans/cardup/${sid}`, { title: d.title.trim(), verdict: d.verdict, link: (d.link || "").trim(), cover, n, name: C.ctx.name, at: Date.now() });
      put(`hidden2/cardup/${sid}`, null);
      CARD_DRAFT[sid] = []; m.textContent = "올렸어요!";
    } catch (e) { m.textContent = "올리지 못했어요. 그림 수를 줄이거나 인터넷 연결을 확인해 주세요."; btn.disabled = false; }
  }
  function cardvote(step, D, ctx) {
    const list = cardList(D, ctx), votes = A(D, "cvote");
    if (ctx.role !== "student") return frame(`카드뉴스 투표 (${list.length}개)`, `<div class="stats">${stat("투표한 사람", `${Object.keys(votes).length}<small>명</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div><p class="hint">결과는 다음 화면에서 R 키로 발표해요.</p>${list.length ? `<div class="gal">${list.map(([sid, e]) => cardTile(D, sid, e, ctx)).join("")}</div>` : ""}`);
    return frame(`카드뉴스 투표 (${list.length}개)`, `<div class="sub">카드를 눌러 넘겨 보고, 가장 잘 만든 카드뉴스에 <b>1표</b>! (내 카드에는 투표할 수 없어요 · 발표 전까지 바꿀 수 있어요)</div>
      <div class="stats">${stat("내 투표", votes[ctx.sid] ? "완료" : "아직")}</div>${list.length ? `<div class="gal">${list.map(([sid, e]) => cardTile(D, sid, e, ctx, true)).join("")}</div>` : "<p class='hint'>아직 올라온 카드뉴스가 없어요.</p>"}`);
  }
  function cardRank(D) {
    const cnt = {}; Object.values(A(D, "cvote")).forEach(sid => { if (sid) cnt[sid] = (cnt[sid] || 0) + 1; });
    const H = (D.hidden2 || {}).cardup || {};
    return Object.entries(A(D, "cardup")).filter(([sid, e]) => e && e.cover && !H[sid]).map(([sid, e]) => ({ sid, e, n: cnt[sid] || 0 })).sort((a, b) => b.n - a.n || (a.e.at || 0) - (b.e.at || 0));
  }
  function cardresult(step, D, ctx) {
    const rv = !!D.state.reveal, R = cardRank(D);
    if (!rv) return frame("베스트 카드뉴스 발표", `<div class="x3wait">🥁<br>${ctx.role === "teacher" ? "R 키를 누르면 발표해요" : "두근두근… 선생님이 발표할 때까지 기다려요"}</div><div class="stats">${stat("투표", `${Object.keys(A(D, "cvote")).length}<small>명</small>`)}</div>`);
    const top = R.filter(r => r.n > 0).slice(0, 3), medal = ["🥇", "🥈", "🥉"];
    return frame("베스트 카드뉴스 발표", `${top.length ? `<div class="x3pod">${top.map((r, i) => `<div class="p${i}"><div class="md">${medal[i]}</div><button class="x3cov" data-x3="deck" data-sid="${r.sid}"><img src="${r.e.cover}" alt=""></button><b>${esc(r.e.title)}</b><span>${esc(nameOf(D, r.sid) || r.e.name || "")} · ${r.n}표</span></div>`).join("")}</div>` : "<p class='hint'>투표가 없어요.</p>"}
      ${ctx.role === "teacher" ? `<h3 class="h">전체 득표</h3>${bars(R.map(r => [esc(`${r.e.title} (${nameOf(D, r.sid) || r.e.name || ""})`), r.n, ""]), { unit: "표" })}` : ""}`);
  }
  let deck = null;
  async function openDeck(sid) {
    deck = { sid, imgs: null, i: 0 };
    drawDeck();
    const imgs = await once(`blob/card/${sid}`);
    if (!deck || deck.sid !== sid) return;
    deck.imgs = Array.isArray(imgs) ? imgs : Object.values(imgs || {}); drawDeck();
  }
  function drawDeck() {
    if (!deck) return ov("");
    const D = C.D, e = A(D, "cardup")[deck.sid] || {}, me = C.ctx, step = C.step || {};
    const my = A(D, "cvote")[me.sid] === deck.sid;
    const canVote = me.role === "student" && step.t === "cardvote" && deck.sid !== me.sid;
    const imgs = deck.imgs, n = imgs ? imgs.length : 0;
    ov(`<div class="x3ov" data-x3="close"><div class="x3win x3deck"><div class="x3bar"><b>${esc(e.title || "카드뉴스")}</b><span>${esc(nameOf(D, deck.sid) || e.name || "")} · ${esc(e.verdict || "")}</span><span class="sp"></span>
      ${canVote ? `<button class="btn ${my ? "" : "ghost"}" data-x3="vote" data-sid="${deck.sid}">${my ? "✓ 투표함" : "이 카드뉴스에 투표"}</button>` : ""}${e.link ? `<a class="btn ghost" href="${esc(e.link)}" target="_blank" rel="noopener">캔바 ↗</a>` : ""}
      ${me.role === "teacher" ? `<button class="btn warn" data-x3="chide" data-sid="${deck.sid}">${((D.hidden2 || {}).cardup || {})[deck.sid] ? "숨김 풀기" : "숨기기"}</button>` : ""}<button class="btn" data-x3="close">닫기</button></div>
      <div class="x3slide">${imgs ? (n ? `<img src="${imgs[deck.i]}" alt="">` : "<p class='hint'>그림이 없어요.</p>") : "<p class='hint'>불러오는 중…</p>"}</div>
      ${n > 1 ? `<div class="x3dnav"><button class="btn ghost" data-x3="dmove" data-d="-1" ${deck.i === 0 ? "disabled" : ""}>◀ 이전</button><span>${deck.i + 1} / ${n}</span><button class="btn ghost" data-x3="dmove" data-d="1" ${deck.i === n - 1 ? "disabled" : ""}>다음 ▶</button></div>` : ""}</div></div>`);
  }

  // ======================================================== 시상
  function quizCorrect(D, sid) {
    let n = (UI.quizStats(D).by || {})[sid] || 0;
    [2, 3].forEach(d => (DAY_STEPS[d] || []).forEach(s => { if (s.t === "quizset") n += UI2.quizScore(s, D, sid); }));
    return n;
  }
  function partRows(D) {
    const S = D.students || {}, ids = new Set(Object.keys(S));
    const dayIds = d => { const set = new Set(); (DAY_STEPS[d] || []).forEach(s => { if (s.id && s.t !== "pgallery" && s.t !== "sitegal" && s.t !== "imgplay" && s.t !== "imgresult") set.add(s.id); }); return set; };
    const d2ids = dayIds(2), d3ids = dayIds(3); d3ids.add("sitefool");
    const has = (id, sid) => (((D.ans || {})[id] || {})[sid] != null ? 1 : 0) + (((D.posts || {})[id] || {})[sid] ? 1 : 0);
    const Q = window.QUIZ || [];
    return [...ids].map(sid => {
      const d1 = Q.filter((_, q) => ((D.quiz || {})[q] || {})[sid]).length + ((D.poll || {})[sid] != null ? 1 : 0) + ((D.ai || {})[sid] != null ? 1 : 0) + Object.keys((D.sort || {})[sid] || {}).length + ((D.cards || {})[sid] ? 1 : 0) + ((D.entries || {})[sid] ? 1 : 0) + Object.keys((D.votes || {})[sid] || {}).length;
      const d2 = [...d2ids].reduce((n, id) => n + has(id, sid), 0) + Object.values(D.qa || {}).filter(m => m && m[sid] != null).length;
      const lab = (((A(D, "codelab")[sid]) || {}).done || []).length;
      const d3 = [...d3ids].reduce((n, id) => n + has(id, sid), 0) + Math.max(0, lab - 1);
      return { sid, name: (S[sid] || {}).name || "", d1, d2, d3, total: d1 + d2 + d3, ok: quizCorrect(D, sid) };
    }).sort((a, b) => b.total - a.total || b.ok - a.ok || a.name.localeCompare(b.name, "ko", { numeric: true }));
  }
  function award3(step, D, ctx) {
    const aw = A(D, "award3"), rv = !!D.state.reveal, ws = Object.keys(aw.ws || {}), best = cardRank(D).filter(r => r.n > 0)[0];
    const nm = sid => esc(nameOf(D, sid) || sid);
    if (rv) {
      return frame("시상 · 3일 동안 수고했어요!", `<div class="x3awards">
        <div class="aw"><div class="ic">🏆</div><h3>웹앱 참여왕</h3><b>${aw.app ? nm(aw.app) : "-"}</b><small>3일 동안 웹앱 활동에 가장 열심히 참여했어요</small></div>
        <div class="aw"><div class="ic">📝</div><h3>워크시트 성실상</h3><b>${ws.length ? ws.map(nm).join("<br>") : "-"}</b><small>활동지를 꼼꼼하고 성실하게 채웠어요</small></div>
        ${best ? `<div class="aw"><div class="ic">🎨</div><h3>베스트 카드뉴스</h3><b>${nm(best.sid)}</b><small>${esc(best.e.title)} · ${best.n}표</small></div>` : ""}</div>`);
    }
    if (ctx.role !== "teacher") return frame("시상", `<div class="x3wait">🏆<br>선생님이 수상자를 발표할 때까지 기다려요</div>`);
    const R = partRows(D);
    return frame("시상 준비 (학생 화면에는 아직 안 보여요)", `<div class="g2"><div><h3 class="h">🏆 웹앱 참여왕 · 1명 (줄을 눌러 고르기)</h3>
      <table class="rank x3pick-t"><tr><th>순</th><th>이름</th><th>1일</th><th>2일</th><th>3일</th><th>합계</th><th>정답</th></tr>${R.slice(0, 12).map((r, i) => `<tr data-x3="pickapp" data-sid="${r.sid}" class="${aw.app === r.sid ? "me" : ""}"><td>${i + 1}</td><td>${aw.app === r.sid ? "🏆 " : ""}${esc(r.name)}</td><td>${r.d1}</td><td>${r.d2}</td><td>${r.d3}</td><td><b>${r.total}</b></td><td>${r.ok}</td></tr>`).join("")}</table>
      <p class="hint">합계 = 활동 참여 수, 같으면 퀴즈 정답 수로 순위를 정했어요.</p></div>
      <div><h3 class="h">📝 워크시트 성실상 · 2명 (이름을 눌러 고르기)</h3><div class="x3names">${Object.entries(D.students || {}).sort((a, b) => (a[1].name || "").localeCompare(b[1].name || "", "ko", { numeric: true })).map(([sid, s]) => `<button data-x3="pickws" data-sid="${sid}" class="${(aw.ws || {})[sid] ? "on" : ""}">${esc(s.name || "")}</button>`).join("")}</div>
      <h3 class="h">🎨 베스트 카드뉴스 (투표 1위)</h3><p>${best ? `${nm(best.sid)} · ${esc(best.e.title)} · ${best.n}표` : "아직 투표가 없어요."}</p></div></div>
      <div class="callout" style="margin:12px 0 0">고른 뒤 R 키를 누르면 학생 화면에 발표돼요</div>`);
  }

  // ======================================================== 연결
  const R = { pvote, recap, codelab, siteup, sitegal, report, cardup, cardvote, cardresult, award3 };
  const baseRender = UI2.render, baseBind = UI2.bind;
  UI2.render = function (step, D, ctx, draft) {
    if (!NEW.includes(step.t)) return baseRender(step, D, ctx, draft);
    C = { D, ctx, step };
    return R[step.t](step, D, ctx);
  };
  UI2.bind = function (root, step, D, ctx, api) {
    if (!NEW.includes(step.t)) return baseBind(root, step, D, ctx, api);
    C = { D, ctx, step, api };
    if (step.t === "codelab") labLive(ctx.sid, true);
  };
  // 교사 화면은 bind를 부르지 않으므로, 그릴 때 문맥을 기록하는 위 render와 아래 문서 단위 이벤트로 처리합니다.
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-x3]"); if (!t) return;
    const k = t.dataset.x3, D = C.D, me = C.ctx;
    if (k === "close") { if (e.target !== t && t.classList.contains("x3ov")) return; siteOpen = null; deck = null; ovReport = null; showPriv3 = false; return ov(""); }
    if (k === "copy") { const el = document.getElementById(t.dataset.src); if (el) copyText(el.textContent, t); return; }
    if (k === "copylink") return copyText(t.dataset.url, t);
    // 사이트
    if (k === "site") return openSite(t.dataset.sid);
    if (k === "sitepre") { const d = siteCollect(me.sid); if (!String(d.code || "").trim()) { const m = $1("#x3msg"); if (m) m.textContent = "먼저 코드를 붙여 넣거나 파일을 골라요."; return; } return openSite(me.sid, d.code); }
    if (k === "sitesend") return siteSend(t);
    if (k === "fool") { const p = `ans/sitefool/${me.sid}/${t.dataset.sid}`; const on = ((A(D, "sitefool")[me.sid]) || {})[t.dataset.sid]; await put(p, on ? null : true); return refreshBar(); }
    if (k === "priv") { showPriv3 = !showPriv3; return refreshBar(); }
    if (k === "hide") { const on = ((D.hidden2 || {}).site || {})[t.dataset.sid]; put(`hidden2/site/${t.dataset.sid}`, on ? null : true); siteOpen = null; return ov(""); }
    // 코드 실습
    if (k === "labsave") { const c = labCode(me.sid); const done = LAB_M.filter(m => m.ok(c)).map(m => m.k); return put(`ans/codelab/${me.sid}`, { done, at: Date.now(), name: me.name }); }
    if (k === "labreset") { if (!confirm("처음 코드로 되돌릴까요? 고친 내용이 지워져요.")) return; LS.set(dkey(me.sid, "lab"), {}); Object.keys(LAB_DEF).forEach(x => { const ta = $1(`[data-lab="${x}"]`); if (ta) ta.value = LAB_DEF[x]; }); return labLive(me.sid, true); }
    // 보고서
    if (k === "rpick") { const ta = $1('[data-r="claim"]'); if (ta) ta.value = t.dataset.v; const s = $1('[data-r="src"]'); if (s && t.dataset.src) s.value = t.dataset.src; const w = $1('[data-r="where"]'); if (w && t.dataset.where && !w.value) w.value = t.dataset.where; t.closest("details").open = false; rpCollect(me.sid); if (ta) ta.scrollIntoView({ block: "center" }); return; }
    if (k === "rpsend") { const d = rpCollect(me.sid), miss = rpMissing(d), m = $1("#x3msg"); if (miss.length) { m.textContent = "아직 비어 있어요: " + miss.join(", "); return; } const o = {}; Object.keys(d).forEach(x => { o[x] = typeof d[x] === "string" ? d[x].trim() : d[x]; }); o.name = me.name; o.at = Date.now(); await put(`ans/report/${me.sid}`, o); LS.set(dkey(me.sid, "report"), {}); const m2 = $1("#x3msg"); if (m2) m2.textContent = "제출했어요! 이제 PDF를 받아 보세요."; return; }
    if (k === "rppdf" || k === "ovpdf") {
      const [d, name] = k === "ovpdf" ? ovReport : [rpCollect(me.sid), me.name];
      const m = $1("#x3msg"); if (k === "rppdf") { const miss = rpMissing(d); if (miss.length > 4) { m.textContent = "보고서를 조금 더 채운 뒤에 받아요: " + miss.join(", "); return; } }
      const o = t.textContent; t.disabled = true; t.textContent = "PDF 만드는 중…";
      try { await makePdf(d, name); } catch (err) { if (m) m.textContent = "PDF를 만들지 못했어요. ‘인쇄 화면’ 버튼으로 PDF 저장을 해 보세요."; }
      t.disabled = false; t.textContent = o; return;
    }
    if (k === "rpprint") { if (!printReport(rpCollect(me.sid), me.name)) { const m = $1("#x3msg"); if (m) m.textContent = "팝업이 막혔어요. 주소창 오른쪽의 팝업 허용을 눌러 주세요."; } return; }
    if (k === "rpcopy") return copyText(reportText(rpCollect(me.sid), me.name), t);
    if (k === "rpview") { const r = A(D, "report")[t.dataset.sid]; if (r) viewReport(r, nameOf(D, t.dataset.sid) || r.name); return; }
    // 카드뉴스
    if (k === "cardsend") return cardSend(t);
    if (k === "cmove" || k === "cdel") { const a = CARD_DRAFT[me.sid] || [], i = +t.dataset.i; if (k === "cdel") a.splice(i, 1); else { const j = i + +t.dataset.d; if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]]; } const p = $1("#x3cprev"); if (p) p.innerHTML = cardPrev(me.sid); return; }
    if (k === "deck") return openDeck(t.dataset.sid);
    if (k === "dmove") { if (deck && deck.imgs) { deck.i = Math.max(0, Math.min(deck.imgs.length - 1, deck.i + +t.dataset.d)); drawDeck(); } return; }
    if (k === "vote") { if (t.dataset.sid === me.sid || D.state.reveal) return; const cur = A(D, "cvote")[me.sid]; await put(`ans/cvote/${me.sid}`, cur === t.dataset.sid ? null : t.dataset.sid); if (deck) drawDeck(); return; }
    if (k === "chide") { const on = ((D.hidden2 || {}).cardup || {})[t.dataset.sid]; put(`hidden2/cardup/${t.dataset.sid}`, on ? null : true); deck = null; return ov(""); }
    if (k === "pv") { const st = C.step || {}; if (t.dataset.sid === me.sid || D.state.reveal || !st.id) return; const cur = A(D, st.id)[me.sid]; return put(`ans/${st.id}/${me.sid}`, cur === t.dataset.sid ? null : t.dataset.sid); }
    // 시상
    if (k === "pickapp") { const aw = A(D, "award3"); return put(`ans/award3/app`, aw.app === t.dataset.sid ? null : t.dataset.sid); }
    if (k === "pickws") { const ws = A(D, "award3").ws || {}; if (ws[t.dataset.sid]) return put(`ans/award3/ws/${t.dataset.sid}`, null); if (Object.keys(ws).length >= 2) return alert("워크시트 성실상은 2명까지 고를 수 있어요. 먼저 한 명을 취소해 주세요."); return put(`ans/award3/ws/${t.dataset.sid}`, true); }
  });
  document.addEventListener("input", e => {
    const t = e.target, me = C.ctx;
    if (t.matches("[data-lab]")) { const c = labCode(me.sid); c[t.dataset.lab] = t.value; LS.set(dkey(me.sid, "lab"), c); return labLive(me.sid); }
    if (t.matches("[data-s],[data-sc]")) return siteCollect(me.sid);
    if (t.matches("[data-r],[data-rc],input[name=x3v]")) return rpCollect(me.sid);
    if (t.matches("[data-c3]")) return cardDraftSave(me.sid);
  });
  document.addEventListener("change", async e => {
    const t = e.target; if (!t.matches || !t.matches("[data-x3file]")) return;
    const me = C.ctx, m = $1("#x3msg");
    if (t.dataset.x3file === "site") {
      const f = t.files[0]; if (!f) return;
      if (f.size > MAX_CODE * 3) { if (m) m.textContent = "파일이 너무 커요."; return; }
      const txt = await f.text(); const ta = $1('[data-s="code"]'); if (ta) ta.value = txt; siteCollect(me.sid); if (m) m.textContent = `‘${f.name}’ 파일을 넣었어요. 미리 보기로 확인해 보세요.`;
    }
    if (t.dataset.x3file === "card") {
      const files = [...t.files].filter(f => /^image\//.test(f.type)).slice(0, 8); if (!files.length) return;
      if (m) m.textContent = "그림 줄이는 중…";
      try { const out = []; for (const f of files) out.push(await compressImg(f, 1080, 190000)); CARD_DRAFT[me.sid] = out; const p = $1("#x3cprev"); if (p) p.innerHTML = cardPrev(me.sid); if (m) m.textContent = `${out.length}장 준비됐어요. 순서를 확인하고 ‘올리기’를 눌러요.`; }
      catch (err) { if (m) m.textContent = "열 수 없는 그림이 있어요. PNG나 JPG로 받아 주세요."; }
      t.value = "";
    }
  });
  document.addEventListener("keydown", e => {
    if (!document.getElementById("x3ov") || !document.getElementById("x3ov").innerHTML) return;
    if (e.key === "Escape") { siteOpen = null; deck = null; ov(""); }
    if (deck && deck.imgs && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.stopImmediatePropagation(); e.preventDefault(); deck.i = Math.max(0, Math.min(deck.imgs.length - 1, deck.i + (e.key === "ArrowRight" ? 1 : -1))); drawDeck(); }
  }, true);

  // 교사 화면 ‘3일차 초기화’
  function reset3() {
    const ids = new Set(["sitefool", "award3"]); (DAY_STEPS[3] || []).forEach(s => { if (s.id) ids.add(s.id); });
    ids.forEach(id => { DB.remove(`${room()}/ans/${id}`); DB.remove(`${room()}/posts/${id}`); DB.remove(`${room()}/hidden2/${id}`); });
    ["site", "cardup"].forEach(id => DB.remove(`${room()}/hidden2/${id}`));
    DB.remove(`${room()}/blob`);
  }
  window.UI3 = { reset3, partRows, reportHtml, RP_CSS, makePdf, wrapSite, LAB_M };
})();
