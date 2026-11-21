// 参加者画面
import { db, TS, MOCK } from './db.js';
import { CFG_DEFAULT, toArr, sum, other, remaining, giftSet, giftPick, giftAuto } from './logic.js';
import { esc, teamColor, patch, fmtSec, sid, ukey, tkey, giftHTML, BG_HTML } from './ui.js';

document.body.insertAdjacentHTML('afterbegin', BG_HTML);
const app = document.getElementById('app');
const store = MOCK ? sessionStorage : localStorage;   // お試しモードではタブごとに別の参加者
let me = store.getItem('xmas_me');
const S = { state: {}, users: {}, cfg: CFG_DEFAULT, teams: {} };
const L = { sel: null, qid: null, bet: 0, tools: [], toolsKey: '', zoom: 1, gsel: null, gkey: '', err: '', paid: {} };
const subs = {};

function want(key, path) {
  if (!path) { if (subs[key]) { subs[key].off(); delete subs[key]; S[key] = null; } return; }
  if (subs[key]?.path === path) return;
  subs[key]?.off(); S[key] = null;
  subs[key] = { path, off: db.on(path, v => { S[key] = v; render(); }) };
}
db.on('state', v => { S.state = v || {}; render(); });
db.on('users', v => { S.users = v || {}; render(); });
db.on('teams', v => { S.teams = v || {}; render(); });
db.on('config', v => { S.cfg = { ...CFG_DEFAULT, ...(v || {}) }; render(); });
if (me) db.presence('presence/' + me);

const U = () => S.users[me];
const total = () => sum(S.myPoints);
const name = k => S.users[k]?.name ?? '?';
const who = k => `<span class="pid">${esc(sid(k))}</span> ${esc(name(k))}`;
const partnerOf = pid => pid.split('-').find(k => k !== me);
const fmtN = n => Number(n || 0).toLocaleString('en-US');

function syncSubs() {
  const st = S.state, u = U(), ph = st.phase;
  want('myPoints', me ? 'points/' + me : null);
  want('question', ph === 'quiz' && st.qid ? 'questions/' + st.qid : null);
  want('myAnswer', ph === 'quiz' && st.qid && me ? `answers/${st.qid}/${me}` : null);
  const rkey = ph === 'quiz' ? st.qid : ph === 'tools' ? 'r2tools' : ph === 'spot' ? 'r2spot' : null;
  want('myResult', rkey && st.result === rkey && me ? `results/${rkey}/${me}` : null);
  want('toolAssets', ph === 'tools' ? 'assets/tools' : null);
  want('toolSolo', ph === 'tools' && me ? 'tools/solo/' + me : null);
  want('toolDraft', ph === 'tools' && u?.team ? 'tools/draft/' + u.team : null);
  want('toolTeam', ph === 'tools' && u?.team ? 'tools/team/' + u.team : null);
  want('spotAsset', ph === 'spot' ? 'assets/spot' : null);
  want('spotMarks', ph === 'spot' && u?.team ? `spot/${u.team}/marks` : null);
  want('gift', ph === 'gift' && u?.pair && st.giftGame ? `gift/g${st.giftGame}/${u.pair}` : null);
}

// ---------------- 描画 ----------------
const WM = { lobby: 'MERRY<br>XMAS', team: 'TEAM<br>UP', pair: 'BEST<br>PAIR', quiz: 'HOLY<br>NIGHT', tools: 'SURVIVAL', spot: 'FIND<br>IT', gift: 'PRESENT', end: 'THANK<br>YOU' };
function render() {
  syncSubs();
  const wm = document.getElementById('wm');
  if (!me || !U()) { if (wm) wm.innerHTML = 'MERRY<br>XMAS'; patch(app, viewEntry()); return; }
  const st = S.state, ph = st.phase;
  if (wm) wm.innerHTML = WM[ph] || WM.lobby;
  let body;
  if (S.myResult) body = viewResult();
  else if (ph === 'quiz' && S.question) body = viewQuestion();
  else if (ph === 'tools') body = viewTools();
  else if (ph === 'spot') body = viewSpot();
  else if (ph === 'gift') body = viewGift();
  else if (ph === 'team') body = viewTeam();
  else if (ph === 'pair') body = viewPair();
  else body = viewHome();
  patch(app, (ph && !['lobby', 'end', undefined].includes(ph) ? topbar() : '') + (L.err ? `<div class="err">${esc(L.err)}</div>` : '') + body);
  if (ph === 'spot') drawMarks();
  tick();
}

function topbar() {
  const u = U();
  let mid = `<span class="nm">${esc(u.name)}</span>`;
  if (S.state.phase === 'gift' && u.pair) mid = `<span class="nm">vs ${who(partnerOf(u.pair))}</span>`;
  else if (['tools', 'spot', 'team'].includes(S.state.phase) && u.team) mid = `<span class="pill" style="background:${teamColor(u.team)}">TEAM ${esc(sid(u.team))}</span>`;
  return `<div class="topbar"><span class="idchip">${esc(sid(me))}</span>${mid}<div class="pts"><small>SCORE</small>${fmtN(total())}</div></div>`;
}

function viewEntry() {
  return `<div class="logo"><div class="l1">iMEDIA LAB PRESENTS</div>
      <div class="l0">ZHOU LAB</div><div class="l2">XMAS<br>PARTY</div><div class="l3">2026</div>
      ${giftHTML(6, '', '')}<div class="jp">研究室クリスマスパーティー</div></div>
    <div class="card" style="margin-top:18px"><div class="lbl">NICKNAME</div>
      <input class="input" id="nick" maxlength="12" placeholder="Your name" autocomplete="off" style="margin-top:6px"></div>
    ${L.err ? `<div class="err">${esc(L.err)}</div>` : ''}
    <div style="margin-top:auto"><button class="btn xmas" data-act="reg"><span class="ico">🎁</span>ENTRY<small>参加する</small></button>
    <details style="margin-top:16px;text-align:center"><summary class="muted">ID で復帰 / Re-login with ID</summary>
      <div class="row" style="margin-top:8px"><input class="input grow" id="reid" inputmode="numeric" placeholder="ID"><button class="ab main" data-act="relogin" style="padding:12px 18px">OK</button></div></details>
    ${MOCK ? '<p class="center muted" style="font-size:11px">ローカルお試しモード</p>' : ''}</div>`;
}

function viewHome() {
  const u = U();
  const chips = [u.team ? `<span class="pill" style="background:${teamColor(u.team)}">TEAM ${esc(sid(u.team))}</span>` : '',
    u.pair ? `<span class="pill" style="background:var(--lav)">PAIR ▸ ${esc(sid(partnerOf(u.pair)))}</span>` : ''].join('');
  return `<div class="card idcard" style="margin-top:8px"><div class="lbl" style="margin-top:6px">YOUR ID</div>
      <div class="big">${esc(sid(me))}</div><div class="who">${esc(u.name)}</div><div class="chips">${chips}</div></div>
    <div class="card row" style="margin-top:14px;justify-content:space-between"><div class="lbl">SCORE</div><div class="bigstat" style="font-size:34px;font-weight:900">${fmtN(total())}</div></div>
    ${waiting(S.state.phase === 'end' ? 'THANK YOU!' : 'WAITING FOR NEXT STAGE', S.state.phase === 'end' ? 'ありがとうございました' : '次のステージまでお待ちください')}`;
}
const waiting = (t, jp) => `<div class="wait"><div class="dots"><i></i><i></i><i></i></div><div class="t" data-t="${t}">${t}</div><div class="jp">${jp}</div></div>`;

// ---- 問題（練習・R1・R4） ----
function viewQuestion() {
  const q = S.question, a = S.myAnswer, st = S.state;
  if (L.qid !== st.qid) { L.qid = st.qid; L.sel = null; L.bet = 0; }
  const ox = q.type === 'ox', choices = ox ? ['O', 'X'] : ['A', 'B', 'C', 'D'];
  const lab = c => c === 'O' ? '○' : c === 'X' ? '×' : c;
  const timeUp = q.limit && db.now() > q.startAt + q.limit * 1000;
  const tag = q.round === 0 ? 'PRACTICE' : q.round === 4 ? 'FINAL ROUND' : 'ROUND 1';
  const title = q.round === 4 ? 'ALL OR NOTHING' : `QUESTION ${q.no ?? ''}`;
  const sub = q.round === 4 ? '○か×か、<mark>持ち点を賭けよう</mark>' : q.round === 0 ? '練習問題（得点なし）' : 'わかったら答えよう・<mark>早いほど高得点</mark>';
  let h = `<div class="head"><span class="tag ${q.round === 4 ? 'append' : ''}">${tag}</span><div class="t" data-t="${title}">${title}</div><div class="jp">${sub}</div></div>`;
  if (a) {
    return h + `<div class="locked"><div class="ch c${a.c}">${lab(a.c)}</div>
      <div class="stamp">🔒 ANSWER LOCKED</div>${q.round === 4 ? `<div class="bet"><div class="lbl">YOUR BET</div><div class="v">${fmtN(a.bet)}</div></div>` : ''}
      <div class="jp">回答しました。結果発表をお待ちください</div></div>${waiting('WAITING FOR RESULT', '')}`;
  }
  if (!q.open || timeUp) return h + `<div class="bigicon">⏰</div><div class="center en" style="font-size:28px;font-weight:900">TIME UP</div>${waiting('WAITING FOR RESULT', '')}`;
  if (q.limit) h += `<div class="timer"><span>⏱</span><div class="tbar"><i data-s="${q.startAt}" data-e="${q.startAt + q.limit * 1000}"></i></div><span class="tnum" data-deadline="${q.startAt + q.limit * 1000}"></span></div>`;
  h += `<div class="choices ${L.sel ? 'dimmed' : ''}" ${ox ? 'style="gap:18px;margin:8px 6px"' : ''}>${choices.map(c =>
    `<div class="ch c${c} ${L.sel === c ? 'sel' : ''}" data-act="choose" data-c="${c}">${lab(c)}${L.sel === c ? '<span class="tick">✓</span>' : ''}</div>`).join('')}</div>`;
  if (q.round === 4) {
    const max = Math.max(total(), 0); L.bet = Math.min(L.bet, max);
    h += `<div class="card bet"><div class="lbl">YOUR BET</div><div class="v"><span id="betv">${fmtN(L.bet)}</span> <small>/ ${fmtN(max)}</small></div>
      <input type="range" class="slider" id="bet" min="0" max="${max}" step="${max >= 2000 ? 50 : 10}" value="${L.bet}" style="--p:${max ? L.bet / max * 100 : 0}%">
      <div class="quick"><button data-act="betset" data-f="0">0</button><button data-act="betset" data-f="0.5">HALF</button><button data-act="betset" data-f="1">ALL IN</button></div></div>`;
  }
  return h + `<div style="margin-top:auto"><button class="btn ${q.round === 4 ? 'xmas' : ''}" data-act="submit" ${L.sel ? '' : 'disabled'}>${q.round === 4 ? '<span class="ico">🎁</span>' : ''}DECIDE<small>決定（変更できません）</small></button></div>`;
}

// ---- 判定（採点ボタンのあと） ----
function viewResult() {
  const r = S.myResult, ph = S.state.phase;
  let judge, cls = '', pts = r.pts ?? 0, label = 'POINTS';
  if (ph === 'tools' || ph === 'spot') { judge = `RANK ${r.rank ?? '-'}`; label = 'TEAM POINTS'; }
  else if (r.res === 'ok') judge = 'CORRECT!';
  else if (r.res === 'ng') { judge = 'WRONG…'; cls = 'ng'; }
  else { judge = 'TIME UP'; cls = 'none'; }
  const practice = ph === 'quiz' && S.question?.round === 0;
  return `<div class="result">${r.res === 'ok' || r.rank ? '<div class="burst"></div>' : ''}
    <div class="judge ${cls}">${judge}</div>
    ${r.res === 'ok' || r.rank ? '<span class="spark" style="left:12%;top:90px;font-size:28px">✦</span><span class="spark" style="right:12%;top:110px;font-size:20px">✦</span><span class="spark" style="right:20%;top:190px;font-size:26px">✦</span>' : ''}
    ${practice ? '<div class="plus" style="font-size:24px">PRACTICE<small>練習なので得点なし</small></div>'
      : `<div class="plus">${pts >= 0 ? '+' : '−'}${fmtN(Math.abs(pts))}<small>${label}</small></div>`}
    ${waiting('WAITING FOR NEXT', '次をお待ちください')}</div>`;
}

// ---- チーム作り ----
function viewTeam() {
  const u = U(), t = u.team && S.teams[u.team];
  const head = `<div class="head"><span class="tag" style="background:var(--easy)">TEAM</span><div class="t" data-t="MAKE A TEAM">MAKE A TEAM</div><div class="jp">チームを作る or チーム番号で参加</div></div>`;
  if (!t) return head + `<div class="card center"><button class="btn" data-act="mkteam" style="margin-top:4px"><span class="ico">👑</span>CREATE<small>チームを作る（リーダー）</small></button>
      <div class="lbl" style="margin:22px 0 6px">OR JOIN · TEAM No.</div>
      <input class="input" id="jteam" inputmode="numeric" placeholder="No.">
      <button class="btn sub" data-act="jointeam">JOIN<small>参加する</small></button></div>`;
  const mem = Object.keys(t.members || {}).sort();
  return head + `<div class="card center"><div class="lbl">TEAM No.</div>
    <div class="teamno" style="background:${teamColor(u.team)}">${esc(sid(u.team))}</div>
    <div class="muted en">${mem.length} / ${S.cfg.teamSize}</div>
    <ul class="mem">${mem.map(k => `<li>${t.leader === k ? '👑 ' : ''}${who(k)}</li>`).join('')}</ul>
    <button class="ab warn" data-act="leaveteam">LEAVE · 退出</button></div>`;
}

// ---- ペア作り ----
function viewPair() {
  const u = U();
  const head = `<div class="head"><span class="tag" style="background:var(--master)">PAIR</span><div class="t" data-t="FIND A PARTNER">FIND A PARTNER</div><div class="jp">お互いに相手のIDを入力すると成立</div></div>`;
  if (u.pair) {
    const p = partnerOf(u.pair);
    return head + `<div class="card idcard"><div class="lbl" style="margin-top:6px">YOUR PARTNER</div><div class="big" style="font-size:120px">${esc(sid(p))}</div><div class="who">${esc(name(p))}</div></div>${waiting('PAIRED!', 'ペア成立')}`;
  }
  return head + `<div class="card center"><div class="lbl">PARTNER'S ID</div>
    <input class="input" id="pid" inputmode="numeric" placeholder="ID" style="margin-top:6px">
    <button class="btn" data-act="pair">OK</button>
    ${u.pairReq ? `<p class="muted">⏳ ${who(u.pairReq)} …</p>` : ''}</div>`;
}

// ---- R2 道具選び ----
function viewTools() {
  const st = S.state, u = U(), assets = toArr(S.toolAssets), N = S.cfg.pickCount;
  const team = u.team && S.teams[u.team], leader = team?.leader === me;
  const open = st.toolOpen && db.now() < (st.toolEndAt || 0);
  const solo = st.toolStep !== 'team';
  const head = `<div class="head"><span class="tag" style="background:var(--easy)">ROUND 2 · ${solo ? 'SOLO' : 'TEAM'}</span><div class="t" data-t="SURVIVAL KIT">SURVIVAL KIT</div>
    <div class="jp">${solo ? `持っていく道具を${N}個えらぼう（自分で）` : leader ? `チームの${N}個を決めて提出しよう` : 'リーダーがチームの答えを提出します'}</div></div>`;
  if (!assets.length) return head + waiting('LOADING…', '');
  let mode, picks;
  if (solo) { if (S.toolSolo) { mode = 'view'; picks = toArr(S.toolSolo); } else mode = open ? 'edit' : 'view'; }
  else if (S.toolTeam) { mode = 'view'; picks = toArr(S.toolTeam); }
  else if (leader && open) mode = 'edit';
  else { mode = 'view'; picks = toArr(S.toolDraft); }
  const key = (st.toolStep || '') + (leader ? 'L' : '');
  if (L.toolsKey !== key) { L.toolsKey = key; L.tools = solo ? [] : toArr(S.toolDraft); }
  const sel = mode === 'edit' ? L.tools : (picks || []);
  const done = solo ? !!S.toolSolo : !!S.toolTeam;
  let h = head + `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="lbl">SELECTED</span>
    ${open ? `<span class="tnum" data-deadline="${st.toolEndAt}" style="font-size:18px"></span>` : ''}<b class="en" style="font-size:28px;color:var(--mint)">${sel.length} / ${N}</b></div>`;
  if (done) h += `<div class="stamp" style="display:flex;justify-content:center;margin:0 0 10px">✓ SUBMITTED</div>`;
  else if (!open) h += `<div class="stamp" style="display:flex;justify-content:center;margin:0 0 10px;color:var(--red)">⏰ TIME UP</div>`;
  h += `<div class="tools">${assets.map((a, i) =>
    `<button class="tl ${sel.includes(i) ? 'on' : ''}" ${mode === 'edit' ? `data-act="tool" data-i="${i}"` : 'disabled'}><img src="${a.data}" alt=""><span class="n">${i + 1}</span></button>`).join('')}</div>`;
  if (mode === 'edit') h += `<div class="sticky"><button class="btn" data-act="toolsubmit" ${L.tools.length === N ? '' : 'disabled'}>DECIDE ${L.tools.length}/${N}<small>決定（変更できません）</small></button></div>`;
  return h;
}

// ---- R2 間違い探し ----
function viewSpot() {
  const st = S.state, u = U(), a = S.spotAsset;
  const leader = u.team && S.teams[u.team]?.leader === me;
  const open = st.spotOpen && db.now() < (st.spotEndAt || 0);
  const head = `<div class="head" style="margin-bottom:8px"><span class="tag" style="background:var(--hard)">ROUND 2 · TEAM</span><div class="t" data-t="FIND IT!">FIND IT!</div>
    <div class="jp">${leader ? '👑 タップで〇をつける（もう一度タップで消す）' : '見つけたらリーダーに伝えよう'}</div></div>`;
  if (!a) return head + waiting('LOADING…', '');
  return head + `<div class="spotbar">${[1, 2, 3].map(z => `<button class="zoom ${L.zoom === z ? 'on' : ''}" data-act="zoom" data-z="${z}">×${z}</button>`).join('')}
      <span class="grow"></span><b id="spotcnt" class="en"></b>
      ${open ? `<span class="tnum" data-deadline="${st.spotEndAt}" style="font-size:20px"></span>` : '<b class="en" style="color:var(--red)">TIME UP</b>'}</div>
    <div class="spotwrap"><div class="spotinner" id="spotinner" style="width:${L.zoom * 100}%"><img src="${a.data}" alt=""><div class="marks" id="marks"></div></div></div>`;
}
function drawMarks() {
  const el = document.getElementById('marks'); if (!el) return;
  const marks = toArr(S.spotMarks);
  el.innerHTML = marks.map(m => `<div class="mark" style="left:${m.x * 100}%;top:${m.y * 100}%"></div>`).join('');
  const c = document.getElementById('spotcnt'); if (c) c.textContent = `⭕ ${marks.length} / ${S.state.spotCap ?? '-'}`;
}
async function spotTap(el, e) {
  const u = U(), st = S.state;
  if (!(st.spotOpen && db.now() < st.spotEndAt) || !u.team || S.teams[u.team]?.leader !== me) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  const aspect = S.spotAsset?.aspect || 1, rad = S.cfg.spotRadius;
  const marks = toArr(S.spotMarks);
  const i = marks.findIndex(m => Math.hypot(m.x - x, (m.y - y) * aspect) <= rad);
  if (i >= 0) marks.splice(i, 1);
  else if (marks.length < (st.spotCap ?? 99)) marks.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
  else return flash('⭕ MAX');
  S.spotMarks = marks; drawMarks();
  await db.set(`spot/${u.team}/marks`, marks.length ? marks : null);
}

// ---- R3 プレゼント選び ----
function viewGift() {
  const g = S.gift, u = U(), n = S.state.giftGame;
  const head = `<div class="head" style="margin-bottom:10px"><span class="tag" style="background:var(--expert)">ROUND 3 · GAME ${n || ''}</span><div class="t" data-t="PRESENT CHOICE">PRESENT CHOICE</div>
    <div class="jp">💣入りを避けて、<mark>数字の分だけポイント</mark></div></div>`;
  if (!u.pair) return head + waiting('NO PARTNER', 'ペアがいません。幹事に伝えてください');
  if (!g) return head + waiting('READY…', '');
  const side = g.a === me ? 'a' : 'b';
  if (L.gkey !== g.turn + g.phase) { L.gkey = g.turn + g.phase; L.gsel = null; }
  const rem = remaining(g);
  const iSet = g.phase === 'set' && g.setter === side, iPick = g.phase === 'pick' && g.setter !== side;
  const act = iSet || iPick;
  let h = head;
  if (g.over) {
    h += `<div class="over">🎉 FINISH!</div><div class="card center" style="margin-bottom:10px"><div class="lbl">YOUR POINTS</div>
      <div class="en" style="font-size:44px;font-weight:900;color:var(--mint)">+${fmtN((g.score?.[side] || 0) * S.cfg.giftMul)}</div></div>`;
  } else {
    const status = iSet ? '💣 HIDE THE BOMB<small>💣を入れるプレゼントを選ぶ</small>' : iPick ? '🎁 OPEN ONE!<small>開けるプレゼントを選ぶ</small>'
      : g.phase === 'set' ? '⏳ WAIT…<small>相手が💣を入れています</small>' : '⏳ WAIT…<small>相手がプレゼントを選んでいます</small>';
    h += `<div class="turn ${act ? 'me' : ''}"><b>${status}</b>${g.deadline ? `<span data-deadline="${g.deadline}"></span>` : ''}</div>`;
    if (g.lastPick) h += `<div class="last">前のターン：${g.lastPick === g.lastPos ? `🎁${g.lastPick} は <b>💣</b>！` : `🎁${g.lastPick} → 💣は <b>${g.lastPos}</b> でした`}</div>`;
  }
  h += '<div class="gifts">';
  for (let k = 1; k <= 10; k++) {
    const avail = rem.includes(k);
    const myBomb = g.setter === side && g.phase === 'pick' && g.pos === k;
    const cls = [!avail ? 'gone' : '', L.gsel === k ? 'on' : '', myBomb ? 'bomb' : ''].join(' ');
    h += `<button class="giftbtn" ${act && avail ? `data-act="gnum" data-n="${k}"` : 'disabled'}>${giftHTML(k, cls, myBomb ? '💣' : k)}</button>`;
  }
  h += '</div>' + giftTable(g, side);
  if (act) h += `<button class="btn ${iSet ? 'xmas' : ''}" data-act="ggo" ${L.gsel ? '' : 'disabled'}>${iSet ? `💣 HIDE${L.gsel ? ' IN ' + L.gsel : ''}` : `🎁 OPEN${L.gsel ? ' ' + L.gsel : ''}`}<small>決定</small></button>`;
  return h;
}
function giftTable(g, side) {
  const log = toArr(g.log), sides = [side, other(side)];
  const rows = sides.map(s => log.filter(e => e.side === s));
  const cols = Math.max(3, ...rows.map(r => r.length));
  return `<div class="card" style="padding:8px 12px 10px;overflow-x:auto"><table class="tbl"><tr><th></th>${[...Array(cols)].map((_, i) => `<th>${i + 1}</th>`).join('')}<th>💣</th><th>TOTAL</th></tr>` +
    sides.map((s, k) => `<tr class="${s === side ? 'me' : ''}"><td>${esc(sid(g[s]))} ${esc(name(g[s]))}</td>${[...Array(cols)].map((_, i) => {
      const e = rows[k][i]; return `<td>${!e ? '' : e.bomb ? '💣' : `${e.cum}<small>+${e.num}</small>`}</td>`;
    }).join('')}<td>${g.bombs?.[s] || 0}</td><td class="tot">${g.score?.[s] || 0}</td></tr>`).join('') + '</table></div>';
}
async function giftGo() {
  const g = S.gift, n = L.gsel; if (!g || !n) return;
  const path = `gift/g${S.state.giftGame}/${U().pair}`, turn = g.turn, phase = g.phase;
  await db.txn(path, cur => {
    if (cur.turn !== turn || cur.phase !== phase) return;
    const ng = phase === 'set' ? giftSet(cur, n) : giftPick(cur, n); if (!ng) return;
    ng.deadline = db.now() + S.cfg.giftTurnSec * 1000; return ng;
  });
  L.gsel = null; render();
}
async function giftTick() {
  const g = S.gift; if (S.state.phase !== 'gift' || !g) return;
  const path = `gift/g${S.state.giftGame}/${U().pair}`;
  if (g.over) {                        // 終わったら自動で加点（何度書いても同じ値）
    const key = path + ':' + (g.score?.a ?? 0) + ':' + (g.score?.b ?? 0);
    if (L.paid[key]) return; L.paid[key] = true;
    const m = S.cfg.giftMul, src = 'r3g' + S.state.giftGame;
    await db.update('points', { [`${g.a}/${src}`]: (g.score?.a || 0) * m, [`${g.b}/${src}`]: (g.score?.b || 0) * m });
    return;
  }
  if (!g.deadline || db.now() < g.deadline + 1500) return;
  await db.txn(path, cur => {
    if (cur.over || cur.turn !== g.turn || cur.phase !== g.phase || db.now() < cur.deadline + 1500) return;
    const ng = giftAuto(cur); if (!ng) return; ng.deadline = db.now() + S.cfg.giftTurnSec * 1000; return ng;
  });
}

// ---------------- 操作 ----------------
let flashT;
function flash(msg) { L.err = msg; render(); clearTimeout(flashT); flashT = setTimeout(() => { L.err = ''; render(); }, 2500); }
const val = id => document.getElementById(id)?.value?.trim() ?? '';
function login(k) { me = k; store.setItem('xmas_me', me); db.presence('presence/' + me); render(); }

const ACT = {
  async reg() {
    const nick = val('nick'); if (!nick) return flash('ニックネームを入力 / Enter your name');
    const n = await db.txn('meta/userCounter', c => (c || 0) + 1, true);
    const k = 'u' + String(n).padStart(2, '0');
    await db.set('users/' + k, { name: nick, joined: TS });
    login(k);
  },
  async relogin() {
    const k = ukey(val('reid'));
    if (!k || !(await db.get('users/' + k))) return flash('ID ?');
    login(k);
  },
  choose(el) { L.sel = el.dataset.c; render(); },
  betset(el) { L.bet = Math.round(Math.max(total(), 0) * +el.dataset.f / 10) * 10; if (+el.dataset.f === 1) L.bet = Math.max(total(), 0); render(); },
  async submit() {
    const q = S.question; if (!L.sel || !q?.open || S.myAnswer) return;
    if (q.limit && db.now() > q.startAt + q.limit * 1000) return;
    const a = { c: L.sel, t: TS };
    if (q.round === 4) a.bet = Math.min(L.bet, Math.max(total(), 0));
    if (await db.get(`answers/${S.state.qid}/${me}`)) return;
    await db.set(`answers/${S.state.qid}/${me}`, a);
  },
  async mkteam() {
    const n = await db.txn('meta/teamCounter', c => (c || 0) + 1, true);
    const tid = 't' + n;
    await db.set('teams/' + tid, { leader: me, members: { [me]: true } });
    await db.set(`users/${me}/team`, tid);
  },
  async jointeam() {
    const tid = tkey(val('jteam')); if (!tid) return flash('No. ?');
    const r = await db.txn('teams/' + tid, cur => {
      const m = cur.members || {};
      if (Object.keys(m).length >= S.cfg.teamSize) return;
      m[me] = true; cur.members = m; return cur;
    });
    if (!r) return flash('× FULL / NOT FOUND（満員 or なし）');
    await db.set(`users/${me}/team`, tid);
  },
  async leaveteam() {
    const tid = U().team;
    await db.txn('teams/' + tid, cur => {
      delete (cur.members || {})[me];
      const rest = Object.keys(cur.members || {}).sort();
      if (!rest.length) return null;
      if (cur.leader === me) cur.leader = rest[0];
      return cur;
    });
    await db.set(`users/${me}/team`, null);
  },
  async pair() {
    const p = ukey(val('pid'));
    if (!p || !S.users[p] || p === me) return flash('ID ?');
    if (S.users[p].pair) return flash('× ALREADY PAIRED（ペア済み）');
    await db.set(`users/${me}/pairReq`, p);
  },
  tool(el) {
    const i = +el.dataset.i, k = L.tools.indexOf(i);
    if (k >= 0) L.tools.splice(k, 1);
    else if (L.tools.length < S.cfg.pickCount) L.tools.push(i);
    else return flash(`MAX ${S.cfg.pickCount}`);
    if (S.state.toolStep === 'team') db.set('tools/draft/' + U().team, L.tools.length ? [...L.tools] : null);
    render();
  },
  async toolsubmit() {
    const st = S.state;
    if (L.tools.length !== S.cfg.pickCount || !(st.toolOpen && db.now() < st.toolEndAt)) return;
    if (st.toolStep === 'team') await db.set('tools/team/' + U().team, [...L.tools]);
    else await db.set('tools/solo/' + me, [...L.tools]);
  },
  zoom(el) { L.zoom = +el.dataset.z; render(); },
  gnum(el) { L.gsel = +el.dataset.n; render(); },
  ggo: giftGo,
};

app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && ACT[el.dataset.act]) { ACT[el.dataset.act](el); return; }
  const sp = e.target.closest('#spotinner');
  if (sp) spotTap(sp, e);
});
app.addEventListener('input', e => {
  if (e.target.id === 'bet') {
    L.bet = +e.target.value;
    const v = document.getElementById('betv'); if (v) v.textContent = fmtN(L.bet);
    e.target.style.setProperty('--p', (e.target.max > 0 ? L.bet / e.target.max * 100 : 0) + '%');
  }
});
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'nick') ACT.reg(); });

// ペア成立チェック（お互いが相手のIDを入力したら成立）
async function checkPair() {
  const u = U(); if (!u || u.pair || !u.pairReq) return;
  const p = S.users[u.pairReq];
  if (p?.pairReq === me && !p.pair) {
    const [a, b] = [me, u.pairReq].sort(), pid = `${a}-${b}`;
    await db.update('', { [`pairs/${pid}`]: { a, b }, [`users/${a}/pair`]: pid, [`users/${b}/pair`]: pid, [`users/${a}/pairReq`]: null, [`users/${b}/pairReq`]: null });
  }
}

function tick() {
  const now = db.now();
  for (const el of document.querySelectorAll('[data-deadline]')) el.textContent = (el.closest('.timer') ? '' : '⏱ ') + fmtSec(+el.dataset.deadline - now);
  for (const el of document.querySelectorAll('.tbar i[data-e]')) {
    const s = +el.dataset.s, e = +el.dataset.e; el.style.width = Math.max(0, Math.min(100, (e - now) / (e - s) * 100)) + '%';
  }
}
setInterval(() => { render(); checkPair(); giftTick(); }, 250);
render();
