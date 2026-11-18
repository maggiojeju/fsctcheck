// 교사·학생 화면이 함께 쓰는 화면 조각
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const frame = (title, inner) => `<div class="sheet"><div class="tab">${esc(title)}</div><div class="card">${inner}</div></div>`;
  const stat = (label, num) => `<div class="stat"><div class="label">${label}</div><div class="num">${num}</div></div>`;
  const nameOf = (D, sid) => (D.students && D.students[sid] && D.students[sid].name) || "";
  function bars(rows, opt = {}) { // rows: [label, n, cls]
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="bars ${opt.wide ? "wide" : ""}">${rows.map(([l, n, c]) => `<div class="bar ${c || ""}"><span>${l}</span><i style="width:${Math.round(n / max * 100)}%"></i><b>${n}${opt.unit || "명"}</b></div>`).join("")}</div>`;
  }

  // ---------- 오프닝 퀴즈
  function quizStats(D) {
    const per = QUIZ.map((it, q) => { const v = Object.values((D.quiz || {})[q] || {}); return { n: v.length, nO: v.filter(x => x === "O").length, nX: v.filter(x => x === "X").length, correct: v.filter(x => x === it.answer).length }; });
    const by = {};
    QUIZ.forEach((it, q) => Object.entries((D.quiz || {})[q] || {}).forEach(([sid, v]) => { by[sid] = by[sid] || 0; if (v === it.answer) by[sid]++; }));
    const ps = Object.keys(by);
    return { per, by, n: ps.length, avg: ps.length ? ps.reduce((s, k) => s + by[k], 0) / ps.length : 0 };
  }
  function quiz(step, D, ctx) {
    const it = QUIZ[step.q], a = (D.quiz || {})[step.q] || {}, mine = a[ctx.sid], rv = !!D.state.reveal;
    const vals = Object.values(a), nO = vals.filter(v => v === "O").length, nX = vals.length - nO;
    const btn = k => `<button class="${k} ${mine === k ? "on" : ""} ${rv && it.answer === k ? "right" : ""}" data-ox="${k}" ${ctx.role !== "student" || rv ? "disabled" : ""}>${k}<small>${k === "O" ? "진짜" : "가짜"}</small></button>`;
    let tail = "";
    if (rv) {
      const ok = mine ? mine === it.answer : null;
      tail = `<div class="verdict ${ctx.role !== "student" || ok === null ? "info" : ok ? "ok" : "no"}">${ctx.role === "student" ? (ok === null ? "답하지 않았어요. " : ok ? "맞았어요! " : "속았어요! ") : ""}${esc(it.explain)}</div>
        <h3 class="h">우리 반 선택</h3>${bars([["O 진짜", nO, it.answer === "O" ? "win" : ""], ["X 가짜", nX, it.answer === "X" ? "win" : ""]])}`;
    } else tail = `<p class="hint">${ctx.role === "student" ? (mine ? "선택 완료! 다른 답으로 바꿔도 돼요." : "진짜일까, 가짜일까?") : `응답 ${vals.length}명 · R 키로 정답 공개`}</p>`;
    return frame(`진짜일까, 가짜일까? ${step.q + 1} / ${QUIZ.length}`, `<div class="qtext">${esc(it.text)}</div><div class="ox">${btn("O")}${btn("X")}</div>${tail}`);
  }
  function quizSummary(D, ctx) {
    const s = quizStats(D);
    const rows = s.per.map((p, q) => [`${q + 1}번 ${QUIZ[q].answer === "O" ? "진짜" : "가짜"}`, pct(p.correct, p.n), pct(p.correct, p.n) < 50 ? "" : "win"]);
    const hard = s.per.map((p, q) => ({ q, r: p.n ? p.correct / p.n : 1 })).sort((x, y) => x.r - y.r)[0];
    return frame("오프닝 퀴즈 결과", `<div class="stats">${ctx.role === "student" ? stat("내 점수", `${s.by[ctx.sid] || 0}<small> / 10</small>`) : ""}${stat("반 평균", `${s.avg.toFixed(1)}<small> / 10</small>`)}${stat("참여", `${s.n}<small>명</small>`)}</div>
      <h3 class="h">문제별 정답률</h3>${bars(rows, { unit: "%" })}
      ${hard && s.n ? `<p class="hint">가장 많이 속은 문제: ${hard.q + 1}번 — ${esc(QUIZ[hard.q].text)}</p>` : ""}`);
  }

  // ---------- 미니 설문
  function poll(D, ctx) {
    const v = D.poll || {}, mine = v[ctx.sid];
    const counts = POLL.options.map((_, i) => Object.values(v).filter(x => x === i).length);
    const btns = ctx.role === "student" ? `<div class="choices">${POLL.options.map((o, i) => `<button data-poll="${i}" class="${mine === i ? "on" : ""}">${esc(o)}</button>`).join("")}</div>` : "";
    const show = ctx.role !== "student" || mine != null;
    return frame("미니 설문", `<div class="qtext">${esc(POLL.q)}</div>${btns}
      ${show ? `<h3 class="h">우리 반 결과 (${Object.keys(v).length}명)</h3>${bars(POLL.options.map((o, i) => [esc(o), counts[i], counts[i] === Math.max(...counts) && counts[i] ? "win" : ""]))}` : `<p class="hint">하나를 고르면 우리 반 결과가 보여요.</p>`}
      <p class="hint">내가 정보를 가장 많이 만나는 곳이, 가짜뉴스를 가장 많이 만나는 곳이기도 해요.</p>`);
  }

  // ---------- AI 얼굴 점수
  function aiface(D, ctx) {
    const v = D.ai || {}, mine = v[ctx.sid], vals = Object.values(v);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const btns = ctx.role === "student" ? `<h3 class="h">5번 중 몇 번 맞혔나요?</h3><div class="choices">${[0, 1, 2, 3, 4, 5].map(n => `<button data-ai="${n}" class="${mine === n ? "on" : ""}">${n}번</button>`).join("")}</div>` : "";
    return frame("AI 얼굴 게임 · 우리 반 점수", `${btns}
      <div class="stats" style="margin-top:12px">${ctx.role === "student" && mine != null ? stat("내 정답률", `${pct(mine, 5)}<small>%</small>`) : ""}${stat("우리 반 평균", `${vals.length ? Math.round(avg / 5 * 100) : "-"}<small>%</small>`)}${stat("연구 결과", `62<small>%</small>`)}${stat("입력", `${vals.length}<small>명</small>`)}</div>
      ${vals.length ? `<h3 class="h">맞힌 개수별 인원</h3>${bars([5, 4, 3, 2, 1, 0].map(n => [`${n}번`, vals.filter(x => x === n).length, ""]))}` : ""}
      <p class="hint">눈으로만 판단하면 반은 틀릴 수 있어요. 그래서 ‘확인하는 방법’이 필요해요 (2일차).</p>`);
  }

  // ---------- 뉴스 문장 구분하기
  function sort(D, ctx) {
    const v = D.sort || {}, mine = v[ctx.sid] || {}, rv = !!D.state.reveal;
    const items = SORT.map((it, i) => {
      const cnt = SORT_KINDS.map(k => Object.values(v).filter(m => m && m[i] === k).length);
      const seg = ctx.role === "student" ? `<div class="seg">${SORT_KINDS.map(k => `<button data-sort="${i}" data-k="${k}" class="${mine[i] === k ? "on" : ""} ${rv && it.answer === k ? "right" : ""}" ${rv ? "disabled" : ""}>${k}</button>`).join("")}</div>` : "";
      const mini = (ctx.role !== "student" || rv) ? `<div class="mini" style="margin-top:6px">${SORT_KINDS.map((k, j) => `<span>${k} <b>${cnt[j]}</b></span>`).join(" · ")}</div>` : "";
      const ex = rv ? `<div class="verdict ${ctx.role === "student" && mine[i] ? (mine[i] === it.answer ? "ok" : "no") : "info"}">정답: ${it.answer} — ${esc(it.explain)}</div>` : "";
      return `<div class="srt"><div class="t">${i + 1}. ${esc(it.text)}</div>${seg}${mini}${ex}</div>`;
    }).join("");
    const done = Object.keys(v).length;
    return frame("뉴스 문장 구분하기 (활동지 1쪽)", `<div class="sub">${ctx.role === "student" ? "문장마다 사실 · 의견 · 확인필요 중 하나를 골라요. 활동지에는 고른 이유를 적어요." : `응답 ${done}명 · R 키로 정답 공개`}</div>${items}`);
  }

  // ---------- 연대기
  function cardScore(order) {
    if (!order) return 0;
    return order.split("").reduce((s, id, i) => s + (CARD_YEARS[id] === CARD_YEARS[CARD_ANSWER[i]] ? 1 : 0), 0);
  }
  function cardsTeacher(D) {
    const v = D.cards || {}, rows = Object.values(v);
    const dist = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(n => [`${n}칸`, rows.filter(r => cardScore(r.order) === n).length, ""]).filter(r => r[1]);
    return frame("팩트체크 연대기 순서 맞히기", `<div class="stats">${stat("제출", `${rows.length}<small>명</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div>
      <p class="hint">학생들은 각자 화면에서 카드를 오래된 순서로 눌러 제출해요. 다음 화면에서 정답 연표와 순위가 공개돼요.</p>
      ${dist.length ? `<h3 class="h">맞힌 칸 수 분포 (정답은 아직 비공개)</h3>${bars(dist)}` : ""}`);
  }
  function cardsResult(D, ctx) {
    const list = Object.entries(D.cards || {}).map(([sid, c]) => ({ sid, ...c, score: cardScore(c.order) })).sort((a, b) => b.score - a.score || (a.at || 0) - (b.at || 0));
    const tl = CARD_ANSWER.map(id => `<div><b>${CARD_YEARS[id]}</b><i>${id}</i><span>${esc(CARDS.find(c => c.id === id).text)}</span></div>`).join("");
    const mineIdx = list.findIndex(r => r.sid === ctx.sid);
    const top = list.slice(0, 10).map((r, i) => `<tr class="${r.sid === ctx.sid ? "me" : ""}"><td>${i + 1}위</td><td>${esc(r.name)}</td><td>${r.score} / 10</td></tr>`).join("");
    return frame("팩트체크 연대기 · 정답과 순위", `
      ${ctx.role === "student" ? `<div class="stats">${stat("내 점수", mineIdx >= 0 ? `${list[mineIdx].score}<small> / 10</small>` : "-")}${mineIdx >= 0 ? stat("내 순위", `${mineIdx + 1}<small>위</small>`) : ""}</div>` : ""}
      <h3 class="h">정답 연표</h3><div class="tline">${tl}</div>
      <p class="hint">같은 해(1923, 1938)의 두 카드는 순서가 바뀌어도 정답이에요.</p>
      ${list.length ? `<h3 class="h">TOP 10</h3><table class="rank"><tr><th>순위</th><th>이름</th><th>맞힌 칸</th></tr>${top}</table>` : ""}`);
  }

  // ---------- 출품작
  const visible = D => Object.entries(D.entries || {}).filter(([sid]) => !(D.hidden || {})[sid]).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  function entryCard(sid, e) {
    return `<button class="ent" data-open="${sid}">${e.img ? `<img src="${e.img}" alt="">` : `<div class="noimg">이미지 없음</div>`}
      <div class="b"><div class="k">${esc(e.kind)}</div><div class="tt">${esc(e.title)}</div><div class="nm">${esc(e.name)}${e.partner ? " · " + esc(e.partner) : ""}</div></div></button>`;
  }
  function entryFull(e) {
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v).replace(/\n/g, "<br>")}</dd>` : "";
    return `<dl class="cardv">${row("분류", e.kind)}${row("언제 · 어디서", e.when)}${row("어떤 거짓?", e.lie)}
      <div class="stg s1">${row("1단계 유포", e.s1)}</div><div class="stg s2">${row("2단계 증폭", e.s2)}</div><div class="stg s3">${row("3단계 피해", e.s3)}${e.harms && e.harms.length ? `<dd>☑ ${e.harms.map(esc).join(" ☑ ")}</dd>` : ""}</div>
      ${row("왜 믿었을까?", e.why)}${row("진실과 출처", e.truth)}${e.link ? `<dt>출처 링크</dt><dd><a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.link)}</a></dd>` : ""}
      ${e.img ? `<dt>관련 자료 이미지</dt><dd><img src="${e.img}" alt=""></dd>` : ""}${row("한 줄 교훈", e.lesson)}${row("만든 사람", e.name + (e.partner ? " · " + e.partner : ""))}</dl>`;
  }
  function modal(D, openSid, ctx) {
    const e = (D.entries || {})[openSid]; if (!e) return "";
    return `<div class="modal" data-close="1"><div class="sheet" onclick="event.stopPropagation()"><div class="tab">${esc(e.title)}</div><div class="card">${entryFull(e)}
      <div class="actions"><button class="btn" data-close="1">닫기</button>${ctx.role === "teacher" ? `<button class="btn warn" data-hide="${openSid}">이 카드 숨기기</button>` : ""}</div></div></div></div>`;
  }
  function gallery(D, ctx) {
    const list = visible(D);
    return frame(`출품작 둘러보기 (${list.length}개)`, `<div class="sub">카드를 누르면 자세히 볼 수 있어요. 어떤 상에 투표할지 생각해 두세요.</div>
      ${list.length ? `<div class="gal">${list.map(([sid, e]) => entryCard(sid, e).replace('class="ent"', `class="ent ${sid === ctx.sid ? "mine" : ""}"`)).join("")}</div>` : `<p class="hint">아직 출품작이 없어요.</p>`}`);
  }
  function submitTeacher(D) {
    const list = Object.entries(D.entries || {});
    return frame("출품하기", `<div class="stats">${stat("출품", `${list.length}<small>개</small>`)}${stat("참여", `${Object.keys(D.students || {}).length}<small>명</small>`)}</div>
      <p class="hint">학생 화면에 출품 카드 양식이 열려 있어요. 부적절한 카드는 아래에서 숨길 수 있어요(숨긴 카드는 갤러리·투표에 나오지 않아요).</p>
      ${list.length ? `<div class="gal">${list.map(([sid, e]) => entryCard(sid, e) + ((D.hidden || {})[sid] ? `<small style="color:#d2423a">숨김</small>` : "")).join("")}</div>` : ""}`);
  }
  const isMine = (D, ctx, sid) => sid === ctx.sid || ((D.entries || {})[sid] && (D.entries[sid].partner || "").trim() && D.entries[sid].partner.trim() === (ctx.name || "").trim());
  function vote(D, ctx) {
    const list = visible(D), mine = (D.votes || {})[ctx.sid] || {};
    const body = AWARDS.map(([k, name, desc]) => {
      const btns = list.map(([sid, e]) => { const own = isMine(D, ctx, sid); return `<button data-aw="${k}" data-e="${sid}" class="${mine[k] === sid ? "on" : ""}" ${own ? "disabled" : ""}>${esc(e.title)} <small>· ${esc(e.name)}${own ? " (내 카드)" : ""}</small></button>`; }).join("");
      return `<div class="award"><h3>${name} <small>${desc}</small></h3>${ctx.role === "student" ? `<div class="vlist">${btns || "<p class='hint'>출품작이 없어요.</p>"}</div>` : ""}</div>`;
    }).join("");
    const head = ctx.role === "student"
      ? `<div class="sub">상마다 카드 1장씩, 모두 3표! 내 카드는 고를 수 없어요. 다시 누르면 바꿀 수 있어요. 카드 내용은 ‘둘러보기’ 버튼으로 다시 볼 수 있어요.</div><div class="actions"><button class="btn ghost" data-gal="1">출품작 둘러보기</button></div>`
      : `<div class="stats">${stat("투표한 사람", `${Object.keys(D.votes || {}).length}<small>명</small>`)}${stat("출품작", `${list.length}<small>개</small>`)}</div><p class="hint">결과는 다음 화면(시상)에서 공개돼요.</p>`;
    return frame("역대급 가짜뉴스 투표", head + body);
  }
  function voteResult(D, ctx) {
    const ent = D.entries || {};
    const body = AWARDS.map(([k, name]) => {
      const t = {}; Object.values(D.votes || {}).forEach(v => { if (v && v[k] && ent[v[k]] && !(D.hidden || {})[v[k]]) t[v[k]] = (t[v[k]] || 0) + 1; });
      const rows = Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const top = rows.length ? rows[0][1] : 0;
      return `<div class="award"><h3>${name}</h3>${rows.length ? bars(rows.map(([sid, n]) => [`${n === top ? "🥇 " : ""}${esc(ent[sid].title)} <small>(${esc(ent[sid].name)})</small>`, n, n === top ? "win" : ""]), { unit: "표", wide: true }) : "<p class='hint'>표가 없어요.</p>"}</div>`;
    }).join("");
    return frame("시상! 역대급 가짜뉴스", body + `<p class="hint">공동 1위는 함께 수상해요. 수상자는 30초 동안 ‘이 가짜뉴스를 고른 이유’를 발표해요.</p>`);
  }

  window.UI = { esc, pct, frame, bars, stat, quiz, quizSummary, quizStats, poll, aiface, sort, cardScore, cardsTeacher, cardsResult, gallery, submitTeacher, vote, voteResult, modal, entryCard, entryFull, visible, isMine };
})();
