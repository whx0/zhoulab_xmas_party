// 管理者画面
import { db, TS, MOCK } from './db.js';
import { CFG_DEFAULT, ITEMS, toArr, sum, ranking, gradeNormal, gradeR4, rankPoints, toolScore, spotCount,
  other, remaining, giftNew, giftAuto } from './logic.js';
import { esc, teamColor, CHOICE_COLORS, compressImage, patch, fmtSec, sid, ukey, tkey, giftHTML } from './ui.js';

const app = document.getElementById('app');
const S = { cfg: CFG_DEFAULT };
const L = { tab: localStorage.getItem('xmas_admin_tab') || 'quiz', viewQ: null, spotTeam: '', giftN: null };
const KEYS = ['state', 'users', 'teams', 'pairs', 'points', 'ctime', 'config', 'presence', 'questions', 'r4items', 'tools', 'secret', 'spot', 'gift', 'results'];
for (const k of KEYS) db.on(k, v => { S[k] = v || {}; if (k === 'config') S.cfg = { ...CFG_DEFAULT, ...(v || {}) }; render(); });
db.on('assets/tools', v => { S.toolAssets = toArr(v); render(); });
db.on('assets/spot', v => { S.spotAsset = v; render(); });
let ansSub = null;
function watchAnswers(qid) {
  if (ansSub?.qid === qid) return;
  ansSub?.off(); S.answers = {};
  ansSub = qid ? { qid, off: db.on('answers/' + qid, v => { S.answers = v || {}; render(); }) } : null;
}

const users = () => S.users || {};
const uids = () => Object.keys(users()).sort();
const name = k => users()[k]?.name ?? '?';
const who = k => k ? `<span class="pid">${esc(sid(k))}</span> ${esc(name(k))}` : '—';
const tbadge = t => t ? `<span class="pill" style="background:${teamColor(t)}">T${esc(sid(t))}</span>` : '';
const timer = d => `<b data-deadline="${d}"></b>`;
const points = () => S.points || {};
const fmtN = n => Number(n || 0).toLocaleString('en-US');
const b = (act, label, attrs = '', cls = '') => `<button class="ab ${cls}" data-act="${act}" ${attrs}>${label}</button>`;
const lab = c => c === 'O' ? '○' : c === 'X' ? '×' : c;
const RN = { 0: '練習', 1: 'R1', 4: 'R4' };
const PHASES = [['lobby', '待機'], ['team', 'チーム作り'], ['pair', 'ペア作り'], ['quiz', '問題'], ['tools', '道具選び'], ['spot', '間違い探し'], ['gift', 'プレゼント'], ['end', '終了']];
const TABS = [['quiz', '① 問題・R4'], ['team', 'チーム・ペア'], ['r2', '② R2'], ['r3', '③ R3'], ['rank', 'ランキング・得点'], ['cfg', '設定']];

// ---------------- 描画 ----------------
function render() {
  const st = S.state || {};
  watchAnswers(L.viewQ || st.qid);
  const online = Object.keys(S.presence || {}).length;
  let h = `<div class="abar"><div class="row"><span class="ttl">🎁 ZHOU LAB XMAS 管理者</span>
      ${MOCK ? '<span class="pill" style="background:#ff9a4a">ローカルお試し</span>' : ''}
      <span class="hint">接続 <b>${online}</b> / 登録 <b>${uids().length}</b>　参加者画面：</span>
      ${PHASES.map(([k, l]) => `<button class="ab ${st.phase === k ? 'on' : ''}" data-act="phase" data-p="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px">${TABS.map(([k, l]) => `<button class="ab tab ${L.tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div></div>`;
  h += ({ quiz: tabQuiz, team: tabTeam, r2: tabR2, r3: tabR3, rank: tabRank, cfg: tabCfg }[L.tab])();
  patch(app, h);
  if (L.tab === 'r2') drawSpotAdmin();
  tick();
}

// ---- ① 問題・R4 ----
function tabQuiz() {
  const st = S.state || {}, qs = S.questions || {}, ql = S.secret?.qlist || {};
  const qid = L.viewQ || st.qid, q = qs[qid];
  let h = '';
  if (q) h += questionCard(qid, q);
  const list = Object.entries(ql).sort((a, b) => a[1].no - b[1].no);
  h += `<div class="card"><h3>問題リスト（事前登録）</h3>
    <table class="tbl"><tr><th>No.</th><th>ラウンド</th><th>形式</th><th>制限時間</th><th>正解</th><th>状態</th><th></th></tr>
    ${list.map(([k, x]) => { const live = qs[k];
      return `<tr class="${k === qid ? 'sel' : ''}"><td>${x.no}</td><td>${RN[x.round]}</td><td>${x.type === 'ox' ? '○×' : 'A〜D'}</td>
        <td>${x.limit ? x.limit + '秒' : '手動'}</td><td><b>${lab(x.correct)}</b></td>
        <td>${!live ? '未出題' : live.open ? '🟢 受付中' : live.graded ? '✅ 採点済' : '⏸ 締切'}</td>
        <td>${b('qstart', live ? '再出題' : '▶ 出題', `data-q="${k}"`, live ? '' : 'main')} ${live ? b('viewq', '表示', `data-q="${k}"`) : ''} ${b('qdel', '削除', `data-q="${k}"`, 'warn')}</td></tr>`; }).join('')}
    </table>
    <div class="row" style="margin-top:10px">追加：
      <select id="nq_round"><option value="1">R1</option><option value="0">練習（得点なし）</option><option value="4">R4 一発逆転</option></select>
      <select id="nq_type"><option value="abcd">A〜D</option><option value="ox">○×</option></select>
      正解 <select id="nq_cor">${['A', 'B', 'C', 'D', 'O', 'X'].map(c => `<option value="${c}">${lab(c)}</option>`).join('')}</select>
      制限時間 <input id="nq_limit" type="number" value="${S.cfg.limitSec}" style="width:5em">秒（0＝手動で締切）
      ${b('qadd', '＋ 追加', '', 'main')}</div>
    <p class="hint">正解は管理者だけが使うデータに保存されます（参加者の画面には出ません）。出題すると、制限時間で自動締切 →「採点」ボタンで全員分を採点します。</p></div>`;
  h += r4Card();
  return h;
}

function questionCard(qid, q) {
  const ans = S.answers || {}, ql = S.secret?.qlist?.[qid] || {};
  const choices = q.type === 'ox' ? ['O', 'X'] : ['A', 'B', 'C', 'D'];
  const n = Object.keys(ans).length;
  const dist = Object.fromEntries(choices.map(c => [c, 0]));
  for (const a of Object.values(ans)) dist[a.c] = (dist[a.c] || 0) + 1;
  const max = Math.max(1, ...Object.values(dist));
  const res = S.results?.[qid];
  let h = `<div class="card" style="border:3px solid var(--mint)"><div class="row"><h3 style="margin:0">No.${q.no}（${RN[q.round]}・${q.type === 'ox' ? '○×' : 'A〜D'}）正解 <b>${lab(ql.correct)}</b></h3>
      <span class="grow"></span>${q.open ? `🟢 受付中 ${q.limit ? timer(q.startAt + q.limit * 1000) : ''}` : q.graded ? '✅ 採点済' : '⏸ 締切'}</div>
    <div class="row" style="align-items:flex-start;gap:30px;margin-top:8px"><div><div class="hint">回答</div><div class="bigstat">${n} / ${uids().length}</div></div>
    <div class="dist grow">${choices.map(c => `<div class="drow"><span class="dl" style="background:${CHOICE_COLORS[c]}">${lab(c)}</span>
      <span class="dbar" style="width:${dist[c] / max * 70}%"></span> ${dist[c]}</div>`).join('')}</div></div>
    <div class="row" style="margin-top:8px">${q.open ? b('qclose', '⏹ 締切', `data-q="${qid}"`, 'warn') : b('qgrade', q.graded ? '🔁 採点し直す' : '✅ 採点', `data-q="${qid}"`, 'main')}
      ${!q.open && q.graded ? b('showres', S.state?.result === qid ? '結果表示中' : '参加者に結果を表示', `data-k="${qid}"`) : ''}</div>`;
  if (res) {
    const rows = Object.entries(res).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0));
    h += `<table class="tbl" style="margin-top:10px"><tr><th>ID</th><th>名前</th><th>回答</th>${q.round === 4 ? '<th>賭け金</th>' : '<th>時間</th>'}<th>判定</th><th>得点</th></tr>
      ${rows.map(([k, r]) => { const a = ans[k];
        return `<tr><td>${esc(sid(k))}</td><td>${esc(name(k))}</td><td>${a ? lab(a.c) : '—'}</td>
        <td>${q.round === 4 ? fmtN(r.bet) : a ? ((a.t - q.startAt) / 1000).toFixed(2) + 's' : ''}</td>
        <td>${r.res === 'ok' ? '○' : r.res === 'ng' ? '×' : '未回答'}</td><td><b>${r.pts > 0 ? '+' : ''}${fmtN(r.pts)}</b></td></tr>`; }).join('')}</table>`;
  }
  return h + '</div>';
}

function r4Card() {
  const it = S.r4items || {};
  const rk = ranking(users(), points(), S.ctime), low = rk.slice(-3).reverse();
  return `<div class="card"><h3>R4 妨害アイテム（管理者が設定）</h3>
    <p class="hint">現在の下位3人（ビリから）：${low.map(r => who(r.id) + ` ${fmtN(r.total)}点`).join('　') || '—'}</p>
    <table class="tbl"><tr><th>アイテム</th><th>使う人（ID）</th><th>相手（ID）</th><th>効果</th></tr>
    ${Object.entries(ITEMS).map(([k, x]) => `<tr><td>${x.emoji} ${x.ja}</td>
      <td><input id="it_${k}_h" value="${esc(sid(it[k]?.holder || ''))}" style="width:5em"> ${it[k]?.holder ? esc(name(it[k].holder)) : ''}</td>
      <td><input id="it_${k}_t" value="${esc(sid(it[k]?.target || ''))}" style="width:5em"> ${it[k]?.target ? esc(name(it[k].target)) : ''}</td>
      <td class="hint">${{ allin: '相手の賭け金を全額にする', steal: '相手が外したら、失った点の半分をもらう', ride: '相手が当てたら、稼いだ点の半分をもらう' }[k]}</td></tr>`).join('')}</table>
    <div class="row">${b('itsave', '💾 保存', '', 'main')} ${b('itclear', '全部消す', '', 'warn')}
      <span class="hint">${it.applied ? `問題 ${esc(it.applied)} の採点で適用済み` : 'R4の問題を採点するときに自動で適用されます（最初に採点したR4の問題だけ）'}</span></div></div>`;
}

// ---- チーム・ペア ----
function tabTeam() {
  const teams = S.teams || {}, us = users(), pairs = S.pairs || {};
  const noTeam = uids().filter(k => !us[k].team || !teams[us[k].team]);
  const noPair = uids().filter(k => !us[k].pair);
  return `<div class="card"><h3>チーム（${Object.keys(teams).length}）</h3>
    <table class="tbl"><tr><th>チーム</th><th>人数</th><th>メンバー（👑＝リーダー）</th></tr>
    ${Object.entries(teams).sort((a, b) => parseInt(sid(a[0])) - parseInt(sid(b[0]))).map(([tid, t]) => `<tr><td>${tbadge(tid)}</td><td>${Object.keys(t.members || {}).length}</td>
      <td>${Object.keys(t.members || {}).sort().map(k => (t.leader === k ? '👑' : '') + who(k)).join('　')}</td></tr>`).join('')}</table>
    <p>未所属：${noTeam.map(who).join('　') || 'なし'}</p>
    <div class="row">ID <input id="mt_u" style="width:4em"> → チーム <input id="mt_t" style="width:4em"> ${b('mteam', '割り当て')} ${b('mleader', 'リーダーにする')} ${b('unteam', 'チームから外す', '', 'warn')}</div>
    <p class="hint">存在しないチーム番号を指定すると、その人がリーダーの新チームになります。</p></div>
  <div class="card"><h3>ペア（${Object.keys(pairs).length}）</h3>
    <table class="tbl"><tr><th>ペア</th><th></th></tr>${Object.entries(pairs).map(([pid, p]) => `<tr><td>${who(p.a)} 🤝 ${who(p.b)}</td><td>${b('unpair', '解除', `data-p="${pid}"`, 'warn')}</td></tr>`).join('')}</table>
    <p>未成立：${noPair.map(k => who(k) + (us[k].pairReq ? `（→${esc(sid(us[k].pairReq))}）` : '')).join('　') || 'なし'}</p>
    <div class="row">ID <input id="mp_a" style="width:4em"> 🤝 ID <input id="mp_b" style="width:4em"> ${b('mpair', 'ペアにする')}</div>
    <p class="hint">奇数で余った人は、幹事が別のスマホで参加者登録して相手をしてください。</p></div>
  <div class="card"><h3>参加者一覧</h3><table class="tbl"><tr><th>ID</th><th>名前</th><th>接続</th><th>チーム</th><th>ペア</th></tr>
    ${uids().map(k => `<tr><td>${esc(sid(k))}</td><td>${esc(name(k))}</td><td>${S.presence?.[k] ? '🟢' : '⚪'}</td><td>${tbadge(us[k].team)}</td><td>${us[k].pair ? esc(us[k].pair.split('-').map(sid).join(' & ')) : ''}</td></tr>`).join('')}</table></div>`;
}

// ---- ② R2 ----
function teamToolScores() {
  const tp = toArr(S.secret?.toolPts), sc = {};
  for (const tid of Object.keys(S.teams || {})) sc[tid] = S.tools?.team?.[tid] ? toolScore(S.tools.team[tid], tp) : 0;
  return sc;
}
function teamSpotScores() {
  const ans = toArr(S.secret?.spotAns), sc = {};
  for (const tid of Object.keys(S.teams || {})) sc[tid] = spotCount(S.spot?.[tid]?.marks, ans, S.cfg.spotRadius, S.spotAsset?.aspect || 1);
  return sc;
}
function tabR2() {
  const st = S.state || {}, assets = S.toolAssets || [], tp = toArr(S.secret?.toolPts), teams = S.teams || {};
  const solo = S.tools?.solo || {}, tteam = S.tools?.team || {};
  const tsc = teamToolScores(), trp = rankPoints(tsc, S.cfg.teamRankPts);
  const toolOpen = st.toolOpen && db.now() < (st.toolEndAt || 0);
  const rows = Object.keys(teams).map(tid => {
    const mem = Object.keys(teams[tid].members || {});
    const ss = mem.filter(k => solo[k]).map(k => toolScore(solo[k], tp));
    return { tid, sc: tsc[tid], done: !!tteam[tid], avg: ss.length ? (ss.reduce((a, b) => a + b, 0) / ss.length).toFixed(1) : '—', n: ss.length, m: mem.length };
  }).sort((a, b) => b.sc - a.sc);
  let h = `<div class="card"><h3>2-1 サバイバル道具選び</h3>
    <div class="row">画像（複数可・ファイル名順）：<input type="file" id="toolfiles" accept="image/*" multiple> ${b('toolupload', '追加アップロード')} ${b('toolclear', '全削除', '', 'warn')}</div>
    <p class="hint">${assets.length} 個。点数＝歴代上位3人のうち、その道具を選んだ人数。入力したら「点数を保存」。</p>
    <div class="tools">${assets.map((a, i) => `<div class="tl"><img src="${a.data}"><span class="n">${i + 1}</span><div class="tname">${esc(a.name)}</div><input id="tp${i}" type="number" value="${tp[i] ?? 0}"></div>`).join('')}</div>
    <div class="row" style="margin-top:8px">${b('toolpts', '💾 点数を保存', '', 'main')}</div><hr style="border:0;border-top:1px solid var(--line)">
    <div class="row">時間 <input id="toolmin" type="number" value="1" step="0.5" style="width:4em">分
      ${b('toolstart', '① 個人選択を開始', 'data-s="solo"', st.phase === 'tools' && st.toolStep === 'solo' && toolOpen ? 'on' : '')}
      ${b('toolstart', '② チーム提出を開始', 'data-s="team"', st.phase === 'tools' && st.toolStep === 'team' && toolOpen ? 'on' : '')}
      ${b('toolstop', '⏹ 締切')} ${toolOpen ? `🟢 ${st.toolStep === 'solo' ? '個人' : 'チーム'} 受付中 ${timer(st.toolEndAt)}` : ''}</div>
    <p>個人提出 <b>${Object.keys(solo).length}</b> / ${uids().length}　チーム提出 <b>${Object.keys(tteam).length}</b> / ${Object.keys(teams).length}</p>
    <table class="tbl"><tr><th>順位</th><th>チーム</th><th>チーム点</th><th>個人平均（提出人数）</th><th>選んだ道具</th><th>加算</th></tr>
    ${rows.map(r => `<tr><td>${trp.rank[r.tid]}</td><td>${tbadge(r.tid)}</td><td><b>${r.done ? r.sc : '未提出(0)'}</b></td><td>${r.avg}（${r.n}/${r.m}）</td>
      <td>${toArr(tteam[r.tid]).map(i => i + 1).join(', ')}</td><td>${fmtN(trp.pts[r.tid])}</td></tr>`).join('')}</table>
    <div class="row">${b('grade2', '✅ 採点（順位点を加算）', 'data-k="r2tools"', 'main')} ${S.results?.r2tools ? '✅ 採点済' : ''}</div></div>`;

  const ans = toArr(S.secret?.spotAns), ssc = teamSpotScores(), srp = rankPoints(ssc, S.cfg.teamRankPts);
  const spotOpen = st.spotOpen && db.now() < (st.spotEndAt || 0);
  h += `<div class="card"><h3>2-2 間違い探し</h3>
    <div class="row">画像：<input type="file" id="spotfile" accept="image/*"> ${b('spotupload', 'アップロード')}</div>
    <p class="hint">画像をクリックで正解位置を追加／もう一度クリックで削除（緑の点線＝判定範囲）。正解 ${ans.length} 個 → 〇の上限 ${ans.length + S.cfg.spotExtra} 個。</p>
    <div class="row">チームの〇を重ねて確認：<select id="spotteam"><option value="">なし</option>${Object.keys(teams).map(t => `<option value="${t}" ${L.spotTeam === t ? 'selected' : ''}>T${sid(t)}</option>`).join('')}</select></div>
    ${S.spotAsset ? `<div class="spotwrap" style="max-width:900px;max-height:none;margin-top:8px"><div class="spotinner" id="aspot"><img src="${S.spotAsset.data}"><div class="marks" id="amarks"></div></div></div>` : ''}
    <div class="row" style="margin-top:8px">時間 <input id="spotmin" type="number" value="5" style="width:4em">分 ${b('spotstart', '▶ 開始', '', 'main')} ${b('spotstop', '⏹ 終了')}
      ${spotOpen ? '🟢 受付中 ' + timer(st.spotEndAt) : ''}</div>
    <table class="tbl"><tr><th>順位</th><th>チーム</th><th>正解数</th><th>〇の数</th><th>加算</th></tr>
      ${Object.keys(teams).sort((a, b) => ssc[b] - ssc[a]).map(t => `<tr><td>${srp.rank[t]}</td><td>${tbadge(t)}</td><td><b>${ssc[t]}</b></td><td>${toArr(S.spot?.[t]?.marks).length}</td><td>${fmtN(srp.pts[t])}</td></tr>`).join('')}</table>
    <div class="row">${b('grade2', '✅ 採点（順位点を加算）', 'data-k="r2spot"', 'main')} ${S.results?.r2spot ? '✅ 採点済' : ''}</div></div>`;
  return h;
}
function drawSpotAdmin() {
  const el = document.getElementById('amarks'); if (!el) return;
  const aspect = S.spotAsset?.aspect || 1, r = S.cfg.spotRadius;
  const marks = L.spotTeam ? toArr(S.spot?.[L.spotTeam]?.marks) : [];
  el.innerHTML = toArr(S.secret?.spotAns).map(a => `<div class="ans" style="left:${a.x * 100}%;top:${a.y * 100}%;width:${r * 200}%;height:${r * 200 / aspect}%"></div>`).join('')
    + marks.map(m => `<div class="mark" style="left:${m.x * 100}%;top:${m.y * 100}%"></div>`).join('');
}

// ---- ③ R3 ----
function tabR3() {
  const st = S.state || {}, pairs = S.pairs || {}, games = S.gift || {};
  const played = Object.keys(games).map(k => +k.slice(1)).sort((a, b) => a - b);
  const n = L.giftN || st.giftGame || played[played.length - 1] || 1;
  const gs = games['g' + n] || {};
  const done = Object.values(gs).filter(g => g.over).length;
  let h = `<div class="card"><h3>3 プレゼント選び（旧：爆弾回避）</h3>
    <div class="row">1手の制限時間 <input id="gsec" type="number" value="${S.cfg.giftTurnSec}" style="width:4em">秒 ${b('gsecsave', '変更')}
      <span class="hint">（時間切れはランダムで進みます。押していたら短くしてください）</span></div>
    <div class="row" style="margin-top:8px">${b('giftstart', `▶ ゲーム ${(played[played.length - 1] || 0) + 1} を開始`, `data-n="${(played[played.length - 1] || 0) + 1}"`, 'main')}
      ${played.map(k => b('giftview', `ゲーム${k}`, `data-n="${k}"`, k === n ? 'on' : '')).join('')}
      ${played.length ? b('giftstart', `ゲーム ${n} をやり直す`, `data-n="${n}"`, 'warn') : ''}</div>
    <p class="hint">2回目以降は、最初に💣を入れる人が前のゲームと入れ替わります。各ペアは終わった時点で自動で加点されます（ゲーム内得点 × ${S.cfg.giftMul}）。ペアは組み直しません。</p>
    ${played.length ? `<p>ゲーム ${n}：終了 <b>${done}</b> / ${Object.keys(gs).length} ペア</p>` : ''}</div>`;
  h += `<div class="ggrid">${Object.keys(pairs).map(pid => { const g = gs[pid];
    if (!g) return `<div class="card">${who(pairs[pid].a)} 🤝 ${who(pairs[pid].b)}：未開始</div>`;
    const setter = g[g.setter], picker = g[other(g.setter)];
    const hist = toArr(g.log).filter(e => !e.final).map(e => `T${e.turn}:💣${e.pos}`).join(' ');
    return `<div class="card">${giftTable(g)}
      ${g.over ? `<p><b>🎉 終了</b>　${who(g.a)} +${fmtN((g.score?.a || 0) * S.cfg.giftMul)}　${who(g.b)} +${fmtN((g.score?.b || 0) * S.cfg.giftMul)}</p>`
        : `<p>Turn ${g.turn}：${g.phase === 'set' ? `💣を入れる番 ${who(setter)}` : `🎁開ける番 ${who(picker)}（💣は <b style="color:var(--red);font-size:18px">${g.pos}</b>）`} ${g.deadline ? timer(g.deadline) : ''}</p>`}
      <div class="row">${remaining(g).map(k => `<div style="width:30px;font-size:8px">${giftHTML(k, g.pos === k ? 'bomb' : '', g.pos === k ? '💣' : k)}</div>`).join('')}</div>
      <p class="hint">💣の履歴：${hist || '—'}</p>
      ${!g.over ? `<div class="row">${b('giftskip', 'ランダムで1手進める', `data-n="${n}" data-p="${pid}"`)}</div>` : ''}</div>`; }).join('')}</div>`;
  return h;
}
function giftTable(g) {
  const log = toArr(g.log), rows = ['a', 'b'].map(s => log.filter(e => e.side === s));
  const cols = Math.max(3, ...rows.map(r => r.length));
  return `<table class="tbl"><tr><th></th>${[...Array(cols)].map((_, i) => `<th>${i + 1}</th>`).join('')}<th>💣</th><th>TOTAL</th></tr>` +
    ['a', 'b'].map((s, k) => `<tr><td>${who(g[s])}</td>${[...Array(cols)].map((_, i) => { const e = rows[k][i];
      return `<td>${!e ? '' : e.bomb ? '💣' : `${e.cum}<small>+${e.num}</small>`}</td>`; }).join('')}<td>${g.bombs?.[s] || 0}</td><td class="tot">${g.score?.[s] || 0}</td></tr>`).join('') + '</table>';
}

// ---- ランキング ----
function tabRank() {
  const rk = ranking(users(), points(), S.ctime), n = rk.length;
  return `<div class="card"><h3>ランキング（参加者の画面には出ません）</h3>
    <table class="tbl"><tr><th>順位</th><th>ID</th><th>名前</th><th>チーム</th><th>合計</th><th>正解時間の合計</th><th>内訳</th></tr>
    ${rk.map((r, i) => `<tr class="${i >= n - 3 && n > 3 ? 'low' : ''}"><td><b>${i + 1}</b></td><td>${esc(sid(r.id))}</td><td>${esc(r.name)}</td><td>${tbadge(r.team)}</td>
      <td><b style="font-size:17px">${fmtN(r.total)}</b></td><td>${(r.ctime / 1000).toFixed(1)}s</td>
      <td class="hint">${Object.entries(points()[r.id] || {}).map(([k, v]) => `${k.startsWith('m') && k.length > 8 ? '手動' : k}:${v}`).join('　')}</td></tr>`).join('')}</table>
    <p class="hint">同点は「正解した問題の合計回答時間」が短い方が上。ピンクは下位3人（R4のアイテム対象）。</p></div>
  <div class="card"><h3>得点の手動修正</h3><div class="row">ID <input id="mp_id" style="width:4em"> 点 <input id="mp_pt" type="number" style="width:7em">
    ${b('manualpt', '加算（マイナス可）', '', 'main')}</div></div>`;
}

// ---- 設定 ----
const CFG_LABEL = {
  r1Max: 'R1：すぐ正解したときの得点', r1Min: 'R1：制限時間ぎりぎりで正解したときの得点', limitSec: 'R1：制限時間の初期値（秒）',
  teamSize: 'チームの定員', teamRankPts: 'R2：チーム順位ごとの得点（カンマ区切り、1位から）', pickCount: 'R2：選ぶ道具の数',
  spotExtra: 'R2：〇の上限＝正解数＋この数', spotRadius: 'R2：正解判定の半径（画像幅に対する割合）',
  giftMul: 'R3：ゲーム内得点にかける倍率', giftTurnSec: 'R3：1手の制限時間（秒）',
};
function tabCfg() {
  return `<div class="card"><h3>配点・設定</h3><table class="tbl">${Object.keys(CFG_DEFAULT).map(k => `<tr><td style="text-align:left">${CFG_LABEL[k] || k}</td>
    <td><input id="cfg_${k}" value="${esc(Array.isArray(S.cfg[k]) ? S.cfg[k].join(', ') : S.cfg[k])}" style="width:16em"></td></tr>`).join('')}</table>
    <div class="row">${b('cfgsave', '💾 保存', '', 'main')} ${b('cfgdefault', '初期値に戻す', '', 'warn')}</div></div>
  <div class="card"><h3>データ</h3><div class="row">${b('backup', '⬇ バックアップ（JSON）')} ${b('wipe', '⚠ 全データ削除（リハーサル後など）', '', 'warn')}
    ${b('wipeplay', '⚠ 得点・回答だけ削除（登録・画像・問題は残す）', '', 'warn')}</div>
    <p class="hint">参加者画面：<code>${esc(location.href.replace(/admin\.html.*$/, ''))}</code></p></div>`;
}

// ---------------- 操作 ----------------
const val = id => document.getElementById(id)?.value?.trim() ?? '';
const setState = obj => db.update('state', obj);

async function setPoints(src, map) {
  const up = {};
  for (const k of uids()) up[`${k}/${src}`] = map[k] ?? null;
  await db.update('points', up);
}
function teamMemberResults(teamScores) {
  const { pts, rank } = rankPoints(teamScores, S.cfg.teamRankPts), pmap = {}, res = {};
  for (const [tid, t] of Object.entries(S.teams || {})) for (const k of Object.keys(t.members || {})) { pmap[k] = pts[tid] ?? 0; res[k] = { rank: rank[tid], pts: pts[tid] ?? 0 }; }
  return { pmap, res };
}
async function teamAdd(tid, k) {
  await teamRemove(k);
  await db.txn('teams/' + tid, cur => {
    cur = cur || { leader: k, members: {} };
    cur.members = { ...(cur.members || {}), [k]: true }; if (!cur.leader) cur.leader = k; return cur;
  }, true);
  const n = parseInt(sid(tid)); await db.txn('meta/teamCounter', c => Math.max(c || 0, n), true);
  await db.set(`users/${k}/team`, tid);
}
async function teamRemove(k) {
  const old = users()[k]?.team; if (!old) return;
  await db.txn('teams/' + old, cur => {
    delete (cur.members || {})[k];
    const rest = Object.keys(cur.members || {}).sort();
    if (!rest.length) return null;
    if (cur.leader === k) cur.leader = rest[0]; return cur;
  });
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
  phase: el => setState({ phase: el.dataset.p }),
  tab: el => { L.tab = el.dataset.t; localStorage.setItem('xmas_admin_tab', L.tab); render(); },

  async qadd() {
    const round = +val('nq_round'), type = val('nq_type'), correct = val('nq_cor'), limit = Math.max(0, +val('nq_limit') || 0);
    if (type === 'ox' && !['O', 'X'].includes(correct)) return alert('○×の問題は正解を ○ か × にしてください');
    if (type === 'abcd' && !['A', 'B', 'C', 'D'].includes(correct)) return alert('A〜Dの問題は正解を A〜D にしてください');
    const n = await db.txn('meta/qCounter', c => (c || 0) + 1, true);
    const no = Object.keys(S.secret?.qlist || {}).length + 1;
    await db.set(`secret/qlist/q${n}`, { no, round, type, correct, limit });
  },
  qdel: el => confirm('この問題をリストから削除しますか？') && db.set(`secret/qlist/${el.dataset.q}`, null),
  async qstart(el) {
    const qid = el.dataset.q, x = S.secret.qlist[qid];
    if (S.questions?.[qid] && !confirm('もう一度出題すると、この問題の回答・得点はリセットされます。よいですか？')) return;
    await db.set('answers/' + qid, null); await db.set('results/' + qid, null);
    await db.set('questions/' + qid, { no: x.no, round: x.round, type: x.type, limit: x.limit, open: true, startAt: TS });
    await setState({ phase: 'quiz', qid, result: null });
    L.viewQ = null;
  },
  viewq: el => { L.viewQ = el.dataset.q === S.state?.qid ? null : el.dataset.q; render(); },
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
  showres: el => setState({ result: el.dataset.k }),

  async itsave() {
    const out = {};
    for (const k of Object.keys(ITEMS)) {
      const h = ukey(val(`it_${k}_h`)), t = ukey(val(`it_${k}_t`));
      if ((h && !users()[h]) || (t && !users()[t])) return alert(`${ITEMS[k].ja}：IDが不正です`);
      if (h && t && h === t) return alert(`${ITEMS[k].ja}：自分自身は指名できません`);
      if (h || t) out[k] = { holder: h || null, target: t || null };
    }
    if (S.r4items?.applied) out.applied = S.r4items.applied;
    await db.set('r4items', Object.keys(out).length ? out : null);
  },
  itclear: () => confirm('アイテムの設定を消しますか？') && db.set('r4items', null),

  mteam: async () => { const k = ukey(val('mt_u')), t = tkey(val('mt_t')); if (!k || !users()[k] || !t) return alert('IDかチーム番号が不正'); await teamAdd(t, k); },
  mleader: async () => { const k = ukey(val('mt_u')), t = users()[k]?.team; if (!t) return alert('チーム未所属'); await db.set(`teams/${t}/leader`, k); },
  unteam: async () => { const k = ukey(val('mt_u')); if (k) await teamRemove(k); },
  async mpair() {
    const a0 = ukey(val('mp_a')), b0 = ukey(val('mp_b'));
    if (!a0 || !b0 || a0 === b0 || !users()[a0] || !users()[b0]) return alert('IDが不正');
    for (const k of [a0, b0]) if (users()[k].pair) await unpair(users()[k].pair);
    const [a, bb] = [a0, b0].sort(), pid = `${a}-${bb}`;
    await db.update('', { [`pairs/${pid}`]: { a, b: bb }, [`users/${a}/pair`]: pid, [`users/${bb}/pair`]: pid, [`users/${a}/pairReq`]: null, [`users/${bb}/pairReq`]: null });
  },
  unpair: el => confirm('このペアを解除しますか？') && unpair(el.dataset.p),

  async toolupload() {
    const files = [...(document.getElementById('toolfiles')?.files || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!files.length) return;
    const out = [...(S.toolAssets || [])];
    for (const f of files) { const c = await compressImage(f, 360, 0.8); out.push({ data: c.data, name: c.name }); }
    await db.set('assets/tools', out);
  },
  toolclear: () => confirm('道具の画像をすべて削除しますか？') && db.set('assets/tools', null),
  toolpts: () => db.set('secret/toolPts', (S.toolAssets || []).map((_, i) => +val('tp' + i) || 0)),
  async toolstart(el) {
    const s = el.dataset.s, min = +val('toolmin') || 1;
    if (s === 'solo' && S.tools && Object.keys(S.tools).length && confirm('前回の選択データ（個人・チーム）を消してから始めますか？\nOK＝消す／キャンセル＝残す')) await db.set('tools', null);
    await setState({ phase: 'tools', toolStep: s, toolOpen: true, toolEndAt: db.now() + min * 60000, result: null });
  },
  toolstop: () => setState({ toolOpen: false }),
  async spotupload() {
    const f = document.getElementById('spotfile')?.files?.[0]; if (!f) return;
    const c = await compressImage(f, 1600, 0.85);
    await db.set('assets/spot', { data: c.data, aspect: c.aspect });
  },
  async spotstart() {
    const min = +val('spotmin') || 5, ans = toArr(S.secret?.spotAns);
    await setState({ phase: 'spot', spotOpen: true, spotEndAt: db.now() + min * 60000, spotCap: ans.length + S.cfg.spotExtra, result: null });
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
      const setter = n % 2 === 1 ? first : other(first);   // 2回目は入れ替え
      games[pid] = { ...giftNew(p.a, p.b, setter), deadline: db.now() + S.cfg.giftTurnSec * 1000 };
      up[`points/${p.a}/r3g${n}`] = null; up[`points/${p.b}/r3g${n}`] = null;
    }
    if (Object.keys(up).length) await db.update('', up);
    await db.set('gift/g' + n, games);
    await setState({ phase: 'gift', giftGame: n, result: null });
    L.giftN = n;
  },
  giftview: el => { L.giftN = +el.dataset.n; render(); },
  giftskip: el => giftStep(`gift/g${el.dataset.n}/${el.dataset.p}`, true),

  async manualpt() {
    const k = ukey(val('mp_id')), n = Math.round(+val('mp_pt'));
    if (!k || !users()[k] || !n) return alert('IDか点数が不正');
    await db.set(`points/${k}/m${Date.now()}`, n);
  },
  async cfgsave() {
    const out = {};
    for (const k of Object.keys(CFG_DEFAULT)) {
      const v = val('cfg_' + k);
      out[k] = Array.isArray(CFG_DEFAULT[k]) ? v.split(/[,\s]+/).filter(Boolean).map(Number) : Number(v);
      if (Array.isArray(out[k]) ? out[k].some(isNaN) : isNaN(out[k])) return alert('数字ではない値があります：' + (CFG_LABEL[k] || k));
    }
    await db.set('config', out);
  },
  cfgdefault: () => confirm('配点を初期値に戻しますか？') && db.set('config', CFG_DEFAULT),
  async backup() {
    const all = await db.get('');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 1)], { type: 'application/json' }));
    a.download = `xmas-backup-${Date.now()}.json`; a.click();
  },
  async wipe() {
    if (!confirm('本当に全データ（登録・得点・画像・問題・設定）を削除しますか？')) return;
    if (prompt('確認のため DELETE と入力') !== 'DELETE') return;
    await db.set('', null);
  },
  async wipeplay() {
    if (!confirm('得点・回答・結果・チーム・ペア・ゲームを削除します（登録・画像・問題リスト・設定は残ります）')) return;
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
app.addEventListener('change', e => { if (e.target.id === 'spotteam') { L.spotTeam = e.target.value; render(); } });

function tick() { for (const el of document.querySelectorAll('[data-deadline]')) el.textContent = '⏱ ' + fmtSec(+el.dataset.deadline - db.now()); }

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
    if (st.phase === 'gift' && st.giftGame) {
      const n = st.giftGame, up = {};
      for (const [pid, g] of Object.entries(S.gift?.['g' + n] || {})) {
        if (!g.over) { if (g.deadline && now > g.deadline + 4000) await giftStep(`gift/g${n}/${pid}`, false); continue; }
        const src = 'r3g' + n, va = (g.score?.a || 0) * S.cfg.giftMul, vb = (g.score?.b || 0) * S.cfg.giftMul;
        if (points()[g.a]?.[src] !== va) up[`${g.a}/${src}`] = va;
        if (points()[g.b]?.[src] !== vb) up[`${g.b}/${src}`] = vb;
      }
      if (Object.keys(up).length) await db.update('points', up);
    }
  } finally { busy = false; }
}, 500);
render();
