// 純粋なロジック（採点・ゲーム判定）。DBに依存しない。

// 配点などの初期値（管理者画面の「設定」で変更できる）
export const CFG_DEFAULT = {
  r1Max: 1000,          // R1: 出題直後に正解したときの得点
  r1Min: 500,           // R1: 制限時間ぎりぎりで正解したときの得点
  limitSec: 20,         // R1: 制限時間の初期値（秒）
  teamSize: 5,          // チームの定員
  teamRankPts: [600, 500, 400, 300, 200, 100], // R2: チーム順位ごとの得点（同点は同順位・同点）
  pickCount: 10,        // R2: 選ぶ道具の数
  spotExtra: 3,         // R2: 間違い探しの〇の上限 = 正解数 + spotExtra
  spotRadius: 0.04,     // R2: 間違い探しの正解判定の半径（画像の幅に対する割合）
  giftMul: 1,           // R3: ゲーム内得点にかける倍率
  giftTurnSec: 60,      // R3: 1手の制限時間（秒）。時間切れはランダム
  showRank: true,       // 参加者の結果画面に「現在◯位」を出す
  testMode: false,      // テストモード：参加者画面に「ログイン画面に戻る」ボタンを出す
};

export const ITEMS = {
  allin: { emoji: '🎰', ja: '強制オールイン' },
  steal: { emoji: '🦝', ja: '横取り' },
  ride:  { emoji: '🤝', ja: '便乗' },
};

export const toArr = v => v == null ? [] : (Array.isArray(v) ? v : Object.values(v)).filter(x => x != null);
export const sum = obj => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);

// 全員のランキング（合計点の降順、同点は正解した問題の合計回答時間が短い順）
export function ranking(users, points, ctime) {
  return Object.keys(users || {}).map(id => ({
    id, name: users[id].name, team: users[id].team ?? null,
    total: sum(points?.[id]), ctime: sum(ctime?.[id]),
  })).sort((a, b) => b.total - a.total || a.ctime - b.ctime || a.id.localeCompare(b.id));
}

// R1：早く正解するほど高得点（直線的に減る）
export function r1Score(ms, limitSec, cfg) {
  const r = Math.min(Math.max(ms, 0) / (limitSec * 1000), 1);
  return Math.round(cfg.r1Max - (cfg.r1Max - cfg.r1Min) * r);
}

// 練習(0)・R1(1) の採点。results[id] = {res:'ok'|'ng'|'none', pts}
export function gradeNormal(q, userIds, answers, correct, cfg) {
  const deltas = {}, ctimes = {}, results = {};
  for (const id of userIds) {
    const a = answers?.[id];
    if (!a) { deltas[id] = 0; results[id] = { res: 'none', pts: 0 }; continue; }
    const ms = a.t - q.startAt;
    const ok = a.c === correct && (!q.limit || ms <= q.limit * 1000 + 1500);
    const pts = ok && q.round !== 0 ? r1Score(ms, q.limit || cfg.limitSec, cfg) : 0;
    deltas[id] = pts; results[id] = { res: ok ? 'ok' : 'ng', pts, ms };
    if (ok && q.round !== 0) ctimes[id] = ms;
  }
  return { deltas, ctimes, results };
}

// R4：totals = R4の前の持ち点、items = {allin:{holder,target}, steal:..., ride:...}
// 賭け金は 0〜持ち点 なので、持ち点が0未満になることはない
export function gradeR4(userIds, answers, correct, totals, items) {
  const bet = {}, base = {}, extra = {}, deltas = {}, results = {};
  const allinT = items?.allin?.target;
  for (const id of userIds) {
    const a = answers?.[id];
    const maxBet = Math.max(totals[id] || 0, 0);
    let b = a ? Math.min(Math.max(Math.round(a.bet || 0), 0), maxBet) : 0;
    if (allinT === id) b = maxBet;                 // 1. 強制オールイン
    bet[id] = b;
    const ok = !!a && a.c === correct;             // 未回答は不正解扱い
    base[id] = ok ? b : -b;                        // 2. 正誤で加減
    results[id] = { res: a ? (ok ? 'ok' : 'ng') : 'none' };
  }
  const st = items?.steal, rd = items?.ride;       // 3. 横取り・便乗
  if (st?.holder && st?.target && base[st.target] < 0)
    extra[st.holder] = (extra[st.holder] || 0) + Math.floor(-base[st.target] / 2);
  if (rd?.holder && rd?.target && base[rd.target] > 0)
    extra[rd.holder] = (extra[rd.holder] || 0) + Math.floor(base[rd.target] / 2);
  for (const id of userIds) {
    deltas[id] = (base[id] || 0) + (extra[id] || 0);
    results[id].pts = deltas[id];
  }
  return { bet, base, extra, deltas, results };
}

// チーム順位 → 得点（同点は同順位・同じ得点）
export function rankPoints(teamScores, table) {
  const ids = Object.keys(teamScores).sort((a, b) => teamScores[b] - teamScores[a]);
  const pts = {}, rank = {};
  ids.forEach((tid, i) => {
    rank[tid] = (i > 0 && teamScores[tid] === teamScores[ids[i - 1]]) ? rank[ids[i - 1]] : i + 1;
    pts[tid] = table[rank[tid] - 1] ?? 0;
  });
  return { pts, rank };
}

export const toolScore = (picks, toolPts) => toArr(picks).reduce((s, i) => s + (Number(toolPts?.[i]) || 0), 0);

// 間違い探し：正しく見つけた数（1つの〇は1つの正解にだけ対応）
export function spotCount(marks, answers, radius, aspect = 1) {
  const ms = toArr(marks), used = new Set();
  let n = 0;
  for (const a of toArr(answers)) {
    const i = ms.findIndex((m, k) => !used.has(k) && Math.hypot(m.x - a.x, (m.y - a.y) * aspect) <= radius);
    if (i >= 0) { used.add(i); n++; }
  }
  return n;
}

// ---- R3 プレゼント選び（旧：爆弾回避） ----
// 1〜10のプレゼントのどれかに💣を仕掛け、相手が1つ開ける。💣ならその人の得点は0に戻る（ゲームは続く）。
export const other = s => s === 'a' ? 'b' : 'a';
export const remaining = g => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(n => !g.used?.['n' + n]);

export function giftNew(a, b, firstSetter) {
  return { a, b, setter: firstSetter, phase: 'set', turn: 1,
    score: { a: 0, b: 0 }, bombs: { a: 0, b: 0 }, used: {}, log: [], pos: null, over: false };
}

export function giftSet(g0, n) {
  const g = structuredClone(g0);
  if (g.over || g.phase !== 'set' || !remaining(g).includes(n)) return null;
  g.pos = n; g.phase = 'pick';
  return g;
}

function take(g, side, n, final = false) {
  const isBomb = n === g.pos;
  g.used = g.used || {}; g.used['n' + n] = true;
  if (isBomb) { g.score[side] = 0; g.bombs[side] = (g.bombs[side] || 0) + 1; } else g.score[side] += n;
  g.log = toArr(g.log);
  g.log.push({ turn: g.turn, side, num: n, bomb: isBomb, cum: g.score[side], pos: g.pos, final });
}

export function giftPick(g0, n) {
  const g = structuredClone(g0);
  g.score = g.score || { a: 0, b: 0 }; g.bombs = g.bombs || { a: 0, b: 0 };
  const rem = remaining(g);
  if (g.over || g.phase !== 'pick' || !rem.includes(n)) return null;
  const picker = other(g.setter);
  take(g, picker, n);
  if (rem.length === 2) take(g, g.setter, rem.find(x => x !== n), true);   // 最終ターン：残り1つは仕掛けた側へ
  g.lastPos = g.pos; g.lastPick = n; g.pos = null;
  if (remaining(g).length === 0) { g.over = true; g.phase = 'over'; }
  else { g.setter = picker; g.turn++; g.phase = 'set'; }
  return g;
}

// 時間切れ時のランダム手
export function giftAuto(g, rnd = Math.random()) {
  const rem = remaining(g);
  const n = rem[Math.floor(rnd * rem.length)];
  return g.phase === 'set' ? giftSet(g, n) : giftPick(g, n);
}
