// 2일차 활동 화면 (교사·학생 공용)
// 데이터 위치: ans/{활동id}/{학생id}, posts/{양식id}/{학생id}, qa/{출제자id}/{학생id}, react/{양식id}/{게시자id}/{학생id}, hidden2/{양식id}/{학생id}
(function () {
  const { esc, frame, bars, stat, pct } = UI;
  const norm = s => String(s == null ? "" : s).toLowerCase().replace(/[\s.,!?'"“”‘’<>〈〉()\[\]·_-]/g, "");
  const ans = (D, id) => ((D.ans || {})[id]) || {};
  const nameOf = (D, sid) => ((D.students || {})[sid] || {}).name || "";
  const imgTag = (src, cls = "") => src ? `<img class="${cls}" src="${src}" alt="">` : "";
  const TYPES = ["wordcloud", "quizset", "judge", "short", "ops", "freetext", "nextword", "form", "pgallery", "imgplay", "imgresult", "d1winners"];
  const INPUT_TYPES = ["wordcloud", "short", "ops", "freetext", "nextword", "form"]; // 학생 화면: 내 데이터가 바뀔 때만 다시 그림
  const REVEAL_TYPES = ["judge", "short"];

  // ---------- 단어 구름
  function cloudHtml(words) {
    const c = {}, show = {};
    words.forEach(w => { const k = norm(w); if (!k) return; c[k] = (c[k] || 0) + 1; if (!show[k]) show[k] = w.trim(); });
    const list = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 60);
    if (!list.length) return `<p class="hint">아직 단어가 없어요.</p>`;
    const max = list[0][1], cols = ["#1b2a6b", "#2f5bd3", "#d2423a", "#1f9d55", "#c27c0e", "#7a3fbf"];
    const mixed = list.map((x, i) => [x, i]).sort((a, b) => ((a[1] * 7) % 11) - ((b[1] * 7) % 11));
    return `<div class="cloud">${mixed.map(([[k, n], i]) => `<span style="font-size:${Math.round(16 + 46 * Math.sqrt(n / max))}px;color:${cols[i % cols.length]}" title="${n}명">${esc(show[k])}</span>`).join("")}</div>`;
  }
  function wordcloud(step, D, ctx) {
    const a = ans(D, step.id), mine = a[ctx.sid];
    const all = Object.values(a).flat();
    if (ctx.role !== "student") return frame("단어 구름", `<div class="qtext">${esc(step.q)}</div>${cloudHtml(all)}<p class="hint">참여 ${Object.keys(a).length}명 · 단어가 클수록 많은 친구가 적었어요</p>`);
    if (mine && !ctx.edit) return frame("단어 구름", `<div class="done">제출 완료: ${mine.map(esc).join(", ")}</div><div class="actions"><button class="btn ghost" data-act="edit">다시 쓰기</button><button class="btn ghost" data-act="refresh">구름 새로 보기</button></div>${cloudHtml(all)}`);
    const v = mine || [];
    return frame("단어 구름", `<div class="qtext">${esc(step.q)}</div><div class="form">${[0, 1, 2, 3, 4].map(i => `<input type="text" class="wc" maxlength="15" value="${esc(v[i] || "")}" placeholder="단어 ${i + 1}">`).join("")}</div>
      <div class="actions"><button class="btn" data-act="wcsend">제출하기</button></div><p class="hint">한 칸에 하나씩. 하나만 써도 돼요.</p>`);
  }

  // ---------- 바로 채점 퀴즈 묶음
  function quizScore(step, D, sid) { const m = ans(D, step.id)[sid] || {}; return step.items.reduce((s, it, i) => s + (m[i] === it.a ? 1 : 0), 0); }
  function itemMedia(it) {
    if (it.imgs) return `<div class="pair">${it.imgs.map((s, i) => `<figure><img src="${s}" alt=""><figcaption>${i === 0 ? "원래" : "바뀐 뒤"}</figcaption></figure>`).join("")}</div>`;
    if (it.img) return `<div class="qimg"><img src="${it.img}" alt=""></div>`;
    return "";
  }
  function quizset(step, D, ctx) {
    const a = ans(D, step.id);
    if (ctx.role !== "student") {
      const rows = Object.keys(a).map(sid => ({ sid, n: quizScore(step, D, sid), done: Object.keys(a[sid] || {}).length })).sort((x, y) => y.n - x.n || y.done - x.done);
      const per = step.items.map((it, i) => { const v = Object.values(a).map(m => (m || {})[i]).filter(x => x != null); return [`${i + 1}번`, pct(v.filter(x => x === it.a).length, v.length), ""]; });
      return frame(step.title2 || step.title, `${step.intro ? `<div class="sub">${step.intro}</div>` : ""}<div class="stats">${stat("참여", `${rows.length}<small>명</small>`)}${stat("문항", `${step.items.length}<small>개</small>`)}</div>
        <div class="g2"><div><h3 class="h">점수 TOP 10</h3><table class="rank"><tr><th>순위</th><th>이름</th><th>점수</th></tr>${rows.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(nameOf(D, r.sid))}</td><td>${r.n} / ${step.items.length}</td></tr>`).join("")}</table></div>
        <div><h3 class="h">문항별 정답률</h3>${bars(per, { unit: "%" })}</div></div>`);
    }
    const m = a[ctx.sid] || {}, score = quizScore(step, D, ctx.sid), done = Object.keys(m).length;
    const items = step.items.map((it, i) => {
      const my = m[i], answered = my != null;
      const opts = it.opts.map((o, k) => `<button data-qs="${i}" data-k="${k}" class="${answered && k === it.a ? "right" : ""} ${answered && k === my && my !== it.a ? "wrong" : ""}" ${answered ? "disabled" : ""}>${esc(o)}</button>`).join("");
      return `<div class="qitem"><div class="t">${i + 1}. ${it.q}</div>${itemMedia(it)}<div class="opts">${opts}</div>${answered ? `<div class="verdict ${my === it.a ? "ok" : "no"}">${my === it.a ? "정답!" : "아쉬워요."} ${esc(it.ex)}</div>` : ""}</div>`;
    }).join("");
    return frame(step.title2 || step.title, `${step.intro ? `<div class="sub">${step.intro}</div>` : ""}<div class="stats">${stat("내 점수", `${score}<small> / ${step.items.length}</small>`)}${stat("푼 문제", `${done}<small> / ${step.items.length}</small>`)}</div>${items}`);
  }

  // ---------- 사실/거짓 판정 (교사가 R로 공개)
  function judge(step, D, ctx) {
    const a = ans(D, step.id), mine = a[ctx.sid] || {}, rv = !!D.state.reveal;
    const items = step.items.map((it, i) => {
      const cnt = step.kinds.map(k => Object.values(a).filter(m => m && m[i] === k).length);
      const seg = ctx.role === "student" ? `<div class="seg">${step.kinds.map(k => `<button data-jg="${i}" data-k="${k}" class="${mine[i] === k ? "on" : ""} ${rv && it.answer === k ? "right" : ""}" ${rv ? "disabled" : ""}>${k}</button>`).join("")}</div>` : "";
      const mini = (ctx.role !== "student" || rv) ? `<div class="mini" style="margin-top:6px">${step.kinds.map((k, j) => `<span>${k} <b>${cnt[j]}</b></span>`).join(" · ")}</div>` : "";
      const ex = rv ? `<div class="verdict ${ctx.role === "student" && mine[i] ? (mine[i] === it.answer ? "ok" : "no") : "info"}">${esc(it.explain)}</div>` : "";
      return `<div class="srt"><div class="t">${i + 1}. ${esc(it.text)}</div>${seg}${mini}${ex}</div>`;
    }).join("");
    return frame(step.title2 || step.title, `${step.post || ""}<div class="sub">${ctx.role === "student" ? "검색해서 확인하고 사실/거짓을 골라요." : `응답 ${Object.keys(a).length}명 · R 키로 정답 공개`}</div>${items}${step.help ? `<div class="helpbox">🐱 체카 요원의 도움말 · ${step.help}</div>` : ""}`);
  }

  // ---------- 빈칸 답 쓰기 (바로 채점, 교사가 R로 정답 공개)
  const blankOk = (b, v) => b.accept.some(x => norm(x) === norm(v));
  function short(step, D, ctx) {
    const a = ans(D, step.id), mine = a[ctx.sid], rv = !!D.state.reveal;
    const media = step.img ? `<div class="qimg big"><img src="${step.img}" alt=""></div>` : "";
    if (ctx.role !== "student") {
      const rows = step.blanks.map((b, j) => [esc(b.label.replace(/<[^>]+>/g, "")), Object.values(a).filter(m => m && m.ok && m.ok[j]).length, ""]);
      return frame(step.title2 || step.title, `${media}<div class="qtext" style="font-size:20px">${esc(step.q || "")}</div><div class="stats">${stat("제출", `${Object.keys(a).length}<small>명</small>`)}${stat("모두 정답", `${Object.values(a).filter(m => m && m.ok && m.ok.every(Boolean)).length}<small>명</small>`)}</div>
        <h3 class="h">빈칸별 정답 인원</h3>${bars(rows)}${rv ? `<div class="verdict info">정답: ${step.blanks.map(b => esc(b.accept[0])).join(" · ")} — ${esc(step.ex)}</div>` : `<p class="hint">R 키로 정답 공개</p>`}`);
    }
    const vals = (mine && mine.vals) || [], oks = (mine && mine.ok) || [];
    const inputs = step.blanks.map((b, j) => `<label>${esc(b.label)}</label><div class="blank"><input type="text" class="bl" maxlength="40" value="${esc(vals[j] || "")}" placeholder="${esc(b.ph || "")}" ${oks[j] ? "disabled" : ""}>${mine ? (oks[j] ? `<span class="okm">✓</span>` : `<span class="nom">✗</span>`) : ""}</div>`).join("");
    const all = oks.length && oks.every(Boolean);
    return frame(step.title2 || step.title, `${media}<div class="qtext" style="font-size:18px">${esc(step.q || "")}</div><div class="form">${inputs}</div>
      ${all ? `<div class="verdict ok">모두 정답! ${esc(step.ex)}</div>` : `<div class="actions"><button class="btn" data-act="shsend">확인하기</button></div>${mine ? `<p class="hint">✗ 칸을 다시 검색해서 고쳐 보세요.</p>` : ""}`}
      ${rv && !all ? `<div class="verdict info">정답: ${step.blanks.map(b => esc(b.accept[0])).join(" · ")} — ${esc(step.ex)}</div>` : ""}`);
  }

  // ---------- 검색 연산자 미션
  function ops(step, D, ctx) {
    const a = ans(D, step.id);
    if (ctx.role !== "student") {
      const body = step.missions.map((m, i) => {
        const done = Object.values(a).filter(x => x && x[i] && x[i].ok);
        const samples = done.slice(-3).map(x => `<code>${esc(x[i].q)}</code>`).join(" ");
        return `<div class="opm"><b>${esc(m.op)}</b> ${esc(m.title)} <span class="mini">완료 <b>${done.length}</b>명</span>${samples ? `<div class="mini">${samples}</div>` : ""}</div>`;
      }).join("");
      return frame("검색 연산자 미션", `<div class="stats">${stat("참여", `${Object.keys(a).length}<small>명</small>`)}</div>${body}`);
    }
    const mine = a[ctx.sid] || {};
    const n = Object.values(mine).filter(x => x && x.ok).length;
    const body = step.missions.map((m, i) => {
      const r = mine[i];
      return `<div class="qitem"><div class="t"><span class="opb">${esc(m.op)}</span> ${esc(m.title)}</div><p>${m.task}</p>
        <div class="blank"><input type="text" class="opq" data-i="${i}" maxlength="80" value="${esc((r && r.q) || "")}" placeholder="검색어를 그대로 써 보세요" ${r && r.ok ? "disabled" : ""}><button class="btn" data-op="${i}" ${r && r.ok ? "disabled" : ""}>확인</button></div>
        ${r ? (r.ok ? `<div class="verdict ok">✓ 좋아요! ${esc(m.ex)}<div class="actions" style="margin:8px 0 0">${m.op === "+" ? `<a class="btn" href="https://search.naver.com/search.naver?query=${encodeURIComponent(r.q)}" target="_blank" rel="noopener">네이버에서 이 검색어로 검색 ↗</a>` : `<a class="btn" href="https://www.google.com/search?q=${encodeURIComponent(r.q)}" target="_blank" rel="noopener">구글에서 이 검색어로 검색 ↗</a>`}</div><small>결과를 보고, 연산자가 없을 때와 무엇이 다른지 비교해 보세요.</small></div>` : `<div class="verdict no">연산자 <b>${esc(m.op)}</b> 를 넣었는지 확인해 보세요.</div>`) : ""}</div>`;
    }).join("");
    return frame("검색 연산자 미션 7개", `<div class="sub">검색어를 쓰고 ‘확인’ → 연산자가 맞으면 버튼 하나로 구글(또는 네이버)에서 바로 검색돼요. 복사해서 붙여 넣을 필요 없어요.</div><div class="stats">${stat("완료", `${n}<small> / ${step.missions.length}</small>`)}</div>${body}`);
  }

  // ---------- 자유 입력 목록
  function freeList(step, D) {
    const a = ans(D, step.id);
    const rows = Object.entries(a).sort((x, y) => (x[1].at || 0) - (y[1].at || 0));
    if (!rows.length) return `<p class="hint">아직 제출이 없어요.</p>`;
    return `<div class="flist">${rows.map(([sid, v]) => `<div class="fi"><b>${esc(nameOf(D, sid) || v.name)}</b><br>${step.fields.filter(f => v[f.k]).map(f => `<small>${esc(f.label)}</small> ${esc(v[f.k])}`).join("<br>")}</div>`).join("")}</div>`;
  }
  function freetext(step, D, ctx) {
    const a = ans(D, step.id), mine = a[ctx.sid];
    if (ctx.role !== "student") return frame(step.title2 || step.title, `<div class="sub">${step.desc}</div><div class="stats">${stat("제출", `${Object.keys(a).length}<small>명</small>`)}</div>${freeList(step, D)}`);
    if (mine && !ctx.edit) return frame(step.title2 || step.title, `<div class="done">제출 완료!</div><div class="actions"><button class="btn ghost" data-act="edit">고치기</button><button class="btn ghost" data-act="refresh">친구들 결과 새로 보기</button></div>${freeList(step, D)}`);
    const v = mine || {};
    return frame(step.title2 || step.title, `<div class="sub">${step.desc}</div><div class="form">${step.fields.map(f => `<label>${esc(f.label)}</label><input type="text" class="ft" data-k="${f.k}" maxlength="120" value="${esc(v[f.k] || "")}" placeholder="${esc(f.ph || "")}">`).join("")}</div>
      <div class="actions"><button class="btn" data-act="ftsend">제출하기</button></div>`);
  }

  // ---------- 다음 말 맞히기
  function nwResult(step, D) {
    const a = ans(D, step.id);
    return step.prompts.map((p, i) => {
      const c = {}, show = {};
      Object.values(a).forEach(v => { const w = v && v[i]; const k = norm(w); if (k) { c[k] = (c[k] || 0) + 1; show[k] = show[k] || w.trim(); } });
      const tot = Object.values(c).reduce((s, n) => s + n, 0);
      const top = Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, 5);
      return `<div class="qitem"><div class="t">${esc(p)} ?</div>${top.length ? bars(top.map(([k, n], j) => [esc(show[k]), pct(n, tot), j === 0 ? "win" : ""]), { unit: "%" }) : "<p class='hint'>아직 없어요</p>"}</div>`;
    }).join("");
  }
  function nextword(step, D, ctx) {
    const a = ans(D, step.id), mine = a[ctx.sid];
    const head = `<div class="sub">앞말을 보고 가장 먼저 떠오르는 다음 말을 써요. 우리 반의 ‘확률’이 곧 AI의 원리!</div>`;
    if (ctx.role !== "student") return frame("다음 말 맞히기", `${head}<div class="stats">${stat("참여", `${Object.keys(a).length}<small>명</small>`)}</div><div class="g2">${nwResult(step, D)}</div>`);
    if (mine && !ctx.edit) return frame("다음 말 맞히기", `<div class="done">제출 완료!</div><div class="actions"><button class="btn ghost" data-act="refresh">결과 새로 보기</button></div>${nwResult(step, D)}`);
    return frame("다음 말 맞히기", `${head}<div class="form">${step.prompts.map((p, i) => `<label>${esc(p)}</label><input type="text" class="nw" maxlength="15" value="${esc((mine || [])[i] || "")}">`).join("")}</div><div class="actions"><button class="btn" data-act="nwsend">제출하기</button></div>`);
  }

  // ---------- 올리기 양식
  const posts = (D, id) => ((D.posts || {})[id]) || {};
  const hidden = (D, id) => ((D.hidden2 || {})[id]) || {};
  function form(step, D, ctx, draft) {
    const saved = posts(D, step.id)[ctx.sid];
    if (ctx.role !== "student") {
      const list = Object.entries(posts(D, step.id));
      return frame(step.title2 || step.title, `<div class="sub">${esc(step.desc || "")}</div><div class="stats">${stat("제출", `${list.length}<small>개</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div>
        ${list.length ? `<div class="gal">${list.map(([sid, e]) => card(step, sid, e, D, ctx)).join("")}</div>` : ""}<p class="hint">카드를 눌러 내용을 보고, 부적절하면 숨길 수 있어요.</p>`);
    }
    const e = Object.assign({}, saved || {}, draft || {});
    const v = k => esc(e[k] || "");
    const fields = step.fields.map(f => {
      const lab = `<label>${esc(f.label)}${f.req ? " *" : ""}</label>`;
      const cnt = mx => `<div class="cnt" data-cnt="${f.k}">${String(e[f.k] || "").length} / ${mx}자</div>`;
      if (f.type === "text") { const mx = f.max || 200; return lab + `<input type="text" data-f="${f.k}" maxlength="${mx}" value="${v(f.k)}" placeholder="${esc(f.ph || "")}">` + cnt(mx); }
      if (f.type === "textarea") { const mx = f.max || 2000; return lab + `<textarea data-f="${f.k}" maxlength="${mx}" rows="5">${v(f.k)}</textarea>` + cnt(mx); }
      if (f.type === "select") return lab + `<select data-f="${f.k}">${f.opts.map(o => `<option ${e[f.k] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      if (f.type === "checks") return lab + `<div class="checks">${f.opts.map(o => `<label><input type="checkbox" data-c="${f.k}" value="${esc(o)}" ${(e[f.k] || []).includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>`;
      if (f.type === "image") return lab + `<input type="file" data-img="${f.k}" accept="image/*">${e[f.k] ? `<img class="preview" src="${e[f.k]}" alt="">` : ""}`;
      return "";
    }).join("");
    return frame(step.title2 || step.title, `<div class="form">${saved ? `<div class="done">제출 완료! 고쳐서 다시 제출하면 바뀌어요.${hidden(D, step.id)[ctx.sid] ? " (선생님이 숨겼어요. 내용을 고쳐 주세요.)" : ""}</div>` : `<div class="sub">${esc(step.desc || "")}</div>`}
      ${fields}<div class="actions"><button class="btn" data-act="fmsend">제출하기</button></div><p class="hint" id="fmsg"></p></div>`);
  }
  function card(step, sid, e, D, ctx) {
    const st = step;
    const show = (st.show || []).map(k => `<div class="k">${esc(e[k])}</div>`).join("");
    const hid = hidden(D, st.id)[sid];
    const rc = Object.keys((((D.react || {})[st.id] || {})[sid]) || {}).length;
    return `<button class="ent ${sid === ctx.sid ? "mine" : ""}" data-open="${st.id}/${sid}">${st.stamp ? `<span class="stamp">수업용 가짜</span>` : ""}${e.img ? `<img src="${e.img}" alt="">` : `<div class="noimg">${esc((e.title || e.q || "").slice(0, 30))}</div>`}
      <div class="b">${show}<div class="tt">${esc(e.title || e.q || e.prompt || "")}</div><div class="nm">${esc(nameOf(D, sid) || e.name)}${e.partner ? " · " + esc(e.partner) : ""}${rc ? ` · 😱 ${rc}` : ""}${hid ? " <span style='color:#d2423a'>숨김</span>" : ""}</div></div></button>`;
  }
  function gallery(step, D, ctx) {
    const list = Object.entries(posts(D, step.id)).filter(([sid]) => ctx.role === "teacher" || !hidden(D, step.id)[sid]).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    let extra = "";
    if (step.id === "aiimg" && list.length) {
      const opts = ["구글 AI로 만든 그림이라고 나옴", "AI 그림 같지만 확실하지 않다고 나옴", "AI 그림이 아니라고 나옴", "검증을 못 함"];
      extra = `<h3 class="h">도구별 검증 결과</h3><div class="g2">${["제미나이", "챗GPT"].map(t => `<div><b>${t}로 만든 그림</b>${bars(opts.map(o => [esc(o), list.filter(([, e]) => e.tool === t && e.check === o).length, ""]), { unit: "개", wide: true })}</div>`).join("")}</div>`;
    }
    return frame(`${step.title2 || step.title} (${list.length})`, `${step.react ? `<div class="sub">카드를 눌러 보고, 나도 속을 것 같으면 😱를 눌러요. 비공개 칸은 3일차에 공개돼요.</div>` : `<div class="sub">카드를 누르면 자세히 볼 수 있어요.</div>`}${extra}
      ${list.length ? `<div class="gal">${list.map(([sid, e]) => card(step, sid, e, D, ctx)).join("")}</div>` : "<p class='hint'>아직 없어요.</p>"}`);
  }
  let IDX = null;
  function idx() {
    if (IDX) return IDX; IDX = { forms: {}, gals: {} };
    Object.values(window.DAY_STEPS || {}).forEach(list => list.forEach(s => { if (s.t === "form") IDX.forms[s.id] = s; if (s.t === "pgallery") IDX.gals[s.id] = s; }));
    return IDX;
  }
  function modal(key, D, ctx) {
    const [id, sid] = key.split("/"); const step = idx().forms[id]; const e = posts(D, id)[sid]; if (!step || !e) return "";
    const hasPriv = step.fields.some(f => f.private);
    const rows = step.fields.filter(f => !f.private || (ctx.role === "teacher" && ctx.showPriv)).map(f => {
      const v = e[f.k]; if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
      if (f.type === "image") return `<dt>${esc(f.label)}</dt><dd><img src="${v}" alt=""></dd>`;
      return `<dt>${esc(f.label)}</dt><dd>${Array.isArray(v) ? v.map(esc).join(" · ") : esc(v).replace(/\n/g, "<br>")}</dd>`;
    }).join("");
    const reacted = ((((D.react || {})[id] || {})[sid]) || {})[ctx.sid];
    const gs = idx().gals[id];
    return `<div class="modal" data-close="1"><div class="sheet" onclick="event.stopPropagation()"><div class="tab">${esc(e.title || e.q || "카드")}</div><div class="card">${gs && gs.stamp ? `<span class="stamp">수업용 가짜</span>` : ""}${ctx.role === "teacher" && hasPriv && !ctx.showPriv ? `<p class="hint">🔒 숨겨 둔 거짓·진실 칸은 TV에 보이지 않게 감춰져 있어요. 확인하려면 아래 ‘비공개 칸 보기’를 누르세요.</p>` : ""}<dl class="cardv">${rows}<dt>만든 사람</dt><dd>${esc(nameOf(D, sid) || e.name)}${e.partner ? " · " + esc(e.partner) : ""}</dd></dl>
      <div class="actions"><button class="btn" data-close="1">닫기</button>${ctx.role === "student" && gs && gs.react && sid !== ctx.sid ? `<button class="btn ghost" data-react="${id}/${sid}">${reacted ? "😱 취소" : "😱 나도 속겠다"}</button>` : ""}${ctx.role === "teacher" && hasPriv ? `<button class="btn ghost" data-priv="1">${ctx.showPriv ? "🔒 비공개 칸 감추기" : "🔒 비공개 칸 보기"}</button>` : ""}${ctx.role === "teacher" ? `<button class="btn warn" data-hide2="${id}/${sid}">${hidden(D, id)[sid] ? "숨김 풀기" : "이 카드 숨기기"}</button>` : ""}</div></div></div></div>`;
  }

  // ---------- 친구 이미지 퀴즈
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function quizOpts(sid, e) { const o = [e.a, e.w1, e.w2, e.w3]; const r = hash(sid) % 4; const order = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]][r]; return order.map(k => ({ t: o[k], ok: k === 0 })); }
  function imgplay(step, D, ctx) {
    const all = Object.entries(posts(D, step.id)).filter(([sid]) => !hidden(D, step.id)[sid]);
    const qa = D.qa || {};
    if (ctx.role !== "student") {
      return frame("친구 이미지 퀴즈 풀기", `<div class="stats">${stat("퀴즈", `${all.length}<small>개</small>`)}</div><div class="gal">${all.map(([sid, e]) => {
        const v = Object.values(qa[sid] || {}); const ok = v.filter(k => quizOpts(sid, e)[k] && quizOpts(sid, e)[k].ok).length;
        return `<div class="ent"><img src="${e.img}" alt=""><div class="b"><div class="tt">${esc(e.q)}</div><div class="nm">${esc(nameOf(D, sid))} · 정답 ${ok}/${v.length}명</div></div></div>`;
      }).join("")}</div>`);
    }
    const list = all.filter(([sid]) => sid !== ctx.sid);
    const solved = list.filter(([sid]) => (qa[sid] || {})[ctx.sid] != null).length;
    return frame("친구 이미지 퀴즈 풀기", `<div class="stats">${stat("푼 퀴즈", `${solved}<small> / ${list.length}</small>`)}</div><p class="hint">렌즈로 사진을 검색해서 답을 골라요. 한 번 고르면 바꿀 수 없어요!</p>
      ${list.map(([sid, e]) => { const my = (qa[sid] || {})[ctx.sid]; const os = quizOpts(sid, e);
        return `<div class="qitem"><div class="qimg big"><img src="${e.img}" alt=""></div><div class="t">${esc(e.q)} <small>— ${esc(nameOf(D, sid))}</small></div>${e.hint ? `<p class="hint">힌트: ${esc(e.hint)}</p>` : ""}
        <div class="opts">${os.map((o, k) => `<button data-iq="${sid}" data-k="${k}" class="${my != null && o.ok ? "right" : ""} ${my === k && !o.ok ? "wrong" : ""}" ${my != null ? "disabled" : ""}>${esc(o.t)}</button>`).join("")}</div>
        ${my != null ? `<div class="verdict ${os[my].ok ? "ok" : "no"}">${os[my].ok ? "정답!" : "아쉬워요. 정답: " + esc(e.a)}</div>` : ""}</div>`; }).join("") || "<p class='hint'>아직 친구들의 퀴즈가 없어요.</p>"}`);
  }
  function imgresult(step, D, ctx) {
    const all = Object.entries(posts(D, step.id)).filter(([sid]) => !hidden(D, step.id)[sid]);
    const qa = D.qa || {}, solver = {};
    const stats = all.map(([sid, e]) => { const os = quizOpts(sid, e); const v = Object.entries(qa[sid] || {}); let ok = 0; v.forEach(([who, k]) => { if (os[k] && os[k].ok) { ok++; solver[who] = (solver[who] || 0) + 1; } }); return { sid, e, n: v.length, ok }; });
    const hard = stats.filter(s => s.n >= 2).sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
    const top = Object.entries(solver).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return frame("이미지 퀴즈 결과", `<div class="g2"><div><h3 class="h">🔍 렌즈 수사왕 TOP 5</h3><table class="rank"><tr><th>순위</th><th>이름</th><th>맞힌 퀴즈</th></tr>${top.map(([sid, n], i) => `<tr class="${sid === ctx.sid ? "me" : ""}"><td>${i + 1}</td><td>${esc(nameOf(D, sid))}</td><td>${n}개</td></tr>`).join("")}</table></div>
      <div><h3 class="h">🙈 못 찾겠지상 (정답률 가장 낮은 퀴즈)</h3>${hard ? `<div class="ent"><img src="${hard.e.img}" alt=""><div class="b"><div class="tt">${esc(hard.e.q)}</div><div class="nm">${esc(nameOf(D, hard.sid))} · 정답률 ${pct(hard.ok, hard.n)}% · 정답: ${esc(hard.e.a)}</div></div></div>` : "<p class='hint'>2명 이상 푼 퀴즈가 아직 없어요.</p>"}</div></div>`);
  }

  function render(step, D, ctx, draft) {
    switch (step.t) {
      case "wordcloud": return wordcloud(step, D, ctx);
      case "quizset": return quizset(step, D, ctx);
      case "judge": return judge(step, D, ctx);
      case "short": return short(step, D, ctx);
      case "ops": return ops(step, D, ctx);
      case "freetext": return freetext(step, D, ctx);
      case "nextword": return nextword(step, D, ctx);
      case "form": return form(step, D, ctx, draft);
      case "pgallery": return gallery(step, D, ctx);
      case "imgplay": return imgplay(step, D, ctx);
      case "imgresult": return imgresult(step, D, ctx);
      case "d1winners": return UI.voteResult(D, ctx).replace("시상! 역대급 가짜뉴스", "어제의 역대급 가짜뉴스 수상작");
    }
    return "";
  }
  // 학생 화면 버튼·입력 연결. api: { put(path, value), refresh(), edit(on), draft, setDraft(obj), compress(file) }
  function bind(root, step, D, ctx, api) {
    const q = s => [...root.querySelectorAll(s)];
    q("[data-act=edit]").forEach(b => b.onclick = () => api.edit(true));
    q("[data-act=refresh]").forEach(b => b.onclick = () => api.refresh());
    q("[data-act=wcsend]").forEach(b => b.onclick = () => { const w = q("input.wc").map(i => i.value.trim()).filter(Boolean); if (!w.length) return; api.put(`ans/${step.id}/${ctx.sid}`, w); api.edit(false); });
    q("[data-qs]").forEach(b => b.onclick = () => api.put(`ans/${step.id}/${ctx.sid}/${b.dataset.qs}`, +b.dataset.k));
    q("[data-jg]").forEach(b => b.onclick = () => api.put(`ans/${step.id}/${ctx.sid}/${b.dataset.jg}`, b.dataset.k));
    q("[data-act=shsend]").forEach(b => b.onclick = () => { const vals = q("input.bl").map(i => i.value.trim()); api.put(`ans/${step.id}/${ctx.sid}`, { vals, ok: step.blanks.map((bl, j) => blankOk(bl, vals[j])), at: Date.now() }); });
    q("[data-op]").forEach(b => b.onclick = () => { const i = +b.dataset.op, m = step.missions[i]; const v = root.querySelector(`input.opq[data-i="${i}"]`).value.trim(); if (!v) return; api.put(`ans/${step.id}/${ctx.sid}/${i}`, { q: v, ok: new RegExp(m.re, "i").test(v), at: Date.now() }); });
    q("input.opq").forEach(inp => inp.onkeydown = e => { if (e.key === "Enter") root.querySelector(`[data-op="${inp.dataset.i}"]`).click(); });
    q("[data-act=ftsend]").forEach(b => b.onclick = () => { const v = { at: Date.now(), name: ctx.name }; q("input.ft").forEach(i => v[i.dataset.k] = i.value.trim()); api.put(`ans/${step.id}/${ctx.sid}`, v); api.edit(false); });
    q("[data-act=nwsend]").forEach(b => b.onclick = () => { api.put(`ans/${step.id}/${ctx.sid}`, q("input.nw").map(i => i.value.trim())); api.edit(false); });
    q("[data-iq]").forEach(b => b.onclick = () => api.put(`qa/${b.dataset.iq}/${ctx.sid}`, +b.dataset.k));
    if (step.t === "form") {
      const collect = () => { const d = Object.assign({}, api.draft); q("[data-f]").forEach(i => d[i.dataset.f] = i.value); step.fields.filter(f => f.type === "checks").forEach(f => d[f.k] = q(`[data-c="${f.k}"]`).filter(c => c.checked).map(c => c.value)); api.setDraft(d); return d; };
      q("[data-f],[data-c]").forEach(i => i.addEventListener("input", collect));
      q("[data-f]").forEach(i => i.addEventListener("input", () => { const c = root.querySelector(`[data-cnt="${i.dataset.f}"]`); if (c) { const mx = i.getAttribute("maxlength"); c.textContent = `${i.value.length} / ${mx}자`; c.classList.toggle("full", i.value.length >= +mx); } }));
      q("[data-img]").forEach(i => i.onchange = async ev => { const f = ev.target.files[0]; if (!f) return; const m = root.querySelector("#fmsg"); if (m) m.textContent = "이미지 줄이는 중…"; try { const d = collect(); d[i.dataset.img] = await api.compress(f); api.setDraft(d); api.refresh(); } catch (e) { if (m) m.textContent = "이 이미지는 열 수 없어요. JPG나 PNG를 골라 주세요."; } });
      q("[data-act=fmsend]").forEach(b => b.onclick = () => {
        const d = Object.assign({}, posts(D, step.id)[ctx.sid] || {}, collect());
        const miss = step.fields.filter(f => f.req && (f.type === "checks" ? !(d[f.k] || []).length : !String(d[f.k] || "").trim())).map(f => f.label.replace("🔒 ", ""));
        if (step.id === "fakepost" && (d.tricks || []).length < 2) miss.push("속임수 2개 이상");
        const m = root.querySelector("#fmsg"); if (miss.length) { m.textContent = "아직 비어 있어요: " + miss.join(", "); return; }
        d.name = ctx.name; d.at = Date.now(); api.put(`posts/${step.id}/${ctx.sid}`, d); api.put(`hidden2/${step.id}/${ctx.sid}`, null); api.setDraft({}); m.textContent = "제출했어요!";
      });
    }
  }

  window.UI2 = { TYPES, INPUT_TYPES, REVEAL_TYPES, render, bind, modal, cloudHtml, quizScore, posts };
})();
