// 参加者画面
import { db, TS, MOCK } from './db.js';
import { CFG_DEFAULT, toArr, sum, other, remaining, ranking, giftSet, giftPick, giftAuto } from './logic.js';
import { esc, patch, fmtSec, fmtN, sid, ukey, tkey, ICON, wreathHTML, ornamentHTML, BG_HTML } from './ui.js';

const stage = document.querySelector('.stage');
stage.insertAdjacentHTML('afterbegin', BG_HTML);
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
const partnerOf = pid => pid.split('-').find(k => k !== me);
const testOn = () => MOCK || S.cfg.testMode;

function syncSubs() {
  const st = S.state, u = U(), ph = st.phase;
  want('myPoints', me ? 'points/' + me : null);
  want('allPoints', me && S.cfg.showRank && st.result ? 'points' : null);
  want('ctime', me && S.cfg.showRank && st.result ? 'ctime' : null);
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

// ---------------- 部品 ----------------
function top() {
  const u = U(), ph = S.state.phase;
  let nm = `<span>${esc(u.name)}</span>`;
  if (ph === 'gift' && u.pair) nm = `<span>${esc(u.name)}<span class="vs">vs</span>${esc(name(partnerOf(u.pair)))}</span>`;
  else if (u.team && ['tools', 'spot', 'team'].includes(ph)) nm += `<span class="tag">TEAM ${esc(sid(u.team))}</span>`;
  return `<div class="top"><div class="idc"><small>ID</small>${esc(sid(me))}</div><div class="nm">${nm}</div>
    <div class="sc"><small>SCORE</small><b>${fmtN(total())}</b></div></div><div class="divider"></div>`;
}
const hd = (eyebrow, title, sub = '') => `<div class="hd"><div class="eyebrow">${eyebrow}</div><div class="title">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const waiting = (en, jp = '') => `<div class="waiting"><div class="dm"><i></i><i></i><i></i></div><div class="en">${en}</div>${jp ? `<div class="jp">${jp}</div>` : ''}</div>`;
const testLink = () => testOn() ? `<button class="link" data-act="logout">${ICON.logout}ログイン画面に戻る（テスト用）</button>` : '';
const bottom = inner => `<div class="bottom">${inner}${testLink()}</div>`;
const OX_SVG = { O: '<svg class="mk" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="5"/></svg>',
  X: '<svg class="mk" viewBox="0 0 100 100"><path d="M20 20L80 80M80 20L20 80" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>' };
const ring = (s, e) => `<div class="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>
  <circle class="rg" cx="32" cy="32" r="29" fill="none" stroke="#e3cc95" stroke-width="1.8" stroke-dasharray="182.2" data-s="${s}" data-e="${e}"/></svg>
  <div class="rn"><b data-deadline="${e}"></b><small>SEC</small></div></div>`;

// ---------------- 描画 ----------------
function render() {
  syncSubs();
  stage.classList.toggle('entry', !me || !U());
  if (!me || !U()) { patch(app, viewEntry()); tick(); return; }
  const st = S.state, ph = st.phase;
  let body;
  if (S.myResult) body = viewResult();
  else if (ph === 'quiz' && S.question) body = viewQuestion();
  else if (ph === 'tools') body = viewTools();
  else if (ph === 'spot') body = viewSpot();
  else if (ph === 'gift') body = viewGift();
  else if (ph === 'team') body = viewTeam();
  else if (ph === 'pair') body = viewPair();
  else body = viewHome();
  patch(app, top() + body + (L.err ? `<div class="err">${esc(L.err)}</div>` : ''));
  if (ph === 'spot') drawMarks();
  tick();
}

function viewEntry() {
  return `<div class="entry-head"><div class="eyebrow">iMedia Lab presents</div><div class="title">Merry Christmas</div><div class="eyebrow t2">Zhou Lab · Xmas Party</div></div>
    <div style="margin-top:26px">${wreathHTML('<div class="lbl">HOLY NIGHT</div><div class="big">2026</div>', { size: 210 })}</div>
    <div class="entry-jp">研究室クリスマスパーティー</div>
    <div class="card lined"><div class="lbl">Nickname</div><div class="field">${ICON.pen}<input id="nick" maxlength="12" placeholder="Your name" autocomplete="off"></div></div>
    ${L.err ? `<div class="err">${esc(L.err)}</div>` : ''}
    <div class="bottom"><button class="btn" data-act="reg">Entry<small>参加する</small></button>
      <details><summary class="link">ID で復帰 / Re-login with ID</summary>
        <div class="relogin"><input id="reid" inputmode="numeric" placeholder="ID"><button data-act="relogin">OK</button></div></details>
      ${MOCK ? '<div class="link" style="cursor:default">ローカルお試しモード（タブごとに別の参加者）</div>' : ''}</div>`;
}

function viewHome() {
  const u = U(), end = S.state.phase === 'end';
  const chips = [u.team ? `<span class="chip">${ICON.users}TEAM ${esc(sid(u.team))}</span>` : '', u.pair ? `<span class="chip">${ICON.link}PAIR ${esc(sid(partnerOf(u.pair)))}</span>` : ''].join('');
  return hd(end ? 'Thank you' : 'Welcome', end ? 'See you <em>next year</em>' : `Hello, <em>${esc(u.name)}</em>`, end ? 'ありがとうございました' : 'あなたのIDはこちら')
    + wreathHTML(`<div class="lbl">YOUR ID</div><div class="big xl">${esc(sid(me))}</div>`, { size: 210 })
    + (chips ? `<div class="chips">${chips}</div>` : '')
    + bottom(waiting(end ? 'MERRY CHRISTMAS' : 'WAITING FOR NEXT', end ? '' : '次のステージまでお待ちください'));
}

// ---- 問題 ----
const hasText = q => q.type !== 'ox' && q.choices && Object.values(q.choices).some(v => v);
function choiceEl(q, c, on, small = false) {
  const lab = c === 'O' ? '○' : c === 'X' ? '×' : c;
  if (q.type === 'ox') return `<div class="ox ${on ? 'on' : ''}" ${small ? '' : `data-act="choose" data-c="${c}"`}>${on && !small ? `<span class="ck">${ICON.check}</span>` : ''}${OX_SVG[c]}<span class="cap">${c === 'O' ? 'TRUE' : 'FALSE'}</span></div>`;
  if (hasText(q)) return `<button class="opt ${on ? 'on' : ''}" ${small ? 'disabled' : `data-act="choose" data-c="${c}"`}><span class="lt">${lab}</span><span class="tx">${esc(q.choices?.[c] || '')}</span><span class="ck">${ICON.check}</span></button>`;
  return `<div class="sq ${on ? 'on' : ''}" ${small ? '' : `data-act="choose" data-c="${c}"`}>${lab}${on && !small ? `<span class="ck">${ICON.check}</span>` : ''}</div>`;
}
function qHead(q) {
  if (q.round === 4) return hd('Final Round', 'All <em>or</em> Nothing', '○か×か、持ち点を賭けよう');
  if (q.round === 0) return hd('Practice', `Question <em>No.${q.no ?? ''}</em>`, '練習問題（得点なし）');
  return hd('Round 1', `Question <em>No.${q.no ?? ''}</em>`, 'わかったら答えよう・早いほど高得点');
}
function viewQuestion() {
  const q = S.question, a = S.myAnswer, st = S.state;
  if (L.qid !== st.qid) { L.qid = st.qid; L.sel = null; L.bet = 0; }
  const choices = q.type === 'ox' ? ['O', 'X'] : ['A', 'B', 'C', 'D'];
  const end = q.startAt + (q.limit || 0) * 1000;
  const timeUp = q.limit && db.now() > end;
  let h = qHead(q);
  if (a) {
    return h + `<div class="locked"><div class="pick" ${hasText(q) ? 'style="width:100%"' : ''}>${choiceEl(q, a.c, true, true)}</div>
      <div class="stamp">${ICON.check}ANSWER LOCKED</div>
      ${q.round === 4 ? `<div class="note">YOUR BET　<b style="font-family:var(--serif);font-size:20px;color:#fff">${fmtN(a.bet)}</b></div>` : ''}
      <div class="note">回答しました。結果発表をお待ちください</div></div>` + bottom(waiting('WAITING FOR RESULT'));
  }
  if (!q.open || timeUp) return h + `<div class="locked"><div class="stamp">${ICON.clock}TIME UP</div><div class="note">時間切れです</div></div>` + bottom(waiting('WAITING FOR RESULT'));
  if (q.limit) h += ring(q.startAt, end);
  const wrap = q.type === 'ox' ? 'oxs' : hasText(q) ? 'opts' : 'sqs';
  h += `<div class="${wrap}">${choices.map(c => choiceEl(q, c, L.sel === c)).join('')}</div>`;
  if (q.round === 4) {
    const max = Math.max(total(), 0); L.bet = Math.min(L.bet, max);
    h += `<div class="card bet"><div class="row1"><span class="lbl">Your bet</span><span class="v"><span id="betv">${fmtN(L.bet)}</span> <small>/ ${fmtN(max)}</small></span></div>
      <input type="range" class="slider" id="bet" min="0" max="${max}" step="${max >= 2000 ? 50 : 10}" value="${L.bet}" style="--p:${max ? L.bet / max * 100 : 0}%">
      <div class="quick"><button data-act="betset" data-f="0">0</button><button data-act="betset" data-f="0.5">HALF</button><button class="all" data-act="betset" data-f="1">ALL IN</button></div></div>`;
  }
  return h + bottom(`<button class="btn" data-act="submit" ${L.sel ? '' : 'disabled'}>Decide<small>決定（変更できません）</small></button>`);
}

// ---- 結果 ----
function myRank() {
  const rk = ranking(S.users, S.allPoints || {}, S.ctime || {});
  const i = rk.findIndex(r => r.id === me); return i >= 0 ? i + 1 : null;
}
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'ST' : n % 10 === 2 && n % 100 !== 12 ? 'ND' : n % 10 === 3 && n % 100 !== 13 ? 'RD' : 'TH');
function viewResult() {
  const r = S.myResult, ph = S.state.phase;
  const rank = S.cfg.showRank && S.allPoints ? myRank() : null;
  if (ph === 'tools' || ph === 'spot') {
    return hd(ph === 'tools' ? 'Round 2 · Survival Kit' : 'Round 2 · Find the Difference', 'Team <em>Result</em>')
      + wreathHTML(`<div class="lbl">YOUR TEAM IS</div><em>Rank</em><div class="big xl" style="font-size:72px">${r.rank ?? '-'}</div><div class="lbl">${r.rank ? ordinal(r.rank) + ' PLACE' : ''}</div>`, { size: 250 })
      + `<div class="card" style="text-align:center;width:170px;margin:18px auto 0;padding:10px"><div style="font-family:var(--serif);font-size:34px;color:var(--navy)">+${fmtN(r.pts)}</div><div class="lbl" style="font-size:8px">TEAM POINTS</div></div>`
      + bottom(waiting('WAITING FOR NEXT', '次をお待ちください'));
  }
  const q = S.question || {};
  const j = r.res === 'ok' ? 'Correct!' : r.res === 'ng' ? 'Wrong…' : 'Time up';
  const pts = r.pts ?? 0;
  const p = q.round === 0 ? `<div class="p" style="font-size:22px">Practice<small>練習なので得点なし</small></div>`
    : `<div class="p">${pts >= 0 ? '+' : '−'}${fmtN(Math.abs(pts))}<small>POINTS</small></div>`;
  const chips = [r.ms != null && r.res !== 'none' ? `<span class="chip">${ICON.clock}回答 ${(r.ms / 1000).toFixed(1)} 秒</span>` : '',
    rank && q.round !== 0 ? `<span class="chip">${ICON.medal}現在 ${rank} 位</span>` : ''].join('');
  return `<div style="height:12px"></div>` + ornamentHTML(`<div class="j ${r.res === 'ok' ? '' : r.res}">${j}</div>${p}`)
    + (chips ? `<div class="chips">${chips}</div>` : '') + bottom(waiting('WAITING FOR NEXT', '次をお待ちください'));
}

// ---- チーム ----
function viewTeam() {
  const u = U(), t = u.team && S.teams[u.team];
  const h = hd('Team', 'Make a <em>Team</em>', 'チームを作る、または番号で参加');
  if (!t) return h + `<div class="card lined"><button class="btn light" data-act="mkteam" style="margin-top:4px">Create<small>チームを作る（リーダーになる）</small></button>
      <div class="or">or</div><div class="lbl">Join · Team No.</div>
      <div class="inline"><div class="field">${ICON.users}<input id="jteam" inputmode="numeric" placeholder="No."></div><button class="btn" data-act="jointeam">Join</button></div></div>` + bottom('');
  const mem = Object.keys(t.members || {}).sort();
  return h + `<div class="card lined teambox"><div class="lbl">Team No.</div><div class="tno">${esc(sid(u.team))}</div>
    <div class="lbl" style="color:var(--ink2)">${mem.length} / ${S.cfg.teamSize} MEMBERS</div>
    <ul class="mem">${mem.map(k => `<li>${t.leader === k ? ICON.crown : ''}<span class="pid">${esc(sid(k))}</span>${esc(name(k))}</li>`).join('')}</ul>
    <button class="link" data-act="leaveteam" style="margin-top:6px">チームから抜ける / Leave</button></div>` + bottom('');
}

// ---- ペア ----
function viewPair() {
  const u = U(), h = hd('Pair', 'Find a <em>Partner</em>', 'お互いに相手のIDを入力すると成立');
  if (u.pair) {
    const p = partnerOf(u.pair);
    return h + wreathHTML(`<div class="lbl">YOUR PARTNER</div><div class="big xl" style="font-size:80px">${esc(sid(p))}</div><div style="letter-spacing:.1em">${esc(name(p))}</div>`, { size: 210 }) + bottom(waiting('PAIRED', 'ペア成立'));
  }
  return h + `<div class="card lined"><div class="lbl">Partner's ID</div>
    <div class="inline"><div class="field">${ICON.link}<input id="pid" inputmode="numeric" placeholder="ID"></div><button class="btn" data-act="pair">OK</button></div>
    ${u.pairReq ? `<p class="hint" style="text-align:center;letter-spacing:.1em;color:var(--ink2)">ID ${esc(sid(u.pairReq))}（${esc(name(u.pairReq))}）の入力を待っています…</p>` : ''}</div>` + bottom('');
}

// ---- R2 道具選び ----
function viewTools() {
  const st = S.state, u = U(), assets = toArr(S.toolAssets), N = S.cfg.pickCount;
  const leader = u.team && S.teams[u.team]?.leader === me;
  const open = st.toolOpen && db.now() < (st.toolEndAt || 0);
  const solo = st.toolStep !== 'team';
  let h = hd(`Round 2 · ${solo ? 'Solo' : 'Team'}`, 'Survival <em>Kit</em>',
    solo ? `持っていく道具を ${N} 個えらぼう` : leader ? `チームの ${N} 個を決めて提出しよう` : 'リーダーがチームの答えを提出します');
  if (!assets.length) return h + bottom(waiting('LOADING'));
  let mode, picks;
  if (solo) { if (S.toolSolo) { mode = 'view'; picks = toArr(S.toolSolo); } else mode = open ? 'edit' : 'view'; }
  else if (S.toolTeam) { mode = 'view'; picks = toArr(S.toolTeam); }
  else if (leader && open) mode = 'edit';
  else { mode = 'view'; picks = toArr(S.toolDraft); }
  const key = (st.toolStep || '') + (leader ? 'L' : '');
  if (L.toolsKey !== key) { L.toolsKey = key; L.tools = solo ? [] : toArr(S.toolDraft); }
  const sel = mode === 'edit' ? L.tools : (picks || []);
  const done = solo ? !!S.toolSolo : !!S.toolTeam;
  h += `<div class="meta"><span class="t">${ICON.clock}${open ? `<span data-deadline="${st.toolEndAt}"></span>&nbsp;SEC` : 'TIME UP'}</span><b>${sel.length}<small> / ${N}</small></b></div>`;
  if (done) h += `<div class="done"><span class="stamp">${ICON.check}SUBMITTED</span></div>`;
  h += `<div class="tiles">${assets.map((a, i) => `<button class="tile ${sel.includes(i) ? 'on' : ''}" ${mode === 'edit' ? `data-act="tool" data-i="${i}"` : 'disabled'}>
      <span class="no">${String(i + 1).padStart(2, '0')}</span><img src="${a.data}" alt="">${a.label ? `<span class="nm">${esc(a.label)}</span>` : ''}</button>`).join('')}</div>`;
  return h + bottom(mode === 'edit' ? `<button class="btn" data-act="toolsubmit" ${L.tools.length === N ? '' : 'disabled'}>Decide<small>${L.tools.length} / ${N}　決定（変更できません）</small></button>` : waiting(done ? 'SUBMITTED' : 'PLEASE WAIT'));
}

// ---- R2 間違い探し ----
function viewSpot() {
  const st = S.state, u = U(), a = S.spotAsset;
  const leader = u.team && S.teams[u.team]?.leader === me;
  const open = st.spotOpen && db.now() < (st.spotEndAt || 0);
  const h = hd('Round 2 · Team', 'Find the <em>Difference</em>', leader ? 'タップで〇をつける（もう一度で消す）' : '見つけたらリーダーに伝えよう');
  if (!a) return h + bottom(waiting('LOADING'));
  return h + `<div class="zooms">${[1, 2, 3].map(z => `<button class="${L.zoom === z ? 'on' : ''}" data-act="zoom" data-z="${z}">×${z}</button>`).join('')}
      <span class="cnt" id="spotcnt"></span><span class="meta" style="margin:0 0 0 12px"><span class="t">${ICON.clock}${open ? `<span data-deadline="${st.spotEndAt}"></span>` : 'TIME UP'}</span></span></div>
    <div class="spotwrap"><div class="spotinner" id="spotinner" style="width:${L.zoom * 100}%"><img src="${a.data}" alt=""><div class="marks" id="marks"></div></div></div>` + bottom('');
}
function drawMarks() {
  const el = document.getElementById('marks'); if (!el) return;
  const marks = toArr(S.spotMarks);
  el.innerHTML = marks.map(m => `<div class="mark" style="left:${m.x * 100}%;top:${m.y * 100}%"></div>`).join('');
  const c = document.getElementById('spotcnt'); if (c) c.textContent = `○ ${marks.length} / ${S.state.spotCap ?? '-'}`;
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
  else return flash('これ以上つけられません');
  S.spotMarks = marks; drawMarks();
  await db.set(`spot/${u.team}/marks`, marks.length ? marks : null);
}

// ---- R3 プレゼントツリー ----
function viewGift() {
  const g = S.gift, u = U(), n = S.state.giftGame;
  let h = hd(`Round 3 · Game ${n || ''}`, 'Present <em>Tree</em>', 'ハズレ（💣）を避けて、数字の分だけポイント');
  if (!u.pair) return h + bottom(waiting('NO PARTNER', 'ペアがいません。幹事に伝えてください'));
  if (!g) return h + bottom(waiting('READY'));
  const side = g.a === me ? 'a' : 'b';
  if (L.gkey !== g.turn + g.phase) { L.gkey = g.turn + g.phase; L.gsel = null; }
  const rem = remaining(g);
  const iSet = g.phase === 'set' && g.setter === side, iPick = g.phase === 'pick' && g.setter !== side, act = iSet || iPick;
  if (g.over) h += `<div class="finish"><div class="eyebrow">Finish</div><div class="p">+${fmtN((g.score?.[side] || 0) * S.cfg.giftMul)}</div><div class="lbl" style="color:var(--gold2)">YOUR POINTS</div></div>`;
  else {
    h += `<div class="turnline">${act ? `<b>YOUR TURN</b>　${iSet ? '💣を入れるプレゼントを選ぶ' : '開けるプレゼントを選ぶ'}` : `<b>WAIT</b>　${g.phase === 'set' ? '相手が💣を入れています' : '相手が選んでいます'}`}
      ${g.deadline ? `<span class="tm" data-deadline="${g.deadline}"></span>` : ''}</div>`;
    if (g.lastPick) h += `<div class="lastline">前のターン：${g.lastPick === g.lastPos ? `${g.lastPick} は 💣！` : `${g.lastPick} を開けた（💣は ${g.lastPos}）`}</div>`;
  }
  const cell = k => {
    const avail = rem.includes(k), myBomb = g.setter === side && g.phase === 'pick' && g.pos === k;
    const cls = [!avail ? 'gone' : '', L.gsel === k ? 'on' : '', myBomb ? 'bomb' : ''].join(' ');
    return `<button class="gt ${cls}" ${act && avail ? `data-act="gnum" data-n="${k}"` : 'disabled'}>${myBomb ? ICON.bomb : avail ? ICON.gift : ICON.open}<span>${k}</span></button>`;
  };
  h += `<div class="tree"><div class="star">✦</div>${[[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]].map(r => `<div class="trow">${r.map(cell).join('')}</div>`).join('')}<div class="trunk"></div></div>`;
  const log = toArr(g.log);
  h += `<div class="card ptable">${[side, other(side)].map(s => {
    const turn = !g.over && ((g.phase === 'set' && g.setter === s) || (g.phase === 'pick' && g.setter !== s));
    return `<div class="pr"><span class="no">${esc(sid(g[s]))}</span><span>${esc(name(g[s]))}</span>${turn ? '<span class="turn">TURN</span>' : ''}
      <span class="hist">${log.filter(e => e.side === s).map(e => `<i class="${e.bomb ? 'b' : ''}">${e.bomb ? '💣' : '+' + e.num}</i>`).join('')}</span>
      <span class="tot">${g.score?.[s] || 0}</span></div>`;
  }).join('')}</div>`;
  return h + bottom(act ? `<button class="btn" data-act="ggo" ${L.gsel ? '' : 'disabled'}>${iSet ? `Hide${L.gsel ? ' ' + L.gsel : ''}` : `Open${L.gsel ? ' ' + L.gsel : ''}`}<small>${iSet ? 'このプレゼントに💣を入れる' : 'このプレゼントを開ける'}</small></button>` : '');
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
  const g = S.gift; if (S.state.phase !== 'gift' || !g || !U()?.pair) return;
  const path = `gift/g${S.state.giftGame}/${U().pair}`;
  if (g.over) {
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
function flash(msg) { L.err = msg; render(); clearTimeout(flashT); flashT = setTimeout(() => { L.err = ''; render(); }, 2600); }
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
    if (!k || !(await db.get('users/' + k))) return flash('そのIDは見つかりません');
    login(k);
  },
  logout() {
    if (me) db.set('presence/' + me, null);
    store.removeItem('xmas_me'); me = null; L.err = ''; render();
  },
  choose(el) { L.sel = el.dataset.c; render(); },
  betset(el) { const f = +el.dataset.f, max = Math.max(total(), 0); L.bet = f === 1 ? max : Math.round(max * f / 10) * 10; render(); },
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
    const tid = tkey(val('jteam')); if (!tid) return flash('チーム番号を入力してください');
    const r = await db.txn('teams/' + tid, cur => {
      const m = cur.members || {};
      if (Object.keys(m).length >= S.cfg.teamSize) return;
      m[me] = true; cur.members = m; return cur;
    });
    if (!r) return flash('満員、またはそのチームはありません');
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
    if (!p || !S.users[p] || p === me) return flash('そのIDは見つかりません');
    if (S.users[p].pair) return flash('その人はすでにペアがいます');
    await db.set(`users/${me}/pairReq`, p);
  },
  tool(el) {
    const i = +el.dataset.i, k = L.tools.indexOf(i);
    if (k >= 0) L.tools.splice(k, 1);
    else if (L.tools.length < S.cfg.pickCount) L.tools.push(i);
    else return flash(`選べるのは ${S.cfg.pickCount} 個までです`);
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
  if (el && !el.disabled && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el); return; }
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
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'nick') ACT.reg(); if (e.key === 'Enter' && e.target.id === 'reid') ACT.relogin(); });

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
  for (const el of document.querySelectorAll('[data-deadline]')) el.textContent = fmtSec(+el.dataset.deadline - now);
  for (const el of document.querySelectorAll('.rg[data-e]')) {
    const s = +el.dataset.s, e = +el.dataset.e, r = Math.max(0, Math.min(1, (e - now) / (e - s)));
    el.style.strokeDashoffset = (182.2 * (1 - r)).toFixed(1);
  }
}
setInterval(() => { render(); checkPair(); giftTick(); }, 250);
render();
