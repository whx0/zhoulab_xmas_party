// 参加者画面
import { db, TS, MOCK, auth } from './db.js';
import { CFG_DEFAULT, toArr, sum, other, remaining, ranking, giftSet, giftPick, giftAuto } from './logic.js';
import { esc, patch, fmtSec, fmtN, sid, ukey, tkey, ICON, wreathHTML, ornamentHTML, BG_HTML } from './ui.js';
import { LANGS, TITLE_DEFAULT, t as tr, rules as rl } from './i18n.js';

const stage = document.querySelector('.stage');
stage.insertAdjacentHTML('afterbegin', BG_HTML);
const app = document.getElementById('app');
const store = MOCK ? sessionStorage : localStorage;   // お試しモードではタブごとに別の参加者
let me = store.getItem('xmas_me');
const S = { state: {}, users: {}, cfg: CFG_DEFAULT, teams: {} };
let lang = localStorage.getItem('xmas_lang') || 'ja';
const t = (k, v) => tr(lang, k, v);
const L = { rules: {}, sel: null, qid: null, bet: 0, tools: [], toolsKey: '', zoom: 1, gsel: null, gkey: '', err: '', paid: {} };
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
db.on('timer', v => { S.timer = v; render(); });
db.on('rules', v => { S.rules = v; render(); });
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
  return `<div class="top"><div class="idc" title="${t('yourId')}"><small>ID</small>${esc(sid(me))}</div><div class="nm">${nm}</div>
    <div class="sc"><small>SCORE</small><b>${fmtN(total())}</b></div></div><div class="divider"></div>${langBar()}`;
}
const langBar = () => `<div class="langs">${LANGS.map(([k, l]) => `<button class="${lang === k ? 'on' : ''}" data-act="lang" data-l="${k}">${l}</button>`).join('')}</div>`;
function timerRemain(tm) { return !tm ? 0 : tm.running ? Math.max(0, tm.endAt - db.now()) : (tm.remain || 0); }
// 分単位の締め切り表示（残り mm:ss ＋ バー）
const cdBar = (s, e) => `<div class="cd"><div class="cdt"><span>${ICON.clock}${t('remain')}</span><b data-mmss="${e}"></b></div><div class="cdbar"><i data-s="${s}" data-e="${e}"></i></div></div>`;
const rulesCard = (key, v) => {
  const open = L.rules[key] !== false;
  return `<div class="rules ${open ? 'open' : ''}"><button class="rh" data-act="rules" data-k="${key}">${ICON.star}<span>${t('rules')}</span><i>${open ? '−' : '+'}</i></button>
    ${open ? `<ol>${rl(lang, key, v, S.rules).map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>`;
};
// 見出し（管理画面で変更できる。最後の単語を斜体に）
function title(key, vars = {}) {
  const raw = String(S.rules?.[key]?.title || TITLE_DEFAULT[key] || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const w = esc(raw).split(' ').filter(Boolean);
  return w.length > 1 ? w.slice(0, -1).join(' ') + ' <em>' + w[w.length - 1] + '</em>' : (w[0] || '');
}
function subOf(key, def) { const o = S.rules?.[key] || {}; const v = o['sub_' + lang] || o.sub_ja; return v ? esc(v) : def; }
const hd = (eyebrow, title, sub = '') => `<div class="hd"><div class="eyebrow">${eyebrow}</div><div class="title">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const waiting = (en, jp = '') => `<div class="waiting"><div class="dm"><i></i><i></i><i></i></div><div class="en">${en}</div>${jp ? `<div class="jp">${jp}</div>` : ''}</div>`;
const testLink = () => testOn() ? `<button class="link" data-act="logout">${ICON.logout}${t('logout')}</button>` : '';
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
  else if (ph === 'timer') body = viewTimer();
  else body = viewHome();
  patch(app, top() + body + (L.err ? `<div class="err">${esc(L.err)}</div>` : ''));
  if (ph === 'spot') drawMarks();
  tick();
}

function viewEntry() {
  return `<div class="langs entry">${LANGS.map(([k, l]) => `<button class="${lang === k ? 'on' : ''}" data-act="lang" data-l="${k}">${l}</button>`).join('')}</div>
    <div class="entry-head"><div class="eyebrow">iMedia Lab presents</div><div class="title">Merry Christmas</div><div class="eyebrow t2">Zhou Lab · Xmas Party</div></div>
    <div style="margin-top:22px">${wreathHTML('<div class="lbl">HOLY NIGHT</div><div class="big">2026</div>', { size: 200 })}</div>
    <div class="entry-jp">${t('entryJp')}</div>
    <div class="card lined"><div class="lbl">Nickname</div><div class="field">${ICON.pen}<input id="nick" maxlength="12" placeholder="${t('nickPh')}" autocomplete="off"></div></div>
    ${L.err ? `<div class="err">${esc(L.err)}</div>` : ''}
    <div class="bottom"><button class="btn" data-act="reg">Entry<small>${t('entrySub')}</small></button>
      <details><summary class="link">${t('relogin')}</summary>
        <div class="relogin"><input id="reid" inputmode="numeric" placeholder="ID"><button data-act="relogin">OK</button></div></details>
    </div>`;
}

function viewHome() {
  const u = U(), end = S.state.phase === 'end';
  const chips = [u.team ? `<span class="chip">${ICON.users}TEAM ${esc(sid(u.team))}</span>` : '', u.pair ? `<span class="chip">${ICON.link}PAIR ${esc(sid(partnerOf(u.pair)))}</span>` : ''].join('');
  return hd(end ? 'Thank you' : t('welcome'), end ? 'See you <em>next year</em>' : `Hello, <em>${esc(u.name)}</em>`, end ? t('thanks') : t('idHint'))
    + wreathHTML(`<div class="lbl">YOUR ID</div><div class="big xl">${esc(sid(me))}</div>`, { size: 200 })
    + (chips ? `<div class="chips">${chips}</div>` : '')
    + (end ? '' : `<div style="margin-top:16px">${rulesCard('lobby')}</div>`)
    + bottom(waiting(end ? 'MERRY CHRISTMAS' : 'WAITING FOR NEXT', end ? '' : t('waitNext')));
}

// ---- タイマー（管理者が出したときに全員に表示） ----
function viewTimer() {
  const tm = S.timer || {}, has = !!tm.dur, remain = timerRemain(tm);
  const st = !has ? 'idle' : remain <= 0 ? 'end' : tm.running ? 'run' : 'pause';
  return `<div class="bigtimer ${st}"><div class="tring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".7"/>
      <circle class="tarc" cx="50" cy="50" r="46" fill="none" stroke="#e3cc95" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="289"/>
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="rgba(201,169,106,.35)" stroke-width=".35"/></svg>
    <div class="tin"><div class="tnum">${st === 'end' ? 'Time up!' : `<span data-tm="1"></span>`}</div>
      <div class="tst">${st === 'end' ? t('timeUpBig') : st === 'pause' ? t('paused') : 'REMAINING'}</div></div></div></div>` + bottom('');
}

// ---- 問題（選択肢は A〜D / ○× だけを表示） ----
function choiceEl(q, c, on, small = false) {
  if (q.type === 'ox') return `<div class="ox ${on ? 'on' : ''}" ${small ? '' : `data-act="choose" data-c="${c}"`}>${on && !small ? `<span class="ck">${ICON.check}</span>` : ''}${OX_SVG[c]}<span class="cap">${c === 'O' ? 'TRUE' : 'FALSE'}</span></div>`;
  return `<div class="sq ${on ? 'on' : ''}" ${small ? '' : `data-act="choose" data-c="${c}"`}>${c}${on && !small ? `<span class="ck">${ICON.check}</span>` : ''}</div>`;
}
const qRule = q => q.round === 4 ? 'final' : q.round === 0 ? 'practice' : 'solo';
function qHead(q) {
  if (q.round === 4) return hd(t('stageFinal'), title('final'), subOf('final', t('subFinal')));
  if (q.round === 0) return hd(t('stagePractice'), title('practice', { no: q.no ?? '' }), subOf('practice', t('subPractice')));
  return hd(t('stageSolo'), title('solo', { no: q.no ?? '' }), subOf('solo', t('subSolo')));
}
function viewQuestion() {
  const q = S.question, a = S.myAnswer, st = S.state;
  if (L.qid !== st.qid) { L.qid = st.qid; L.sel = null; L.bet = 0; }
  const choices = q.type === 'ox' ? ['O', 'X'] : ['A', 'B', 'C', 'D'];
  const end = q.startAt + (q.limit || 0) * 1000;
  const timeUp = q.limit && db.now() > end;
  const rc = rulesCard(qRule(q), { max: S.cfg.r1Max, min: S.cfg.r1Min });
  let h = qHead(q);
  if (a) {
    return h + `<div class="locked"><div class="pick">${choiceEl(q, a.c, true, true)}</div>
      <div class="stamp">${ICON.check}ANSWER LOCKED</div>
      ${q.round === 4 ? `<div class="note">${t('yourBet')}　<b style="font-family:var(--serif);font-size:20px;color:#fff">${fmtN(a.bet)}</b></div>` : ''}
      <div class="note">${t('locked')}</div></div>` + bottom(waiting('WAITING FOR RESULT'));
  }
  if (!q.open || timeUp) return h + `<div class="locked"><div class="stamp">${ICON.clock}TIME UP</div><div class="note">${t('timeUp')}</div></div>` + bottom(waiting('WAITING FOR RESULT', t('waitResult')));
  if (q.limit) h += ring(q.startAt, end);
  h += `<div class="${q.type === 'ox' ? 'oxs' : 'sqs'}">${choices.map(c => choiceEl(q, c, L.sel === c)).join('')}</div>`;
  if (q.round === 4) {
    const max = Math.max(total(), 0); L.bet = Math.min(L.bet, max);
    h += `<div class="card bet"><div class="row1"><span class="lbl">${t('yourBet')}</span><span class="v"><span id="betv">${fmtN(L.bet)}</span> <small>/ ${fmtN(max)}</small></span></div>
      <input type="range" class="slider" id="bet" min="0" max="${max}" step="${max >= 2000 ? 50 : 10}" value="${L.bet}" style="--p:${max ? L.bet / max * 100 : 0}%">
      <div class="quick"><button data-act="betset" data-f="0">0</button><button data-act="betset" data-f="0.5">HALF</button><button class="all" data-act="betset" data-f="1">ALL IN</button></div></div>`;
  }
  return h + `<div style="margin-top:16px">${rc}</div>` + bottom(`<button class="btn" data-act="submit" ${L.sel ? '' : 'disabled'}>Decide<small>${t('decideSub')}</small></button>`);
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
    return hd(ph === 'tools' ? t('stageNasa') : t('stageSpot'), 'Team <em>Result</em>')
      + wreathHTML(`<div class="lbl">YOUR TEAM IS</div><em>Rank</em><div class="big xl" style="font-size:72px">${r.rank ?? '-'}</div><div class="lbl">${r.rank ? ordinal(r.rank) + ' PLACE' : ''}</div>`, { size: 250 })
      + `<div class="card" style="text-align:center;width:170px;margin:18px auto 0;padding:10px"><div style="font-family:var(--serif);font-size:34px;color:var(--navy)">+${fmtN(r.pts)}</div><div class="lbl" style="font-size:8px">${t('teamPoints')}</div></div>`
      + bottom(waiting('WAITING FOR NEXT', t('waitNext2')));
  }
  const q = S.question || {};
  const j = r.res === 'ok' ? 'Correct!' : r.res === 'ng' ? 'Wrong…' : 'Time up';
  const pts = r.pts ?? 0;
  const p = q.round === 0 ? `<div class="p" style="font-size:22px">Practice<small>${t('practiceNo')}</small></div>`
    : `<div class="p">${pts >= 0 ? '+' : '−'}${fmtN(Math.abs(pts))}<small>POINTS</small></div>`;
  const chips = [r.ms != null && r.res !== 'none' ? `<span class="chip">${ICON.clock}${t('ansTime', { s: (r.ms / 1000).toFixed(1) })}</span>` : '',
    rank && q.round !== 0 ? `<span class="chip">${ICON.medal}${t('rankNow', { n: rank })}</span>` : ''].join('');
  return `<div style="height:12px"></div>` + ornamentHTML(`<div class="j ${r.res === 'ok' ? '' : r.res}">${j}</div>${p}`)
    + (chips ? `<div class="chips">${chips}</div>` : '') + bottom(waiting('WAITING FOR NEXT', t('waitNext2')));
}

// ---- チーム ----
function viewTeam() {
  const u = U(), t0 = u.team && S.teams[u.team];
  const h = hd('Team', title('team'), subOf('team', t('subTeam')));
  const rc = `<div style="margin-top:14px">${rulesCard('team', { n: S.cfg.teamSize })}</div>`;
  if (!t0) return h + `<div class="card lined"><button class="btn light" data-act="mkteam" style="margin-top:4px">Create<small>${t('createSub')}</small></button>
      <div class="or">or</div><div class="lbl">Join · ${t('joinTeam')}</div>
      <div class="inline"><div class="field">${ICON.users}<input id="jteam" inputmode="numeric" placeholder="No."></div><button class="btn" data-act="jointeam">Join</button></div></div>` + rc + bottom('');
  const mem = Object.keys(t0.members || {}).sort();
  return h + `<div class="card lined teambox"><div class="lbl">Team No.</div><div class="tno">${esc(sid(u.team))}</div>
    <div class="lbl" style="color:var(--ink2)">${mem.length} / ${S.cfg.teamSize} ${t('members')}</div>
    <ul class="mem">${mem.map(k => `<li>${t0.leader === k ? ICON.crown : ''}<span class="pid">${esc(sid(k))}</span>${esc(name(k))}</li>`).join('')}</ul>
    <button class="link" data-act="leaveteam" style="margin-top:6px">${t('leave')}</button></div>` + rc + bottom('');
}

// ---- ペア ----
function viewPair() {
  const u = U(), h = hd('Pair', title('pair'), subOf('pair', t('subPair')));
  const rc = `<div style="margin-top:14px">${rulesCard('pair')}</div>`;
  if (u.pair) {
    const p = partnerOf(u.pair);
    return `<div class="paired"><div class="okmark">${ICON.check}</div><div class="title">Paired<em>!</em></div><div class="pok">${t('pairedBig')}</div></div>`
      + wreathHTML(`<div class="lbl">YOUR PARTNER</div><div class="big xl" style="font-size:80px">${esc(sid(p))}</div><div style="letter-spacing:.1em">${esc(name(p))}</div>`, { size: 190, bow: false })
      + bottom(waiting('PLEASE WAIT', t('pairedWait')) + `<button class="btn light" data-act="unpair" style="margin-top:14px">Redo<small>${t('redoPair')}</small></button>`);
  }
  return h + `<div class="card lined"><div class="lbl">${t('partnerId')}</div>
    <div class="inline"><div class="field">${ICON.link}<input id="pid" inputmode="numeric" placeholder="ID"></div><button class="btn" data-act="pair">OK</button></div>
    ${u.pairReq ? `<p class="hint" style="text-align:center;letter-spacing:.1em;color:var(--ink2);font-size:12px">${t('waitPartner', { id: esc(sid(u.pairReq)), name: esc(name(u.pairReq)) })}</p>` : ''}</div>` + rc + bottom('');
}

// ---- R2 道具選び ----
function viewTools() {
  const st = S.state, u = U(), assets = toArr(S.toolAssets), N = S.cfg.pickCount;
  const leader = u.team && S.teams[u.team]?.leader === me;
  const open = st.toolOpen && db.now() < (st.toolEndAt || 0);
  const solo = st.toolStep !== 'team';
  let h = hd(t('stageNasa'), title('nasa'), S.rules?.nasa?.sub_ja ? subOf('nasa', '') : solo ? t('subNasaSolo', { n: N }) : leader ? t('subNasaLeader', { n: N }) : t('subNasaMember'));
  if (!assets.length) return h + bottom(waiting('LOADING'));
  if (open) h += cdBar(st.toolStartAt || st.toolEndAt - 60000, st.toolEndAt);
  let mode, picks;
  if (solo) { if (S.toolSolo) { mode = 'view'; picks = toArr(S.toolSolo); } else mode = open ? 'edit' : 'view'; }
  else if (S.toolTeam) { mode = 'view'; picks = toArr(S.toolTeam); }
  else if (leader && open) mode = 'edit';
  else { mode = 'view'; picks = toArr(S.toolDraft); }
  const key = (st.toolStep || '') + (leader ? 'L' : '');
  if (L.toolsKey !== key) { L.toolsKey = key; L.tools = solo ? [] : toArr(S.toolDraft); }
  const sel = mode === 'edit' ? L.tools : (picks || []);
  const done = solo ? !!S.toolSolo : !!S.toolTeam;
  h += `<div class="meta"><span class="t">${solo ? 'SOLO' : 'TEAM'}${!open ? ' · TIME UP' : ''}</span><b>${sel.length}<small> / ${N}</small></b></div>`;
  if (done) h += `<div class="done"><span class="stamp">${ICON.check}${t('submitted')}</span></div>`;
  h += `<div class="tiles">${assets.map((a, i) => `<button class="tile ${sel.includes(i) ? 'on' : ''}" ${mode === 'edit' ? `data-act="tool" data-i="${i}"` : 'disabled'}>
      <span class="no">${String(i + 1).padStart(2, '0')}</span><img src="${a.data}" alt="">${a.label ? `<span class="nm">${esc(a.label)}</span>` : ''}</button>`).join('')}</div>`;
  h += `<div style="margin-top:14px">${rulesCard('nasa', { n: N })}</div>`;
  return h + bottom(mode === 'edit' ? `<button class="btn" data-act="toolsubmit" ${L.tools.length === N ? '' : 'disabled'}>Decide<small>${L.tools.length} / ${N}　${t('decideSub')}</small></button>` : waiting(done ? 'SUBMITTED' : 'PLEASE WAIT'));
}

// ---- R2 間違い探し ----
function viewSpot() {
  const st = S.state, u = U(), a = S.spotAsset;
  const leader = u.team && S.teams[u.team]?.leader === me;
  const open = st.spotOpen && db.now() < (st.spotEndAt || 0);
  const h = hd(t('stageSpot'), title('spot'), S.rules?.spot?.sub_ja ? subOf('spot', '') : leader ? t('subSpotLeader') : t('subSpotMember'));
  if (!a) return h + bottom(waiting('LOADING'));
  return h + (open ? cdBar(st.spotStartAt || st.spotEndAt - 60000, st.spotEndAt) : `<div class="done"><span class="stamp">${ICON.clock}TIME UP</span></div>`)
    + `<div class="zooms">${[1, 2, 3].map(z => `<button class="${L.zoom === z ? 'on' : ''}" data-act="zoom" data-z="${z}">×${z}</button>`).join('')}<span class="cnt" id="spotcnt"></span></div>
    <div class="spotwrap"><div class="spotinner" id="spotinner" style="width:${L.zoom * 100}%"><img src="${a.data}" alt=""><div class="marks" id="marks"></div></div></div>
    <div style="margin-top:14px">${rulesCard('spot', { cap: st.spotCap ?? '-' })}</div>` + bottom('');
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
  else return flash(t('maxMark'));
  S.spotMarks = marks; drawMarks();
  await db.set(`spot/${u.team}/marks`, marks.length ? marks : null);
}

// ---- R3 プレゼントツリー ----
function viewGift() {
  const g = S.gift, u = U(), n = S.state.giftGame;
  let h = hd(`Game ${n || ''}`, title('gift'), subOf('gift', t('subGift')));
  if (!u.pair) return h + bottom(waiting('NO PARTNER', t('noPartner')));
  if (!g) return h + bottom(waiting('READY'));
  const side = g.a === me ? 'a' : 'b';
  if (L.gkey !== g.turn + g.phase) { L.gkey = g.turn + g.phase; L.gsel = null; }
  const rem = remaining(g);
  const iSet = g.phase === 'set' && g.setter === side, iPick = g.phase === 'pick' && g.setter !== side, act = iSet || iPick;
  if (g.over) h += `<div class="finish"><div class="eyebrow">Finish</div><div class="p">+${fmtN((g.score?.[side] || 0) * S.cfg.giftMul)}</div><div class="lbl" style="color:var(--gold2)">${t('yourPoints')}</div></div>`;
  else {
    const kind = act ? (iSet ? 'hide' : 'open') : 'wait';
    h += `<div class="role ${kind}"><div class="ric">${kind === 'hide' ? ICON.bomb : kind === 'open' ? ICON.gift : ICON.clock}</div>
      <div class="rtx"><div class="rwho">${act ? t('yourTurn') : t('wait')}</div><div class="rwhat">${act ? (iSet ? t('roleHide') : t('roleOpen')) : (g.phase === 'set' ? t('roleHide') : t('roleOpen'))}</div>
      ${act ? '' : `<div class="rdesc">${g.phase === 'set' ? t('waitHide') : t('waitOpen')}</div>`}</div></div>`;
    if (g.deadline) h += cdBar(g.deadline - S.cfg.giftTurnSec * 1000, g.deadline);
    if (g.lastPick) h += `<div class="lastline">${g.lastPick === g.lastPos ? t('lastBomb', { n: g.lastPick }) : t('lastSafe', { n: g.lastPick, b: g.lastPos })}</div>`;
  }
  const cell = k => {
    const avail = rem.includes(k), myBomb = g.setter === side && g.phase === 'pick' && g.pos === k;
    const cls = [!avail ? 'gone' : '', L.gsel === k ? 'on' : '', myBomb ? 'bomb' : ''].join(' ');
    return `<button class="gt ${cls}" ${act && avail ? `data-act="gnum" data-n="${k}"` : 'disabled'}>${myBomb ? ICON.bomb : avail ? ICON.gift : ICON.open}<span>${k}</span></button>`;
  };
  h += `<div class="tree"><div class="star">✦</div>${[[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]].map(r => `<div class="trow">${r.map(cell).join('')}</div>`).join('')}</div>`;
  const log = toArr(g.log);
  h += `<div class="card ptable">${[side, other(side)].map(s => {
    const turn = !g.over && ((g.phase === 'set' && g.setter === s) || (g.phase === 'pick' && g.setter !== s));
    const role = g.over ? '' : g.setter === s ? `<span class="rt hide ${turn ? 'now' : ''}">${t('tagHide')}</span>` : `<span class="rt open ${turn ? 'now' : ''}">${t('tagOpen')}</span>`;
    return `<div class="pr ${turn ? 'cur' : ''}"><span class="no">${esc(sid(g[s]))}</span><span>${esc(name(g[s]))}</span>${role}
      <span class="hist">${log.filter(e => e.side === s).map(e => `<i class="${e.bomb ? 'b' : ''}">${e.bomb ? '💣' : '+' + e.num}</i>`).join('')}</span>
      <span class="tot">${g.score?.[s] || 0}</span></div>`;
  }).join('')}</div>`;
  h += `<div style="margin-top:14px">${rulesCard('gift', { sec: S.cfg.giftTurnSec })}</div>`;
  return h + bottom(act ? `<button class="btn" data-act="ggo" ${L.gsel ? '' : 'disabled'}>${iSet ? `Hide${L.gsel ? ' · ' + L.gsel : ''}` : `Open${L.gsel ? ' · ' + L.gsel : ''}`}<small>${iSet ? t('hideSub') : t('openSub')}</small></button>` : '');
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
  if (g.over) return;   // 加点は管理者画面が自動で行う
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
    const nick = val('nick'); if (!nick) return flash(t('errName'));
    const n = await db.txn('meta/userCounter', c => (c || 0) + 1, true);
    const k = 'u' + String(n).padStart(2, '0');
    await db.set('users/' + k, { name: nick, joined: TS, uid: auth.uid() });
    login(k);
  },
  async relogin() {
    const k = ukey(val('reid'));
    const u = k && await db.get('users/' + k);
    if (!u) return flash(t('errId'));
    if (u.uid !== auth.uid()) {
      try { await db.set(`users/${k}/uid`, auth.uid()); }
      catch { return flash(t('errDevice')); }   // 別の端末で使用中（幹事が「端末の付け替え」を許可すると使える）
    }
    login(k);
  },
  logout() {
    if (me) db.set('presence/' + me, null);
    store.removeItem('xmas_me'); me = null; L.err = ''; render();
  },
  lang(el) { lang = el.dataset.l; localStorage.setItem('xmas_lang', lang); document.documentElement.lang = lang; render(); },
  rules(el) { const k = el.dataset.k; L.rules[k] = L.rules[k] === false; render(); },
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
    const tid = tkey(val('jteam')); if (!tid) return flash(t('errTeamNo'));
    const r = await db.txn('teams/' + tid, cur => {
      const m = cur.members || {};
      if (Object.keys(m).length >= S.cfg.teamSize) return;
      m[me] = true; cur.members = m; return cur;
    });
    if (!r) return flash(t('errTeamFull'));
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
    if (!p || !S.users[p] || p === me) return flash(t('errId'));
    if (S.users[p].pair) return flash(t('errPaired'));
    await db.set(`users/${me}/pairReq`, p);
  },
  async unpair() {
    const u = U(); if (!u?.pair || S.state.phase !== 'pair' || !confirm(t('redoConfirm'))) return;
    const [a, b] = u.pair.split('-');
    await db.update('', { [`pairs/${u.pair}`]: null, [`users/${a}/pair`]: null, [`users/${b}/pair`]: null, [`users/${a}/pairReq`]: null, [`users/${b}/pairReq`]: null });
  },
  tool(el) {
    const i = +el.dataset.i, k = L.tools.indexOf(i);
    if (k >= 0) L.tools.splice(k, 1);
    else if (L.tools.length < S.cfg.pickCount) L.tools.push(i);
    else return flash(t('maxPick', { n: S.cfg.pickCount }));
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
  const mmss = ms => { const s2 = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`; };
  for (const el of document.querySelectorAll('[data-mmss]')) el.textContent = mmss(+el.dataset.mmss - now);
  for (const el of document.querySelectorAll('.cdbar i')) { const s1 = +el.dataset.s, e1 = +el.dataset.e; el.style.width = Math.max(0, Math.min(100, (e1 - now) / (e1 - s1) * 100)) + '%'; }
  for (const el of document.querySelectorAll('[data-tm]')) el.textContent = mmss(timerRemain(S.timer));
  for (const el of document.querySelectorAll('.tarc')) { const tm = S.timer || {}; const r = tm.dur ? Math.max(0, Math.min(1, timerRemain(tm) / tm.dur)) : 0; el.style.strokeDashoffset = (289 * (1 - r)).toFixed(1); }
  for (const el of document.querySelectorAll('.rg[data-e]')) {
    const s = +el.dataset.s, e = +el.dataset.e, r = Math.max(0, Math.min(1, (e - now) / (e - s)));
    el.style.strokeDashoffset = (182.2 * (1 - r)).toFixed(1);
  }
}
setInterval(() => { render(); checkPair(); giftTick(); }, 250);
render();
