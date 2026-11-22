// 管理者画面（当日の進行順に、上から押していけばいい作り）
import { db, TS, MOCK, auth } from './db.js';
import { ADMIN_EMAILS } from './config.js';
import { CFG_DEFAULT, ITEMS, toArr, sum, ranking, gradeNormal, gradeR4, rankPoints, toolScore, spotCount,
  other, remaining, giftNew, giftAuto } from './logic.js';
import { RULE_KEYS, RULES_DEFAULT, TITLE_DEFAULT } from './i18n.js';
import { esc, teamColor, CHOICE_COLORS, compressImage, patch, fmtSec, fmtN, sid, ukey, tkey } from './ui.js';

const app = document.getElementById('app');

// ---------- 管理者ログイン（Google）。管理者以外はここで止まる ----------
if (!MOCK) {
  const u = auth.user();
  const isAdmin = u && !u.isAnonymous && ADMIN_EMAILS.map(x => x.toLowerCase()).includes((u.email || '').toLowerCase());
  if (!isAdmin) {
    app.innerHTML = `<div class="login"><div class="brand">Xmas Party<small>ADMIN · ZHOU LAB</small></div>
      <p>${u && !u.isAnonymous ? `<b>${esc(u.email)}</b> は管理者として登録されていません。` : '管理者のGoogleアカウントでログインしてください。'}</p>
      <button class="ab main big" id="glogin">Googleでログイン</button>${u ? '<button class="ab" id="gout">ログアウト</button>' : ''}</div>`;
    document.getElementById('glogin').onclick = async () => { try { await auth.google(); location.reload(); } catch (e) { alert('ログインできませんでした：' + e.message); } };
    document.getElementById('gout')?.addEventListener('click', async () => { await auth.signOut(); location.reload(); });
    await new Promise(() => {});
  }
}

const S = { cfg: CFG_DEFAULT };
const L = { page: localStorage.getItem('xmas_admin_page') || 'lobby', spotTeam: '', editQ: null, giftN: null };
const KEYS = ['rules', 'timer', 'state', 'users', 'teams', 'pairs', 'points', 'ctime', 'config', 'presence', 'questions', 'r4items', 'tools', 'secret', 'spot', 'gift', 'results'];
for (const k of KEYS) db.on(k, v => { S[k] = v || {}; if (k === 'config') S.cfg = { ...CFG_DEFAULT, ...(v || {}) }; render(); });
db.on('assets/tools', v => { S.toolAssets = toArr(v); render(); });
db.on('assets/spot', v => { S.spotAsset = v; render(); });
let ansSub = null;
function watchAnswers(qid) {
  if (ansSub?.qid === qid) return;
  ansSub?.off(); S.answers = {};
  ansSub = qid ? { qid, off: db.on('answers/' + qid, v => { S.answers = v || {}; render(); }) } : null;
}

// ---------- 小物 ----------
const users = () => S.users || {};
const uids = () => Object.keys(users()).sort();
const name = k => users()[k]?.name ?? '?';
const who = k => k ? `<span class="idb">${esc(sid(k))}</span>${esc(name(k))}` : '—';
const tb = t => t ? `<span class="tb" style="background:${teamColor(t)}">チーム${esc(sid(t))}</span>` : '<span class="muted">—</span>';
const points = () => S.points || {};
const total = k => sum(points()[k]);
const b = (act, label, attrs = '', cls = '') => `<button class="ab ${cls}" data-act="${act}" ${attrs}>${label}</button>`;
const lab = c => c === 'O' ? '○' : c === 'X' ? '×' : c;
const RN = { 0: '練習', 1: '個人戦', 4: '一発逆転' };
const timer = d => `<b data-deadline="${d}"></b>`;
const step = (n, title, desc, actions, st = '') => `<div class="step ${st}"><div class="sn">${st === 'done' ? '✓' : n}</div>
  <div><div class="st">${title}</div>${desc ? `<div class="sd">${desc}</div>` : ''}</div><div class="sa">${actions}</div></div>`;
const box = (title, inner, extra = '') => `<div class="box"><h4>${title}${extra}</h4>${inner}</div>`;
const kpi = (k, v) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`;
const PHASE_JA = { timer: 'タイマー', lobby: '待機（ID表示）', team: 'チーム作り', pair: 'ペア作り', quiz: '問題', tools: '道具選び', spot: '間違い探し', gift: 'プレゼントゲーム', end: '終了' };
const playerURL = () => location.href.replace(/admin\.html.*$/, '');

const PAGES = [
  ['grp', '準備'], ['q', '問題リスト'], ['mat', 'チーム戦の素材'], ['rules', '見出し・ルール'], ['cfg', '配点・設定'],
  ['grp', '本番（左から順に）'], ['lobby', '受付'], ['r1', '練習・個人戦'], ['team', 'チーム作り'], ['tools', 'チーム戦・NASAゲーム'], ['spot', 'チーム戦・間違い探し'],
  ['pair', 'ペア作り'], ['gift', 'R3 プレゼントゲーム'], ['r4', 'R4 一発逆転'], ['final', '結果発表'],
  ['grp', 'ツール'], ['timer', 'タイマー'], ['people', '参加者・チーム・ペア'], ['score', '得点の修正'],
];
function livePage() {
  const st = S.state || {}, q = S.questions?.[st.qid];
  return { timer: 'timer', lobby: 'lobby', team: 'team', pair: 'pair', tools: 'tools', spot: 'spot', gift: 'gift', end: 'final', quiz: q?.round === 4 ? 'r4' : 'r1' }[st.phase];
}

// ---------- 描画 ----------
function render() {
  const st = S.state || {};
  watchAnswers(st.qid);
  const live = livePage();
  let n = 0, groups = [], cur = null;
  for (const [k, l] of PAGES) { if (k === 'grp') { cur = { l, items: [] }; groups.push(cur); } else cur.items.push([k, l]); }
  const side = `<div class="brand">Xmas Party<small>ADMIN · ZHOU LAB</small></div>` + groups.map(g => `<div class="tg"><span class="grp">${g.l}</span>${g.items.map(([k, l]) =>
    `<button class="nav ${L.page === k ? 'on' : ''}" data-act="go" data-p="${k}"><span class="n">${++n}</span>${l}${live === k ? '<span class="live">LIVE</span>' : ''}</button>`).join('')}</div>`).join('');
  const q = S.questions?.[st.qid];
  const nowTxt = PHASE_JA[st.phase] ? PHASE_JA[st.phase] + (st.phase === 'quiz' && q ? `（${RN[q.round]} No.${q.no}）` : st.phase === 'gift' && st.giftGame ? `（ゲーム${st.giftGame}）` : '') : 'まだ何も表示していません';
  const statusBar = `<div class="status"><span class="now">参加者の画面：<b>${nowTxt}</b></span>
    <span class="pill">接続中 <b>${Object.keys(S.presence || {}).length}</b> / 登録 <b>${uids().length}</b></span>
    ${MOCK ? '<span class="pill test">ローカルお試しモード</span>' : ''}${S.cfg.testMode ? '<span class="pill test">テストモード ON</span>' : ''}
    ${MOCK ? '' : `<span class="hint" style="margin-left:auto">${esc(auth.user()?.email || '')} ${b('logout', 'ログアウト')}</span>`}</div>`;
  const PG = { rules: pgRules, timer: pgTimer, q: pgQ, mat: pgMat, cfg: pgCfg, lobby: pgLobby, r1: pgR1, team: pgTeam, tools: pgTools, spot: pgSpot, pair: pgPair, gift: pgGift, r4: pgR4, final: pgFinal, people: pgPeople, score: pgScore };
  patch(app, `<div class="adm"><nav class="side">${side}</nav><main class="main">${statusBar}${(PG[L.page] || pgLobby)()}</main></div>`);
  if (L.page === 'mat' || L.page === 'spot') drawSpotAdmin();
  tick();
}
const head = (t, d) => `<h1 class="page-h">${t}</h1><p class="page-d">${d}</p>`;
const phaseBtn = (p, label) => (S.state?.phase === p ? '<span class="ok">✓ 表示中</span>' : b('phase', label || '参加者の画面を切り替える', `data-p="${p}"`, 'main'));

// ===== 準備：問題リスト =====
function pgQ() {
  const ql = S.secret?.qlist || {}, e = L.editQ ? ql[L.editQ] : null;
  const list = Object.entries(ql).sort((a, b) => a[1].no - b[1].no);
  return head('問題リスト', '当日出す問題を、出す順番に登録します。正解を入れておくと、採点ボタンで自動採点されます。<br>問題文・画像はPowerPointで見せます。スマホには A〜D（○×）のボタンだけが出ます。「タイトル」は管理用（採点画面で、どの問題か分かるように）です。')
    + box(e ? `問題を編集（No.${e.no}）` : '問題を追加', `<div class="rowf">
        <label>タイトル <input id="f_title" value="${esc(e?.title || '')}" placeholder="例：サンタクロースの出身地" style="width:16em" data-keep></label>
        <label>ラウンド <select id="f_round" data-keep>${[[1, '個人戦'], [0, '練習（得点なし）'], [4, 'R4 一発逆転']].map(([v, t]) => `<option value="${v}" ${e?.round === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>形式 <select id="f_type" data-keep><option value="abcd" ${e?.type === 'abcd' ? 'selected' : ''}>A〜D の4択</option><option value="ox" ${e?.type === 'ox' ? 'selected' : ''}>○×</option></select></label>
        <label>正解 <select id="f_cor" data-keep>${['A', 'B', 'C', 'D', 'O', 'X'].map(c => `<option value="${c}" ${e?.correct === c ? 'selected' : ''}>${lab(c)}</option>`).join('')}</select></label>
        <label>制限時間 <input id="f_limit" class="s" type="number" value="${e ? e.limit : S.cfg.limitSec}" data-keep> 秒</label></div>
      <p class="hint">制限時間 0 ＝ 時間で締め切らない（R4 など、締切ボタンで手動）。○×の問題は正解を ○ か × に。</p>
      <div class="rowf">${b('qsave', e ? '💾 変更を保存' : '＋ 追加する', '', 'main')}${e ? b('qcancel', 'キャンセル') : ''}</div>`)
    + box(`登録済み（${list.length}問）`, list.length ? `<div class="scroll"><table class="tbl"><tr><th>No.</th><th>タイトル</th><th>ラウンド</th><th>形式</th><th>正解</th><th>制限時間</th><th>状態</th><th></th></tr>
      ${list.map(([k, x]) => `<tr><td>${x.no}</td><td><b>${esc(x.title || '')}</b></td><td>${RN[x.round]}</td><td>${x.type === 'ox' ? '○×' : 'A〜D'}</td><td><b>${lab(x.correct)}</b></td><td>${x.limit ? x.limit + '秒' : '手動'}</td>
        <td>${S.questions?.[k] ? (S.questions[k].graded ? '採点済' : '出題済') : '<span class="muted">未出題</span>'}</td>
        <td>${b('qedit', '編集', `data-q="${k}"`)} ${b('qdel', '削除', `data-q="${k}"`, 'warn')}</td></tr>`).join('')}</table></div>` : '<p class="muted">まだありません</p>');
}

// ===== 準備：R2の素材 =====
function pgMat() {
  const assets = S.toolAssets || [], tp = toArr(S.secret?.toolPts), ans = toArr(S.secret?.spotAns);
  return head('チーム戦の素材', 'NASAゲーム（道具選び）の画像と点数、間違い探しの画像と正解の位置を登録します。')
    + box('① NASAゲーム：道具の画像（ファイル名の順に並びます）', `<div class="rowf"><input type="file" id="toolfiles" accept="image/*" multiple> ${b('toolupload', 'アップロード', '', 'main')} ${assets.length ? b('toolclear', '全部消す', '', 'warn') : ''}</div>
      <p class="hint">画像ごとに「名前（スマホに表示）」と「点数（歴代上位3人のうち、その道具を持っていった人数）」を入れて保存してください。</p>
      <div class="atiles">${assets.map((a, i) => `<div class="atile"><img src="${a.data}"><div class="muted">${String(i + 1).padStart(2, '0')}</div>
        <input id="tl${i}" value="${esc(a.label || '')}" placeholder="名前" data-keep><input id="tp${i}" type="number" value="${tp[i] ?? 0}" placeholder="点数" data-keep></div>`).join('')}</div>
      ${assets.length ? `<div class="rowf" style="margin-top:10px">${b('toolsave', '💾 名前と点数を保存', '', 'main')} <span class="hint">点数の合計：${tp.reduce((s, v) => s + (+v || 0), 0)}</span></div>` : ''}`)
    + box('② 間違い探し：画像と正解の位置', `<div class="rowf"><input type="file" id="spotfile" accept="image/*"> ${b('spotupload', 'アップロード', '', 'main')}</div>
      <p class="hint">画像の上をクリックすると正解の位置（緑の点線の円＝判定範囲）が追加されます。もう一度クリックで削除。正解 <b>${ans.length}</b> 個 → 〇をつけられる上限は ${ans.length + S.cfg.spotExtra} 個。</p>
      ${S.spotAsset ? `<div class="spotadm"><div class="spotinner" id="aspot"><img src="${S.spotAsset.data}"><div class="marks" id="amarks"></div></div></div>` : ''}`);
}
function drawSpotAdmin() {
  const el = document.getElementById('amarks'); if (!el) return;
  const aspect = S.spotAsset?.aspect || 1, r = S.cfg.spotRadius;
  const marks = L.page === 'spot' && L.spotTeam ? toArr(S.spot?.[L.spotTeam]?.marks) : [];
  el.innerHTML = toArr(S.secret?.spotAns).map(a => `<div class="ans" style="left:${a.x * 100}%;top:${a.y * 100}%;width:${r * 200}%;height:${r * 200 / aspect}%"></div>`).join('')
    + marks.map(m => `<div class="mark" style="left:${m.x * 100}%;top:${m.y * 100}%"></div>`).join('');
}

// ===== 準備：ルール =====
function pgRules() {
  const cur = S.rules || {};
  const text = (k, l) => cur[k]?.[l] != null ? cur[k][l] : (RULES_DEFAULT[k]?.[l] || []).join('\n');
  return head('見出し・ルール', '参加者のスマホの各ステージに表示される「見出し（大きい英字）」「説明（その下の1行）」「ルール」です。空欄なら初期値が表示されます。ルールは1行が1項目です。<br>'
    + '<code>{n}</code> などは設定値に自動で置き換わります：チーム作り・NASAゲーム＝<code>{n}</code>（定員／選ぶ数）、個人戦＝<code>{max}</code> <code>{min}</code>（点数）、間違い探し＝<code>{cap}</code>（〇の上限）、プレゼントツリー＝<code>{sec}</code>（1手の秒数）。')
    + RULE_KEYS.map(([k, label]) => box(`${label}${cur[k] ? ' <span class="tb" style="background:var(--gold)">編集済み</span>' : ''}`,
      (k === 'lobby' ? '' : `<div class="rowf" style="margin-bottom:8px"><label>見出し <input id="rt_${k}" value="${esc(cur[k]?.title || '')}" placeholder="${esc(TITLE_DEFAULT[k] || '')}" style="width:16em" data-keep></label>
        <span class="hint">英語がおすすめ（最後の単語が斜体になります）${k === 'solo' || k === 'practice' ? '。{no} は問題番号' : ''}</span></div>
        <div class="rgrid" style="margin-bottom:10px">${[['ja', '説明（日本語）'], ['en', '説明（English）'], ['zh', '説明（中文）']].map(([l, ln]) => `<label><span class="hint">${ln}</span><input id="rs_${k}_${l}" value="${esc(cur[k]?.['sub_' + l] || '')}" placeholder="空欄＝初期値" data-keep></label>`).join('')}</div>`)
      + `<div class="hint" style="margin-bottom:4px">ルール</div><div class="rgrid">${[['ja', '日本語'], ['en', 'English'], ['zh', '中文']].map(([l, ln]) => `<label><span class="hint">${ln}</span>
        <textarea id="rl_${k}_${l}" rows="5" data-keep>${esc(text(k, l))}</textarea></label>`).join('')}</div>
      <div class="rowf" style="margin-top:8px">${b('rlsave', '💾 保存', `data-k="${k}"`, 'main')} ${cur[k] ? b('rlreset', '初期値に戻す', `data-k="${k}"`, 'warn') : ''}</div>`)).join('');
}

// ===== 準備：配点・設定 =====
const CFG_LABEL = {
  r1Max: ['個人戦', 'すぐ正解したときの得点'], r1Min: ['個人戦', '制限時間ぎりぎりで正解したときの得点'], limitSec: ['個人戦', '制限時間の初期値（秒）'],
  teamSize: ['チーム', 'チームの定員'], teamRankPts: ['チーム戦', 'チーム順位ごとの得点（1位から、カンマ区切り）'], pickCount: ['NASA', '選ぶ道具の数'],
  spotExtra: ['間違い探し', '間違い探し：〇の上限＝正解数＋この数'], spotRadius: ['間違い探し', '間違い探し：正解判定の半径（画像の幅に対する割合）'],
  giftMul: ['R3', 'ゲーム内得点にかける倍率'], giftTurnSec: ['R3', '1手の制限時間（秒）'],
  showRank: ['表示', '参加者の結果画面に「現在◯位」を出す'], testMode: ['テスト', 'テストモード（参加者画面に「ログイン画面に戻る」ボタンを出す）'],
};
function pgCfg() {
  const rows = Object.keys(CFG_DEFAULT).map(k => {
    const [g, t] = CFG_LABEL[k] || ['', k], v = S.cfg[k];
    const input = typeof CFG_DEFAULT[k] === 'boolean' ? `<label class="chk"><input type="checkbox" id="cfg_${k}" ${v ? 'checked' : ''}> ON</label>`
      : `<input id="cfg_${k}" value="${esc(Array.isArray(v) ? v.join(', ') : v)}" style="width:14em" data-keep>`;
    return `<tr><td class="muted">${g}</td><td>${t}</td><td>${input}</td></tr>`;
  }).join('');
  return head('配点・設定', '得点はすべて0からの加点です（R4で外したときだけ減ります。0未満にはなりません）。')
    + box('配点・設定', `<table class="tbl cfgt">${rows}</table><div class="rowf" style="margin-top:12px">${b('cfgsave', '💾 保存', '', 'main big')} ${b('cfgdefault', '初期値に戻す', '', 'warn')}</div>`)
    + box('データ', `<div class="rowf">${b('backup', '⬇ バックアップ（JSON）')} ${b('wipeplay', '得点・回答・チーム・ペアだけ消す（リハーサル後）', '', 'warn')} ${b('wipe', 'すべて消す', '', 'warn')}</div>
      <p class="hint">「得点・回答〜だけ消す」は、登録した参加者・問題リスト・画像・設定を残します。</p>`);
}

// ===== 本番：受付 =====
function pgLobby() {
  const url = playerURL();
  return head('受付', '参加者にURL（またはQRコード）を開いてもらい、ニックネームを登録してもらいます。登録するとIDが表示されます。')
    + `<div class="steps">${step(1, '参加者の画面を「待機（ID表示）」にする', '登録した人のスマホに、自分のIDが大きく表示されます。', phaseBtn('lobby'), S.state?.phase === 'lobby' ? 'done' : 'now')}</div>`
    + box('参加者用URL', `<div class="rowf" style="align-items:flex-start"><img class="qr" alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(url)}">
      <div style="flex:1;min-width:240px"><div class="url">${esc(url)}</div><p class="hint">このQRコードをスクリーンに映すと受付が早いです。</p></div></div>`)
    + `<div class="kpis">${kpi('登録した人', uids().length)}${kpi('いま接続中', Object.keys(S.presence || {}).length)}</div>`
    + box('登録した人', uids().length ? `<div class="rowf">${uids().map(k => `<span class="pill" style="border:1px solid #e6e0d2;border-radius:999px;padding:3px 10px">${who(k)} ${S.presence?.[k] ? '🟢' : '⚪'}</span>`).join('')}</div>` : '<p class="muted">まだいません</p>');
}

// ===== 本番：問題（R1・R4 共通） =====
function questionPanel(rounds) {
  const st = S.state || {}, qid = st.qid, q = S.questions?.[qid];
  if (!q || !rounds.includes(q.round)) return '';
  const ql = S.secret?.qlist?.[qid] || {}, ans = S.answers || {};
  const choices = q.type === 'ox' ? ['O', 'X'] : ['A', 'B', 'C', 'D'];
  const dist = Object.fromEntries(choices.map(c => [c, 0])); for (const a of Object.values(ans)) dist[a.c] = (dist[a.c] || 0) + 1;
  const max = Math.max(1, ...Object.values(dist)), n = Object.keys(ans).length;
  const state = q.open ? 'open' : q.graded ? 'graded' : 'closed';
  const steps = `<div class="steps">
    ${step(1, '出題中', q.open ? (q.limit ? `制限時間で自動的に締め切ります（残り ${timer(q.startAt + q.limit * 1000)} 秒）` : '制限時間なし。全員答えたら締め切ってください') : '締め切りました', q.open ? b('qclose', '今すぐ締め切る', `data-q="${qid}"`, 'warn') : '', q.open ? 'now' : 'done')}
    ${step(2, '採点して、スマホに結果を表示', '正解の人のスマホに「Correct!」と得点が出ます。', state === 'closed' ? b('qgrade', '✅ 採点する', `data-q="${qid}"`, 'main big') : state === 'graded' ? `<span class="ok">✓ 採点済み</span> ${b('qgrade', 'やり直す', `data-q="${qid}"`)}` : '', state === 'closed' ? 'now' : state === 'graded' ? 'done' : '')}
    ${step(3, '次の問題へ', '下のリストから次の問題の「出題」を押します。', '', state === 'graded' ? 'now' : '')}</div>`;
  let res = '';
  const R = S.results?.[qid];
  if (R) {
    const rows = Object.entries(R).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0));
    res = `<div class="scroll"><table class="tbl" style="margin-top:12px"><tr><th>参加者</th><th class="c">回答</th><th class="c">${q.round === 4 ? '賭け金' : '時間'}</th><th class="c">判定</th><th style="text-align:right">得点</th></tr>
      ${rows.map(([k, r]) => { const a = ans[k]; return `<tr><td>${who(k)}</td><td class="c">${a ? lab(a.c) : '—'}</td>
        <td class="c">${q.round === 4 ? fmtN(r.bet) : a ? ((a.t - q.startAt) / 1000).toFixed(1) + '秒' : ''}</td>
        <td class="c">${r.res === 'ok' ? '<span class="ok">○</span>' : r.res === 'ng' ? '×' : '未回答'}</td><td class="r">${r.pts > 0 ? '+' : ''}${fmtN(r.pts)}</td></tr>`; }).join('')}</table></div>`;
  }
  return box(`いまの問題：${RN[q.round]} No.${q.no}${ql.title ? `「${esc(ql.title)}」` : ''}（${q.type === 'ox' ? '○×' : 'A〜D'}・正解 ${lab(ql.correct)}）`, steps
    + `<div class="rowf" style="align-items:flex-start;gap:28px;margin-top:14px"><div class="kpi">${`<div class="k">回答した人</div><div class="v">${n} / ${uids().length}</div>`}</div>
      <div class="dist" style="flex:1;min-width:240px">${choices.map(c => `<div class="drow"><span class="dl ${ql.correct === c ? 'cor' : ''}" style="background:${CHOICE_COLORS[c]}">${lab(c)}</span><span class="dbar" style="width:${dist[c] / max * 70}%"></span>${dist[c]}人</div>`).join('')}</div></div>` + res);
}
function questionList(rounds) {
  const ql = S.secret?.qlist || {}, qs = S.questions || {};
  const list = Object.entries(ql).filter(([, x]) => rounds.includes(x.round)).sort((a, b) => a[1].no - b[1].no);
  if (!list.length) return box('問題リスト', `<p class="muted">このラウンドの問題がまだありません。${b('go', '問題リストへ', 'data-p="q"')}</p>`);
  return box('出題する問題', `<div class="scroll"><table class="tbl"><tr><th>No.</th><th>タイトル</th><th>ラウンド</th><th>形式</th><th>正解</th><th>制限時間</th><th>状態</th><th></th></tr>
    ${list.map(([k, x]) => { const live = qs[k], cur = S.state?.qid === k;
      return `<tr class="${cur ? 'sel' : ''}"><td>${x.no}</td><td><b>${esc(x.title || '')}</b></td><td>${RN[x.round]}</td><td>${x.type === 'ox' ? '○×' : 'A〜D'}</td><td>${lab(x.correct)}</td><td>${x.limit ? x.limit + '秒' : '手動'}</td>
        <td>${!live ? '<span class="muted">未出題</span>' : live.open ? '🟢 出題中' : live.graded ? '<span class="ok">採点済</span>' : '締切'}</td>
        <td>${b('qstart', live ? 'もう一度出題' : '▶ 出題', `data-q="${k}"`, live ? '' : 'main')}</td></tr>`; }).join('')}</table></div>`);
}
function pgR1() {
  return head('練習・個人戦', 'PowerPointで問題を映しながら、「▶ 出題」→（自動で締切）→「採点する」を繰り返します。')
    + questionPanel([0, 1]) + questionList([0, 1]);
}
function pgR4() {
  const it = S.r4items || {};
  const rk = ranking(users(), points(), S.ctime), low = rk.slice(-3).reverse();
  return head('R4 一発逆転', '下位3人に妨害アイテムを渡してから、○×の問題を出します。賭け金は各自スマホで入力します。')
    + box('① 妨害アイテムを設定（下位3人が誰に使うかを聞いて、ここに入力）', `<p class="hint">いまの下位3人（ビリから）：${low.map(r => `${who(r.id)}（${fmtN(r.total)}点）`).join('　') || '—'}<br>
      選ぶ順番：ビリ → 下から2番目 → 下から3番目。指名された人には知らされません。</p>
      <div class="scroll"><table class="tbl"><tr><th>アイテム</th><th>効果</th><th>使う人の ID</th><th>相手の ID</th></tr>
      ${Object.entries(ITEMS).map(([k, x]) => `<tr><td><b>${x.emoji} ${x.ja}</b></td><td class="hint">${{ allin: '相手の賭け金を強制的に全額にする', steal: '相手が外したら、相手が失った点の半分をもらう', ride: '相手が当てたら、相手が稼いだ点の半分をもらう' }[k]}</td>
        <td><input id="it_${k}_h" class="s" value="${esc(sid(it[k]?.holder || ''))}" data-keep> ${it[k]?.holder ? esc(name(it[k].holder)) : ''}</td>
        <td><input id="it_${k}_t" class="s" value="${esc(sid(it[k]?.target || ''))}" data-keep> ${it[k]?.target ? esc(name(it[k].target)) : ''}</td></tr>`).join('')}</table></div>
      <div class="rowf" style="margin-top:10px">${b('itsave', '💾 保存', '', 'main')} ${b('itclear', '全部消す', '', 'warn')} <span class="hint">${it.applied ? '✓ 採点で適用済み' : '最初に採点した R4 の問題で自動的に効果が計算されます'}</span></div>`)
    + questionPanel([4]) + questionList([4]);
}

// ===== 本番：チーム作り =====
function pgTeam() {
  const teams = S.teams || {}, us = users();
  const noTeam = uids().filter(k => !us[k].team || !teams[us[k].team]);
  return head('チーム作り', '参加者が自分でチームを作ります。1人が「Create」でチームを作ると番号が出るので、他の人はその番号を入力して参加します（作った人がリーダー）。<br>アナウンス例：「日本人と留学生が2人ずつ以上になるように」')
    + `<div class="steps">${step(1, '参加者の画面を「チーム作り」にする', '', phaseBtn('team'), S.state?.phase === 'team' ? 'done' : 'now')}</div>`
    + `<div class="kpis">${kpi('チーム数', Object.keys(teams).length)}${kpi('まだチームがない人', noTeam.length)}</div>`
    + box('チームの定員', `<div class="rowf">1チーム <input id="teamsize" class="s" type="number" min="1" value="${S.cfg.teamSize}" data-keep> 人まで ${b('teamsize', '変更', '', 'main')}
      <span class="hint">参加人数 ${uids().length} 人 → ${S.cfg.teamSize} 人ずつなら ${Math.ceil(uids().length / Math.max(1, S.cfg.teamSize))} チーム</span></div>`)
    + box('チーム一覧', teamTable(teams)) + box('まだチームがない人', noTeam.length ? noTeam.map(who).join('　') : '<span class="ok">全員そろいました</span>')
    + box('手動で調整', `<div class="rowf">ID <input id="mt_u" class="s" data-keep> を チーム <input id="mt_t" class="s" data-keep> に ${b('mteam', '入れる', '', 'main')} ${b('mleader', 'リーダーにする')} ${b('unteam', 'チームから外す', '', 'warn')}</div>
      <p class="hint">まだないチーム番号を入れると、その人がリーダーの新しいチームになります。</p>`);
}
const teamTable = teams => Object.keys(teams).length ? `<div class="scroll"><table class="tbl"><tr><th>チーム</th><th>人数</th><th>メンバー（👑＝リーダー）</th></tr>
  ${Object.entries(teams).sort((a, b) => +sid(a[0]) - +sid(b[0])).map(([tid, t]) => `<tr><td>${tb(tid)}</td><td>${Object.keys(t.members || {}).length}</td>
    <td>${Object.keys(t.members || {}).sort().map(k => (t.leader === k ? '👑' : '') + who(k)).join('　')}</td></tr>`).join('')}</table></div>` : '<p class="muted">まだありません</p>';

// ===== 本番：R2 道具選び =====
function teamToolScores() {
  const tp = toArr(S.secret?.toolPts), sc = {};
  for (const tid of Object.keys(S.teams || {})) sc[tid] = S.tools?.team?.[tid] ? toolScore(S.tools.team[tid], tp) : 0;
  return sc;
}
function pgTools() {
  const st = S.state || {}, assets = S.toolAssets || [], tp = toArr(S.secret?.toolPts), teams = S.teams || {};
  const solo = S.tools?.solo || {}, tteam = S.tools?.team || {};
  const open = st.phase === 'tools' && st.toolOpen && db.now() < (st.toolEndAt || 0);
  const tsc = teamToolScores(), trp = rankPoints(tsc, S.cfg.teamRankPts);
  const graded = !!S.results?.r2tools;
  const s1 = st.phase === 'tools' && st.toolStep === 'solo', s2 = st.phase === 'tools' && st.toolStep === 'team';
  const ready = assets.length && tp.some(v => +v);
  const rows = Object.keys(teams).map(tid => {
    const mem = Object.keys(teams[tid].members || {}), ss = mem.filter(k => solo[k]).map(k => toolScore(solo[k], tp));
    return { tid, sc: tsc[tid], done: !!tteam[tid], avg: ss.length ? (ss.reduce((a, b) => a + b, 0) / ss.length).toFixed(1) : '—', n: ss.length, m: mem.length };
  }).sort((a, b) => b.sc - a.sc);
  return head('チーム戦・NASAゲーム', '①まず一人ずつ10個選ぶ → ②チームで話し合ってリーダーが提出 → ③採点（チーム順位で全員に加点）。')
    + (!ready ? box('⚠ 準備ができていません', `<p>道具の画像と点数を登録してください。 ${b('go', 'チーム戦の素材へ', 'data-p="mat"', 'main')}</p>`) : '')
    + `<div class="steps">
      ${step(1, '個人で選ぶ（スマホを道具選びの画面にして開始）', `時間 <input id="toolmin1" class="s" type="number" value="1" step="0.5" data-keep> 分　${s1 && open ? `🟢 受付中 残り ${timer(st.toolEndAt)} 秒` : ''}`, s1 && open ? b('toolstop', '今すぐ締め切る', '', 'warn') : b('toolstart', '▶ 個人選択を開始', 'data-s="solo"', 'main'), s1 ? (open ? 'now' : 'done') : s2 || graded ? 'done' : 'now')}
      ${step(2, 'チームで話し合って、リーダーが提出', `時間 <input id="toolmin2" class="s" type="number" value="6" step="0.5" data-keep> 分　${s2 && open ? `🟢 受付中 残り ${timer(st.toolEndAt)} 秒` : ''}`, s2 && open ? b('toolstop', '今すぐ締め切る', '', 'warn') : b('toolstart', '▶ チーム提出を開始', 'data-s="team"', 'main'), s2 ? (open ? 'now' : 'done') : graded ? 'done' : '')}
      ${step(3, '採点して、スマホに順位を表示', 'チームの順位に応じて、メンバー全員に得点が入ります。', graded ? `<span class="ok">✓ 採点済み</span> ${b('grade2', 'やり直す', 'data-k="r2tools"')}` : b('grade2', '✅ 採点する', 'data-k="r2tools"', 'main big'), graded ? 'done' : s2 && !open ? 'now' : '')}</div>`
    + `<div class="kpis">${kpi('個人で提出', `${Object.keys(solo).length} / ${uids().length}`)}${kpi('チームで提出', `${Object.keys(tteam).length} / ${Object.keys(teams).length}`)}</div>`
    + box('結果（発表用）', rows.length ? `<div class="scroll"><table class="tbl"><tr><th>順位</th><th>チーム</th><th>チームの点</th><th>メンバー個人の平均点</th><th>選んだ道具</th><th style="text-align:right">加点</th></tr>
      ${rows.map(r => `<tr><td>${trp.rank[r.tid]}位</td><td>${tb(r.tid)}</td><td class="r">${r.done ? r.sc : '未提出'}</td><td>${r.avg}（${r.n}/${r.m}人）</td>
        <td class="hint">${toArr(tteam[r.tid]).map(i => assets[i]?.label || String(i + 1)).join('、')}</td><td class="r">+${fmtN(trp.pts[r.tid])}</td></tr>`).join('')}</table></div>
      <p class="hint">「チームの点」と「個人の平均点」を並べると、話し合いで良くなったかが分かります。</p>` : '<p class="muted">チームがありません</p>');
}

// ===== 本番：R2 間違い探し =====
function teamSpotScores() {
  const ans = toArr(S.secret?.spotAns), sc = {};
  for (const tid of Object.keys(S.teams || {})) sc[tid] = spotCount(S.spot?.[tid]?.marks, ans, S.cfg.spotRadius, S.spotAsset?.aspect || 1);
  return sc;
}
function pgSpot() {
  const st = S.state || {}, teams = S.teams || {}, ans = toArr(S.secret?.spotAns);
  const open = st.phase === 'spot' && st.spotOpen && db.now() < (st.spotEndAt || 0);
  const sc = teamSpotScores(), rp = rankPoints(sc, S.cfg.teamRankPts), graded = !!S.results?.r2spot, started = st.phase === 'spot';
  return head('チーム戦・間違い探し', 'チーム全員のスマホに画像が出ます。〇をつけられるのはリーダーだけ。時間内に正しく見つけた数で順位を決めます。')
    + (!S.spotAsset || !ans.length ? box('⚠ 準備ができていません', `<p>間違い探しの画像と正解の位置を登録してください。 ${b('go', 'チーム戦の素材へ', 'data-p="mat"', 'main')}</p>`) : '')
    + `<div class="steps">
      ${step(1, 'スマホを間違い探しの画面にして開始', `時間 <input id="spotmin" class="s" type="number" value="5" data-keep> 分　${open ? `🟢 受付中 残り ${timer(st.spotEndAt)} 秒` : ''}`, open ? b('spotstop', '今すぐ終了', '', 'warn') : b('spotstart', '▶ 開始', '', 'main'), open ? 'now' : started || graded ? 'done' : 'now')}
      ${step(2, '採点して、スマホに順位を表示', '', graded ? `<span class="ok">✓ 採点済み</span> ${b('grade2', 'やり直す', 'data-k="r2spot"')}` : b('grade2', '✅ 採点する', 'data-k="r2spot"', 'main big'), graded ? 'done' : started && !open ? 'now' : '')}</div>`
    + box('結果（発表用）', `<div class="scroll"><table class="tbl"><tr><th>順位</th><th>チーム</th><th>正しく見つけた数</th><th>つけた〇の数</th><th style="text-align:right">加点</th></tr>
      ${Object.keys(teams).sort((a, b2) => sc[b2] - sc[a]).map(t => `<tr><td>${rp.rank[t]}位</td><td>${tb(t)}</td><td class="r">${sc[t]} / ${ans.length}</td><td>${toArr(S.spot?.[t]?.marks).length}</td><td class="r">+${fmtN(rp.pts[t])}</td></tr>`).join('')}</table></div>`)
    + (S.spotAsset ? box('チームの〇を確認', `<div class="rowf" style="margin-bottom:10px">チーム <select id="spotteam"><option value="">選ぶ</option>${Object.keys(teams).map(t => `<option value="${t}" ${L.spotTeam === t ? 'selected' : ''}>チーム${sid(t)}</option>`).join('')}</select>
      <span class="hint">赤い〇＝チームがつけた〇、緑の点線＝正解</span></div><div class="spotadm"><div class="spotinner"><img src="${S.spotAsset.data}"><div class="marks" id="amarks"></div></div></div>`) : '');
}

// ===== 本番：ペア作り =====
function pgPair() {
  const pairs = S.pairs || {}, us = users(), noPair = uids().filter(k => !us[k].pair);
  return head('ペア作り', 'お互いに相手のIDを入力するとペアが成立します。R3 はこのペアで最後まで戦います（組み直しなし）。')
    + `<div class="steps">${step(1, '参加者の画面を「ペア作り」にする', '', phaseBtn('pair'), S.state?.phase === 'pair' ? 'done' : 'now')}</div>`
    + `<div class="kpis">${kpi('成立したペア', Object.keys(pairs).length)}${kpi('まだの人', noPair.length)}</div>`
    + box('まだペアがいない人', noPair.length ? noPair.map(k => who(k) + (us[k].pairReq ? `<span class="hint">（→ ${esc(sid(us[k].pairReq))} を入力済み）</span>` : '')).join('　')
      + (noPair.length % 2 ? '<p class="hint">奇数です。幹事が別のスマホで参加者登録して相手をしてください。</p>' : '') : '<span class="ok">全員そろいました</span>')
    + box('ペア一覧', pairTable(pairs))
    + box('手動でペアにする', `<div class="rowf">ID <input id="mp_a" class="s" data-keep> と ID <input id="mp_b" class="s" data-keep> を ${b('mpair', 'ペアにする', '', 'main')}</div>`);
}
const pairTable = pairs => Object.keys(pairs).length ? `<div class="scroll"><table class="tbl">${Object.entries(pairs).map(([pid, p]) => `<tr><td>${who(p.a)}　🤝　${who(p.b)}</td><td style="text-align:right">${b('unpair', '解除', `data-p="${pid}"`, 'warn')}</td></tr>`).join('')}</table></div>` : '<p class="muted">まだありません</p>';

// ===== 本番：R3 プレゼントツリー =====
function pgGift() {
  const st = S.state || {}, pairs = S.pairs || {}, games = S.gift || {};
  const played = Object.keys(games).map(k => +k.slice(1)).sort((a, b) => a - b);
  const next = (played[played.length - 1] || 0) + 1;
  const n = L.giftN || st.giftGame || played[played.length - 1] || 1, gs = games['g' + n] || {};
  const done = Object.values(gs).filter(g => g.over).length, tot = Object.keys(gs).length;
  return head('R3 プレゼントゲーム', '1〜10のプレゼントのどれかに💣を入れ、相手が1つ開けます。💣ならその人の点数は0に戻ります（ゲームは続く）。<br>各ペアは終わった時点で自動的に加点されます（ゲーム内の点数 × ' + S.cfg.giftMul + '）。')
    + (!Object.keys(pairs).length ? box('⚠ ペアがいません', `<p>先にペア作りをしてください。 ${b('go', 'ペア作りへ', 'data-p="pair"', 'main')}</p>`) : '')
    + `<div class="steps">${step(1, `ゲーム ${next} を開始`, next > 1 ? '最初に💣を入れる人は、前のゲームと入れ替わります。' : '最初に💣を入れる人はランダムで決まります。', b('giftstart', `▶ ゲーム ${next} を開始`, `data-n="${next}"`, 'main big'), played.length ? '' : 'now')}
      ${step(2, '1手の制限時間', '時間切れの手はランダムで進みます。押していたら短くしてください。', `<input id="gsec" class="s" type="number" value="${S.cfg.giftTurnSec}" data-keep> 秒 ${b('gsecsave', '変更')}`)}</div>`
    + (played.length ? `<div class="rowf" style="margin:14px 0">表示するゲーム：${played.map(k => b('giftview', `ゲーム${k}`, `data-n="${k}"`, k === n ? 'on' : '')).join('')} ${b('giftstart', `ゲーム ${n} をやり直す`, `data-n="${n}"`, 'warn')}</div>
      <div class="kpis">${kpi(`ゲーム${n}：終わったペア`, `${done} / ${tot}`)}</div>` : '')
    + `<div class="cards2">${Object.keys(pairs).map(pid => giftCard(pid, gs[pid], n)).join('')}</div>`;
}
function giftCard(pid, g, n) {
  const p = S.pairs[pid];
  if (!g) return `<div class="box">${who(p.a)} 🤝 ${who(p.b)}<p class="muted">未開始</p></div>`;
  const rem = remaining(g), log = toArr(g.log);
  const row = s => `<tr><td>${who(g[s])}</td><td class="hint">${log.filter(e => e.side === s).map(e => e.bomb ? '💣' : '+' + e.num).join(' ')}</td><td class="r">${g.score?.[s] || 0}</td></tr>`;
  return `<div class="box" style="margin:0"><table class="tbl">${row('a')}${row('b')}</table>
    ${g.over ? `<p class="ok">✓ 終了　${esc(name(g.a))} +${fmtN((g.score?.a || 0) * S.cfg.giftMul)} ／ ${esc(name(g.b))} +${fmtN((g.score?.b || 0) * S.cfg.giftMul)}</p>`
      : `<p>Turn ${g.turn}：${g.phase === 'set' ? `${who(g[g.setter])} が💣を入れる番` : `${who(g[other(g.setter)])} が開ける番（💣は <b style="color:#d2405e">${g.pos}</b>）`} 残り ${g.deadline ? timer(g.deadline) : '-'} 秒</p>`}
    <div class="giftmini">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => `<i class="${!rem.includes(k) ? 'g' : ''} ${g.pos === k ? 'b' : ''}">${k}</i>`).join('')}</div>
    ${!g.over ? `<div class="rowf" style="margin-top:8px">${b('giftskip', 'ランダムで1手進める', `data-n="${n}" data-p="${pid}"`)}</div>` : ''}</div>`;
}

// ===== 本番：結果発表 =====
function pgFinal() {
  const rk = ranking(users(), points(), S.ctime), n = rk.length;
  return head('結果発表', '最終順位です（参加者のスマホには出ません）。同点のときは「正解した問題の合計回答時間」が短い方が上。')
    + `<div class="steps">${step(1, '参加者の画面を「終了」にする', '', phaseBtn('end'), S.state?.phase === 'end' ? 'done' : '')}</div>`
    + box('最終順位', rankTable(rk, n));
}
const rankTable = (rk, n) => `<div class="scroll"><table class="tbl"><tr><th>順位</th><th>参加者</th><th>チーム</th><th style="text-align:right">合計</th><th>内訳</th></tr>
  ${rk.map((r, i) => `<tr class="${i >= n - 3 && n > 3 ? 'low' : ''}"><td><b style="font-family:var(--serif);font-size:20px">${i === 0 ? '🏆 ' : ''}${i + 1}</b></td><td>${who(r.id)}</td><td>${tb(r.team)}</td>
    <td class="r" style="font-size:22px">${fmtN(r.total)}</td><td class="hint">${breakdown(r.id)}</td></tr>`).join('')}</table></div>`;
function breakdown(k) {
  const p = points()[k] || {}, ql = S.secret?.qlist || {};
  const g = { 個人戦: 0, チーム戦: 0, R3: 0, R4: 0, 手動: 0 };
  for (const [src, v] of Object.entries(p)) {
    if (src.startsWith('r2')) g.チーム戦 += v; else if (src.startsWith('r3')) g.R3 += v; else if (/^m\d{6,}/.test(src)) g.手動 += v;
    else if (ql[src]?.round === 4) g.R4 += v; else g.個人戦 += v;
  }
  return Object.entries(g).filter(([, v]) => v).map(([kk, v]) => `${kk} ${v > 0 ? '+' : ''}${fmtN(v)}`).join('　');
}

// ===== ツール：タイマー =====
const tRemain = tm => !tm ? 0 : tm.running ? Math.max(0, tm.endAt - db.now()) : (tm.remain || 0);
function pgTimer() {
  const tm = S.timer || {}, live = S.state?.phase === 'timer', remain = tRemain(tm);
  const dur = tm.dur || 300000;
  return head('タイマー', '他のゲームと同じく、押したときに全員のスマホにタイマーが大きく表示されます。終わったら、次のステージのページで画面を切り替えてください。')
    + `<div class="steps">
      ${step(1, '時間を決める', `<span class="rowf" style="margin-top:6px"><input id="tm_min" class="s" type="number" min="0" value="${Math.floor(dur / 60000)}" data-keep> 分
        <input id="tm_sec" class="s" type="number" min="0" max="59" value="${Math.round((dur % 60000) / 1000)}" data-keep> 秒　${[1, 3, 5, 10].map(m => b('tmpreset', `${m}分`, `data-m="${m}"`)).join(' ')}</span>`, '')}
      ${step(2, 'みんなの画面にタイマーを表示してスタート', live ? (tm.running ? '🟢 表示中・動作中' : remain > 0 ? '⏸ 一時停止中' : '⏰ 時間切れ') : '参加者の画面がタイマーに切り替わります。', b('tmstart', '▶ 表示してスタート', '', 'main big'), live ? 'done' : 'now')}
      ${step(3, '操作', '', live && tm.dur ? (tm.running ? b('tmpause', '⏸ 一時停止') : remain > 0 ? b('tmresume', '▶ 再開') : '') + b('tmadd', '＋30秒', 'data-s="30"') + b('tmadd', '−30秒', 'data-s="-30"') : '<span class="muted">スタート後に使えます</span>', live ? 'now' : '')}</div>`
    + box('いまのタイマー', `<div class="kpi" style="display:inline-block;min-width:240px"><div class="k">${live ? '参加者に表示中' : '表示していません'}</div><div class="v" style="font-size:56px" data-tmr="1"></div></div>`);
}

// ===== 管理：参加者 =====
function pgPeople() {
  const us = users();
  return head('参加者・チーム・ペア', '全員の状態の確認と、手動での調整ができます。')
    + box(`参加者（${uids().length}人）`, `<div class="scroll"><table class="tbl"><tr><th>参加者</th><th>接続</th><th>チーム</th><th>ペア</th><th style="text-align:right">得点</th><th></th></tr>
      ${uids().map(k => `<tr><td>${who(k)}</td><td>${S.presence?.[k] ? '🟢' : '⚪'}</td><td>${tb(us[k].team)}${us[k].team && S.teams?.[us[k].team]?.leader === k ? ' 👑' : ''}</td>
        <td>${us[k].pair ? us[k].pair.split('-').filter(x => x !== k).map(who).join('') : '—'}</td><td class="r">${fmtN(total(k))}</td>
        <td style="text-align:right">${us[k].uid ? b('unbind', '端末の付け替えを許可', `data-u="${k}"`) : '<span class="hint">付け替え待ち</span>'} ${b('deluser', '削除', `data-u="${k}"`, 'warn')}</td></tr>`).join('')}</table></div>
      <p class="hint">参加者がスマホを変えたいときは「端末の付け替えを許可」を押してから、新しい端末で「IDで復帰」をしてもらいます。</p>`)
    + box('チーム', teamTable(S.teams || {}) + `<div class="rowf" style="margin-top:10px">ID <input id="mt_u" class="s" data-keep> を チーム <input id="mt_t" class="s" data-keep> に ${b('mteam', '入れる', '', 'main')} ${b('mleader', 'リーダーにする')} ${b('unteam', 'チームから外す', '', 'warn')}</div>`)
    + box('ペア', pairTable(S.pairs || {}) + `<div class="rowf" style="margin-top:10px">ID <input id="mp_a" class="s" data-keep> と ID <input id="mp_b" class="s" data-keep> を ${b('mpair', 'ペアにする', '', 'main')}</div>`);
}

// ===== 管理：得点 =====
function pgScore() {
  const rk = ranking(users(), points(), S.ctime);
  return head('得点の修正', 'トラブルがあったときに、手動で点を足したり引いたりできます。')
    + box('手動で加点・減点', `<div class="rowf">ID <input id="mp_id" class="s" data-keep> に <input id="mp_pt" type="number" style="width:8em" data-keep> 点 ${b('manualpt', '加える（マイナスで減点）', '', 'main')}</div>`)
    + box('現在の順位', rankTable(rk, rk.length));
}

// ---------- 操作 ----------
const val = id => document.getElementById(id)?.value?.trim() ?? '';
const setState = obj => db.update('state', obj);
async function setPoints(src, map) { const up = {}; for (const k of uids()) up[`${k}/${src}`] = map[k] ?? null; await db.update('points', up); }
function teamMemberResults(teamScores) {
  const { pts, rank } = rankPoints(teamScores, S.cfg.teamRankPts), pmap = {}, res = {};
  for (const [tid, t] of Object.entries(S.teams || {})) for (const k of Object.keys(t.members || {})) { pmap[k] = pts[tid] ?? 0; res[k] = { rank: rank[tid], pts: pts[tid] ?? 0 }; }
  return { pmap, res };
}
async function teamAdd(tid, k) {
  await teamRemove(k);
  await db.txn('teams/' + tid, cur => { cur = cur || { leader: k, members: {} }; cur.members = { ...(cur.members || {}), [k]: true }; if (!cur.leader) cur.leader = k; return cur; }, true);
  const n = +sid(tid); await db.txn('meta/teamCounter', c => Math.max(c || 0, n), true);
  await db.set(`users/${k}/team`, tid);
}
async function teamRemove(k) {
  const old = users()[k]?.team; if (!old) return;
  await db.txn('teams/' + old, cur => { delete (cur.members || {})[k]; const rest = Object.keys(cur.members || {}).sort(); if (!rest.length) return null; if (cur.leader === k) cur.leader = rest[0]; return cur; });
  await db.set(`users/${k}/team`, null);
}
async function unpair(pid) {
  const p = S.pairs?.[pid]; if (!p) return;
  await db.update('', { [`pairs/${pid}`]: null, [`users/${p.a}/pair`]: null, [`users/${p.b}/pair`]: null, [`users/${p.a}/pairReq`]: null, [`users/${p.b}/pairReq`]: null });
}
async function giftStep(path, force) {
  await db.txn(path, cur => {
    if (cur.over || (!force && (!cur.deadline || db.now() < cur.deadline + 4000))) return;
    const ng = giftAuto(cur); if (!ng) return; ng.deadline = db.now() + S.cfg.giftTurnSec * 1000; return ng;
  });
}

const ACT = {
  logout: async () => { await auth.signOut(); location.reload(); },
  unbind: el => confirm('このIDを別の端末でログインできるようにしますか？（参加者がその端末で「IDで復帰」を使います）') && db.set(`users/${el.dataset.u}/uid`, null),
  go: el => { L.page = el.dataset.p; localStorage.setItem('xmas_admin_page', L.page); scrollTo(0, 0); render(); },
  phase: el => setState({ phase: el.dataset.p, result: null }),

  async qsave() {
    const round = +val('f_round'), type = val('f_type'), correct = val('f_cor'), limit = Math.max(0, +val('f_limit') || 0);
    if (type === 'ox' && !['O', 'X'].includes(correct)) return alert('○×の問題は、正解を ○ か × にしてください');
    if (type === 'abcd' && !['A', 'B', 'C', 'D'].includes(correct)) return alert('A〜Dの問題は、正解を A〜D から選んでください');
    const data = { round, type, correct, limit, title: val('f_title') || null, choices: null };
    if (L.editQ) { await db.update(`secret/qlist/${L.editQ}`, data); L.editQ = null; }
    else {
      const n = await db.txn('meta/qCounter', c => (c || 0) + 1, true);
      await db.set(`secret/qlist/q${n}`, { ...data, no: Object.keys(S.secret?.qlist || {}).length + 1 });
    }
    document.getElementById('f_title')?.remove();
    render();
  },
  qedit: el => { document.querySelectorAll('[id^=f_]').forEach(i => i.remove()); L.editQ = el.dataset.q; app._html = ''; render(); scrollTo(0, 0); },
  qcancel: () => { document.querySelectorAll('[id^=f_]').forEach(i => i.remove()); L.editQ = null; app._html = ''; render(); },
  async qdel(el) {
    if (!confirm('この問題を削除しますか？')) return;
    await db.set(`secret/qlist/${el.dataset.q}`, null);
    const rest = Object.entries(S.secret?.qlist || {}).filter(([k]) => k !== el.dataset.q).sort((a, b) => a[1].no - b[1].no);
    const up = {}; rest.forEach(([k], i) => { up[`${k}/no`] = i + 1; }); if (rest.length) await db.update('secret/qlist', up);
  },
  async qstart(el) {
    const qid = el.dataset.q, x = S.secret.qlist[qid];
    if (S.questions?.[qid] && !confirm('もう一度出題すると、この問題の回答と得点はリセットされます。よいですか？')) return;
    await db.set('answers/' + qid, null); await db.set('results/' + qid, null);
    await setPoints(qid, {});
    await db.set('questions/' + qid, { no: x.no, round: x.round, type: x.type, limit: x.limit, open: true, startAt: TS });
    await setState({ phase: 'quiz', qid, result: null });
  },
  qclose: el => db.update('questions/' + el.dataset.q, { open: false }),
  async qgrade(el) {
    const qid = el.dataset.q, q = S.questions[qid], correct = S.secret?.qlist?.[qid]?.correct;
    if (!correct) return alert('正解が登録されていません');
    const ans = (await db.get('answers/' + qid)) || {};
    let g;
    if (q.round === 4) {
      const totals = Object.fromEntries(uids().map(k => { const p = { ...(points()[k] || {}) }; delete p[qid]; return [k, sum(p)]; }));
      const it = S.r4items || {}, use = !it.applied || it.applied === qid;
      g = gradeR4(uids(), ans, correct, totals, use ? it : null);
      for (const k of uids()) g.results[k].bet = g.bet[k];
      if (use && (it.allin || it.steal || it.ride)) await db.set('r4items/applied', qid);
      g.ctimes = {};
    } else g = gradeNormal(q, uids(), ans, correct, S.cfg);
    await setPoints(qid, g.deltas);
    const ct = {}; for (const k of uids()) ct[`${k}/${qid}`] = g.ctimes[k] ?? null;
    await db.update('ctime', ct);
    await db.set('results/' + qid, g.results);
    await db.update('questions/' + qid, { graded: true, open: false });
    await setState({ result: qid });
  },

  async itsave() {
    const out = {};
    for (const k of Object.keys(ITEMS)) {
      const h = ukey(val(`it_${k}_h`)), t = ukey(val(`it_${k}_t`));
      if ((h && !users()[h]) || (t && !users()[t])) return alert(`${ITEMS[k].ja}：そのIDの人はいません`);
      if (h && t && h === t) return alert(`${ITEMS[k].ja}：自分自身は指名できません`);
      if (h || t) out[k] = { holder: h || null, target: t || null };
    }
    if (S.r4items?.applied) out.applied = S.r4items.applied;
    await db.set('r4items', Object.keys(out).length ? out : null);
  },
  itclear: () => confirm('アイテムの設定を消しますか？') && db.set('r4items', null),

  mteam: async () => { const k = ukey(val('mt_u')), t = tkey(val('mt_t')); if (!k || !users()[k] || !t) return alert('IDかチーム番号が正しくありません'); await teamAdd(t, k); },
  mleader: async () => { const k = ukey(val('mt_u')), t = users()[k]?.team; if (!t) return alert('その人はチームに入っていません'); await db.set(`teams/${t}/leader`, k); },
  teamsize: () => { const n = Math.round(+val('teamsize')); if (!(n >= 1)) return alert('1以上の数字を入れてください'); db.set('config/teamSize', n); },
  unteam: async () => { const k = ukey(val('mt_u')); if (k) await teamRemove(k); },
  async mpair() {
    const a0 = ukey(val('mp_a')), b0 = ukey(val('mp_b'));
    if (!a0 || !b0 || a0 === b0 || !users()[a0] || !users()[b0]) return alert('IDが正しくありません');
    for (const k of [a0, b0]) if (users()[k].pair) await unpair(users()[k].pair);
    const [a, bb] = [a0, b0].sort(), pid = `${a}-${bb}`;
    await db.update('', { [`pairs/${pid}`]: { a, b: bb }, [`users/${a}/pair`]: pid, [`users/${bb}/pair`]: pid, [`users/${a}/pairReq`]: null, [`users/${bb}/pairReq`]: null });
  },
  unpair: el => confirm('このペアを解除しますか？') && unpair(el.dataset.p),
  async deluser(el) {
    const k = el.dataset.u; if (!confirm(`${name(k)}（ID ${sid(k)}）を削除しますか？`)) return;
    await teamRemove(k); if (users()[k]?.pair) await unpair(users()[k].pair);
    await db.update('', { [`users/${k}`]: null, [`points/${k}`]: null, [`ctime/${k}`]: null, [`presence/${k}`]: null });
  },

  async toolupload() {
    const files = [...(document.getElementById('toolfiles')?.files || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!files.length) return alert('画像を選んでください');
    const out = [...(S.toolAssets || [])];
    for (const f of files) { const c = await compressImage(f, 360, 0.82); out.push({ data: c.data, name: c.name, label: c.name.replace(/\.[^.]+$/, '') }); }
    await db.set('assets/tools', out);
  },
  toolclear: () => confirm('道具の画像をすべて削除しますか？') && db.set('assets/tools', null),
  async toolsave() {
    const assets = S.toolAssets || [], up = {};
    assets.forEach((_, i) => { up[`${i}/label`] = val('tl' + i); });
    await db.update('assets/tools', up);
    await db.set('secret/toolPts', assets.map((_, i) => +val('tp' + i) || 0));
    alert('保存しました');
  },
  async toolstart(el) {
    const s = el.dataset.s, min = +val(s === 'solo' ? 'toolmin1' : 'toolmin2') || 1;
    if (s === 'solo' && S.tools && Object.keys(S.tools).length && confirm('前回の選択データ（個人・チーム）を消してから始めますか？\nOK＝消す／キャンセル＝残す')) await db.set('tools', null);
    const now = db.now(); await setState({ phase: 'tools', toolStep: s, toolOpen: true, toolStartAt: now, toolEndAt: now + min * 60000, result: null });
  },
  toolstop: () => setState({ toolOpen: false }),
  async spotupload() {
    const f = document.getElementById('spotfile')?.files?.[0]; if (!f) return alert('画像を選んでください');
    const c = await compressImage(f, 1600, 0.85);
    await db.set('assets/spot', { data: c.data, aspect: c.aspect });
  },
  async spotstart() {
    const min = +val('spotmin') || 5, ans = toArr(S.secret?.spotAns);
    const now = db.now(); await setState({ phase: 'spot', spotOpen: true, spotStartAt: now, spotEndAt: now + min * 60000, spotCap: ans.length + S.cfg.spotExtra, result: null });
  },
  spotstop: () => setState({ spotOpen: false }),
  async grade2(el) {
    const k = el.dataset.k;
    const { pmap, res } = teamMemberResults(k === 'r2tools' ? teamToolScores() : teamSpotScores());
    await setPoints(k, pmap); await db.set('results/' + k, res);
    await setState({ result: k, ...(k === 'r2tools' ? { toolOpen: false } : { spotOpen: false }) });
  },

  gsecsave: () => db.set('config/giftTurnSec', Math.max(5, +val('gsec') || 60)),
  async giftstart(el) {
    const n = +el.dataset.n, pairs = S.pairs || {};
    if (!Object.keys(pairs).length) return alert('ペアがいません');
    if (S.gift?.['g' + n] && !confirm(`ゲーム ${n} をやり直しますか？（このゲームの得点は消えます）`)) return;
    const games = {}, up = {};
    for (const [pid, p] of Object.entries(pairs)) {
      let first = p.first;
      if (!first) { first = Math.random() < 0.5 ? 'a' : 'b'; up[`pairs/${pid}/first`] = first; }
      games[pid] = { ...giftNew(p.a, p.b, n % 2 === 1 ? first : other(first)), deadline: db.now() + S.cfg.giftTurnSec * 1000 };
      up[`points/${p.a}/r3g${n}`] = null; up[`points/${p.b}/r3g${n}`] = null;
    }
    await db.update('', up);
    await db.set('gift/g' + n, games);
    await setState({ phase: 'gift', giftGame: n, result: null });
    L.giftN = n;
  },
  giftview: el => { L.giftN = +el.dataset.n; render(); },
  giftskip: el => giftStep(`gift/g${el.dataset.n}/${el.dataset.p}`, true),

  tmpreset: el => { const m = document.getElementById('tm_min'), s2 = document.getElementById('tm_sec'); if (m) m.value = el.dataset.m; if (s2) s2.value = 0; },
  async tmstart() {
    const dur = ((+val('tm_min') || 0) * 60 + (+val('tm_sec') || 0)) * 1000; if (!(dur > 0)) return alert('時間を入れてください');
    await db.set('timer', { dur, running: true, endAt: db.now() + dur, remain: dur });
    await setState({ phase: 'timer', result: null });
  },
  tmpause: () => db.update('timer', { running: false, remain: tRemain(S.timer) }),
  tmresume: () => db.update('timer', { running: true, endAt: db.now() + (S.timer?.remain || 0) }),
  tmadd: el => { const tm = S.timer || {}, d = +el.dataset.s * 1000; return tm.running ? db.update('timer', { endAt: Math.max(db.now(), tm.endAt + d) }) : db.update('timer', { remain: Math.max(0, (tm.remain || 0) + d) }); },
  async rlsave(el) {
    const k = el.dataset.k, out = {};
    for (const l of ['ja', 'en', 'zh']) {
      out[l] = (document.getElementById(`rl_${k}_${l}`)?.value || '').trim();
      const sv = (document.getElementById(`rs_${k}_${l}`)?.value || '').trim(); if (sv) out['sub_' + l] = sv;
    }
    const tv = (document.getElementById('rt_' + k)?.value || '').trim(); if (tv) out.title = tv;
    await db.set('rules/' + k, out);
  },
  async rlreset(el) {
    const k = el.dataset.k; if (!confirm('このステージのルールを初期値に戻しますか？')) return;
    for (const l of ['ja', 'en', 'zh']) { document.getElementById(`rl_${k}_${l}`)?.remove(); document.getElementById(`rs_${k}_${l}`)?.remove(); }
    document.getElementById('rt_' + k)?.remove();
    await db.set('rules/' + k, null);
  },
  async manualpt() {
    const k = ukey(val('mp_id')), n = Math.round(+val('mp_pt'));
    if (!k || !users()[k] || !n) return alert('IDか点数が正しくありません');
    await db.set(`points/${k}/m${Date.now()}`, n);
    const i = document.getElementById('mp_pt'); if (i) i.value = '';
  },
  async cfgsave() {
    const out = {};
    for (const k of Object.keys(CFG_DEFAULT)) {
      if (typeof CFG_DEFAULT[k] === 'boolean') { out[k] = !!document.getElementById('cfg_' + k)?.checked; continue; }
      const v = val('cfg_' + k);
      out[k] = Array.isArray(CFG_DEFAULT[k]) ? v.split(/[,\s、]+/).filter(Boolean).map(Number) : Number(v);
      if (Array.isArray(out[k]) ? out[k].some(isNaN) : isNaN(out[k])) return alert('数字ではない値があります：' + (CFG_LABEL[k]?.[1] || k));
    }
    await db.set('config', out); alert('保存しました');
  },
  cfgdefault: () => confirm('配点・設定を初期値に戻しますか？') && db.set('config', CFG_DEFAULT),
  async backup() {
    const all = await db.get('');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 1)], { type: 'application/json' }));
    a.download = `xmas-backup-${Date.now()}.json`; a.click();
  },
  async wipe() {
    if (!confirm('本当にすべてのデータ（参加者・得点・画像・問題・設定）を消しますか？')) return;
    if (prompt('確認のため DELETE と入力してください') !== 'DELETE') return;
    await db.set('', null);
  },
  async wipeplay() {
    if (!confirm('得点・回答・結果・チーム・ペア・ゲームを消します（参加者・画像・問題リスト・設定は残ります）')) return;
    const up = { points: null, ctime: null, answers: null, results: null, questions: null, tools: null, spot: null, gift: null, teams: null, pairs: null, r4items: null, state: { phase: 'lobby' } };
    for (const k of uids()) { up[`users/${k}/team`] = null; up[`users/${k}/pair`] = null; up[`users/${k}/pairReq`] = null; }
    await db.update('', up);
  },
};

app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { ACT[el.dataset.act](el); return; }
  const sp = e.target.closest('#aspot');
  if (sp) {
    const r = sp.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const aspect = S.spotAsset?.aspect || 1, ans = toArr(S.secret?.spotAns);
    const i = ans.findIndex(a => Math.hypot(a.x - x, (a.y - y) * aspect) <= S.cfg.spotRadius);
    if (i >= 0) ans.splice(i, 1); else ans.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
    db.set('secret/spotAns', ans.length ? ans : null);
  }
});
app.addEventListener('change', e => {
  if (e.target.id === 'spotteam') { L.spotTeam = e.target.value; render(); }
});

function tick() {
  for (const el of document.querySelectorAll('[data-deadline]')) el.textContent = fmtSec(+el.dataset.deadline - db.now());
  for (const el of document.querySelectorAll('[data-tmr]')) { const s2 = Math.ceil(tRemain(S.timer) / 1000); el.textContent = `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`; }
}

// 自動処理：問題の自動締切、R2の終了、R3の時間切れ・加点の保険
let busy = false;
setInterval(async () => {
  tick();
  if (busy) return; busy = true;
  try {
    const st = S.state || {}, now = db.now();
    for (const [qid, q] of Object.entries(S.questions || {}))
      if (q.open && q.limit && now > q.startAt + q.limit * 1000 + 1500) await db.update('questions/' + qid, { open: false });
    if (st.toolOpen && now > st.toolEndAt) await setState({ toolOpen: false });
    if (st.spotOpen && now > st.spotEndAt) await setState({ spotOpen: false });
    const up = {};
    for (const [gk, games] of Object.entries(S.gift || {})) {          // R3：時間切れの保険と、終わったペアへの自動加点
      const n = gk.slice(1);
      for (const [pid, g] of Object.entries(games || {})) {
        if (!g.over) { if (st.phase === 'gift' && +st.giftGame === +n && g.deadline && now > g.deadline + 4000) await giftStep(`gift/${gk}/${pid}`, false); continue; }
        const src = 'r3g' + n, va = (g.score?.a || 0) * S.cfg.giftMul, vb = (g.score?.b || 0) * S.cfg.giftMul;
        if (points()[g.a]?.[src] !== va) up[`${g.a}/${src}`] = va;
        if (points()[g.b]?.[src] !== vb) up[`${g.b}/${src}`] = vb;
      }
    }
    if (Object.keys(up).length) await db.update('points', up);
  } finally { busy = false; }
}, 500);
render();
