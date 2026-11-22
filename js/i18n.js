// 参加者画面の文言（日本語・English・中文）。{n} などは差し込み。
export const LANGS = [['ja', '日本語'], ['en', 'EN'], ['zh', '中文']];

const T = {
  // ---- 共通 ----
  stageSolo: { ja: '個人戦', en: 'Solo Round', zh: '个人赛' },
  stageNasa: { ja: 'チーム戦・NASAゲーム', en: 'Team · NASA Game', zh: '团队赛 · NASA游戏' },
  stageSpot: { ja: 'チーム戦・間違い探し', en: 'Team · Spot the Difference', zh: '团队赛 · 找不同' },

  stageFinal: { ja: '一発逆転', en: 'Final Round', zh: '最终逆转' },
  stagePractice: { ja: '練習問題', en: 'Practice', zh: '练习题' },
  rules: { ja: 'ルール', en: 'Rules', zh: '规则' },
  waitNext: { ja: '次のステージまでお待ちください', en: 'Please wait for the next stage', zh: '请等待下一环节' },
  waitResult: { ja: '結果発表をお待ちください', en: 'Please wait for the result', zh: '请等待结果公布' },
  waitNext2: { ja: '次をお待ちください', en: 'Please wait', zh: '请稍候' },
  decideSub: { ja: '決定（変更できません）', en: 'Submit (cannot be changed)', zh: '确定（不可更改）' },
  logout: { ja: 'ログイン画面に戻る（テスト用）', en: 'Back to login (test)', zh: '返回登录页面（测试用）' },
  remain: { ja: '残り', en: 'Left', zh: '剩余' },
  timeUp: { ja: '時間切れです', en: 'Time is up', zh: '时间到' },
  yourId: { ja: 'あなたのID', en: 'Your ID', zh: '你的ID' },
  // ---- エントリー ----
  entryJp: { ja: '周研クリスマスパーティー', en: 'Zhou Lab Christmas Party', zh: '周研圣诞派对' },
  nickPh: { ja: 'ニックネーム', en: 'Your name', zh: '昵称' },
  entrySub: { ja: '参加する', en: 'Join', zh: '参加' },
  relogin: { ja: 'ID で復帰する', en: 'Re-login with your ID', zh: '用ID重新登录' },
  mock: { ja: 'ローカルお試しモード（タブごとに別の参加者）', en: 'Local demo mode (each tab = one player)', zh: '本地试用模式（每个标签页是一位参加者）' },
  errName: { ja: 'ニックネームを入力してください', en: 'Please enter your name', zh: '请输入昵称' },
  errDevice: { ja: 'このIDは別の端末で使われています。幹事に伝えてください', en: 'This ID is used on another device. Please tell the host', zh: '这个ID正在其他设备上使用，请告诉主持人' },
  errId: { ja: 'そのIDは見つかりません', en: 'That ID was not found', zh: '找不到这个ID' },
  // ---- ホーム ----
  welcome: { ja: 'ようこそ', en: 'Welcome', zh: '欢迎' },
  idHint: { ja: 'このIDはチーム作り・ペア作りで使います', en: 'You will use this ID to make teams and pairs', zh: '组队和配对时会用到这个ID' },
  thanks: { ja: 'ありがとうございました', en: 'Thank you for joining!', zh: '感谢参加！' },
  // ---- 問題 ----
  subSolo: { ja: 'わかったら答えよう・早いほど高得点', en: 'Answer as soon as you know — faster = more points', zh: '知道了就作答——越快得分越高' },
  subPractice: { ja: '練習問題（得点なし）', en: 'Practice (no points)', zh: '练习题（不计分）' },
  subFinal: { ja: '○か×か、持ち点を賭けよう', en: 'True or false? Bet your points', zh: '○还是×？押上你的分数' },
  locked: { ja: '回答しました。結果発表をお待ちください', en: 'Answer locked. Please wait for the result', zh: '已作答，请等待结果公布' },
  yourBet: { ja: '賭け金', en: 'Your bet', zh: '下注' },
  // ---- 結果 ----
  practiceNo: { ja: '練習なので得点なし', en: 'Practice — no points', zh: '练习不计分' },
  ansTime: { ja: '回答 {s} 秒', en: 'Answered in {s}s', zh: '用时 {s} 秒' },
  rankNow: { ja: '現在 {n} 位', en: 'Now #{n}', zh: '目前第 {n} 名' },
  teamPoints: { ja: 'チームの得点', en: 'Team points', zh: '团队得分' },
  // ---- チーム ----
  subTeam: { ja: 'チームを作る、または番号で参加', en: 'Create a team, or join with a team number', zh: '创建队伍，或输入队伍编号加入' },
  createSub: { ja: 'チームを作る（リーダーになる）', en: 'Create a team (you become the leader)', zh: '创建队伍（成为队长）' },
  joinTeam: { ja: '参加するチームの番号', en: 'Team number to join', zh: '要加入的队伍编号' },
  members: { ja: '人', en: 'members', zh: '人' },
  leave: { ja: 'チームから抜ける', en: 'Leave team', zh: '退出队伍' },
  errTeamNo: { ja: 'チーム番号を入力してください', en: 'Please enter a team number', zh: '请输入队伍编号' },
  errTeamFull: { ja: '満員、またはそのチームはありません', en: 'Team is full or does not exist', zh: '队伍已满或不存在' },
  // ---- ペア ----
  subPair: { ja: 'お互いに相手のIDを入力すると成立', en: 'Enter each other’s ID to pair up', zh: '互相输入对方的ID即可配对' },
  partnerId: { ja: '相手のID', en: 'Partner’s ID', zh: '对方的ID' },
  waitPartner: { ja: 'ID {id}（{name}）の入力を待っています…', en: 'Waiting for ID {id} ({name}) to enter your ID…', zh: '正在等待 ID {id}（{name}）输入你的ID…' },
  paired: { ja: 'ペア成立', en: 'Paired!', zh: '配对成功' },
  pairedBig: { ja: 'ペア成立！', en: 'You are paired!', zh: '配对成功！' },
  pairedWait: { ja: 'ペア成立！次のゲームが始まるまでお待ちください', en: 'Paired! Please wait for the next game', zh: '配对成功！请等待下一个游戏开始' },
  redoPair: { ja: 'ペアをやり直す', en: 'Change partner', zh: '重新配对' },
  redoConfirm: { ja: 'ペアを解除して、やり直しますか？（相手のペアも解除されます）', en: 'Cancel this pair and choose again? (Your partner will be unpaired too)', zh: '要解除配对重新选择吗？（对方的配对也会解除）' },
  errPaired: { ja: 'その人はすでにペアがいます', en: 'That person already has a partner', zh: '对方已经有搭档了' },
  // ---- NASA ----
  subNasaSolo: { ja: '持っていく道具を {n} 個えらぼう（まずは1人で）', en: 'Pick {n} items to bring (on your own first)', zh: '选出要带的 {n} 件物品（先自己选）' },
  subNasaLeader: { ja: 'チームの {n} 個を決めて提出しよう', en: 'Decide your team’s {n} items and submit', zh: '决定团队的 {n} 件物品并提交' },
  subNasaMember: { ja: 'チームで話し合おう。提出はリーダーが行います', en: 'Discuss with your team. The leader submits', zh: '和队友讨论，由队长提交' },
  submitted: { ja: '提出しました', en: 'Submitted', zh: '已提交' },
  maxPick: { ja: '選べるのは {n} 個までです', en: 'You can pick up to {n}', zh: '最多只能选 {n} 个' },
  // ---- 間違い探し ----
  subSpotLeader: { ja: 'タップで〇をつける（もう一度で消す）', en: 'Tap to mark (tap again to remove)', zh: '点击画圈（再点一次取消）' },
  subSpotMember: { ja: '見つけたらリーダーに伝えよう', en: 'Found one? Tell your leader', zh: '找到了就告诉队长' },
  maxMark: { ja: 'これ以上つけられません', en: 'No more marks allowed', zh: '不能再画圈了' },
  // ---- プレゼント ----
  subGift: { ja: '爆弾💣を避けて、数字のぶんだけポイントになる', en: 'Avoid the bomb 💣 — the number becomes your points', zh: '避开炸弹💣，数字就是你的得分' },
  noPartner: { ja: 'ペアがいません。幹事に伝えてください', en: 'No partner. Please tell the host', zh: '没有搭档，请告诉主持人' },
  yourTurn: { ja: 'あなたの番', en: 'Your turn', zh: '轮到你了' },
  wait: { ja: '相手の番', en: 'Partner’s turn', zh: '对方的回合' },
  roleHide: { ja: '爆弾を隠す', en: 'Hide the bomb', zh: '藏炸弹' },
  roleOpen: { ja: 'プレゼントを開ける', en: 'Open a present', zh: '打开礼物' },
  waitHide: { ja: '相手が爆弾を隠しています…', en: 'Your partner is hiding the bomb…', zh: '对方正在藏炸弹…' },
  waitOpen: { ja: '相手がプレゼントを選んでいます…', en: 'Your partner is choosing a present…', zh: '对方正在选择礼物…' },
  tagHide: { ja: '隠す番', en: 'Hiding', zh: '藏炸弹' },
  tagOpen: { ja: '開ける番', en: 'Opening', zh: '开礼物' },
  lastBomb: { ja: '前のターン：{n} は爆弾でした！', en: 'Last turn: {n} was the bomb!', zh: '上一回合：{n} 是炸弹！' },
  lastSafe: { ja: '前のターン：{n} を開けて成功', en: 'Last turn: {n} was safe', zh: '上一回合：打开 {n} 安全' },
  hideSub: { ja: 'このプレゼントに爆弾を隠す', en: 'Hide the bomb here', zh: '把炸弹藏在这里' },
  openSub: { ja: 'このプレゼントを開ける', en: 'Open this gift', zh: '打开这个礼物' },
  yourPoints: { ja: '獲得ポイント', en: 'Your points', zh: '获得分数' },
  // ---- タイマー ----
  timerLabel: { ja: 'タイマー', en: 'Timer', zh: '计时器' },
  timeUpBig: { ja: '時間です', en: 'Time is up', zh: '时间到' },
  paused: { ja: '一時停止中', en: 'Paused', zh: '已暂停' },
};

// ステージごとのルール
const R = {
  lobby: {
    ja: ['ニックネームを登録すると、あなたのIDが表示されます。', 'IDはチーム作り・ペア作りで使います。', 'この画面は開いたままにしておいてください。画面は幹事の操作で自動的に切り替わります。'],
    en: ['After entering your name, your ID appears.', 'You will use this ID to form teams and pairs.', 'Keep this page open. It changes automatically as the host moves on.'],
    zh: ['输入昵称后会显示你的ID。', '组队和配对时会用到这个ID。', '请保持此页面打开，画面会随主持人的操作自动切换。'],
  },
  practice: {
    ja: ['問題はスクリーンに表示されます。', 'A〜D から1つ選んで「決定」。決定後は変更できません。', '練習なので得点はありません。'],
    en: ['Questions are shown on the screen.', 'Choose one of A–D and press Submit. You cannot change it afterwards.', 'This is practice, so no points.'],
    zh: ['题目会显示在大屏幕上。', '从A〜D中选一个并点击“确定”，确定后不能更改。', '这是练习，不计分。'],
  },
  solo: {
    ja: ['問題はスクリーンに表示されます。', 'A〜D から1つ選んで「決定」。1問につき1回だけ、変更はできません。', '早く正解するほど高得点（{max}点 → 制限時間ぎりぎりで{min}点）。不正解は0点。'],
    en: ['Questions are shown on the screen.', 'Choose one of A–D and press Submit. One answer per question; no changes.', 'The faster you answer correctly, the more points ({max} → {min} at the time limit). Wrong = 0.'],
    zh: ['题目会显示在大屏幕上。', '从A〜D中选一个并点击“确定”。每题只能答一次，不能更改。', '越快答对得分越高（{max}分 → 到时限时{min}分）。答错得0分。'],
  },
  team: {
    ja: ['1人が「作成」を押すとチーム番号が表示されます（その人がリーダー）。', '他のメンバーはその番号を入力して参加します。定員は{n}人。', '日本人と留学生がそれぞれ2人以上になるようにしましょう。'],
    en: ['One person presses Create to get a team number (they become the leader).', 'Others join by entering that number. Up to {n} members.', 'Try to include at least 2 Japanese and 2 international members.'],
    zh: ['一人点击“创建”后会显示队伍编号（此人为队长）。', '其他成员输入该编号加入，每队最多{n}人。', '请让日本学生和留学生各至少2人。'],
  },
  nasa: {
    ja: ['無人の大自然でサバイバル！持っていく道具を{n}個選びます。', 'まず1人で選び、そのあとチームで話し合ってリーダーが提出します。', 'サバイバル番組「ALONE」の上位者が実際に持っていった道具ほど高得点。チームの順位に応じて全員に加点されます。'],
    en: ['Survive alone in the wilderness! Pick {n} items to bring.', 'First choose on your own, then discuss as a team; the leader submits.', 'Items actually taken by top finishers of the TV show "ALONE" score higher. Everyone gets points based on the team ranking.'],
    zh: ['在无人的大自然中求生！选出要带的{n}件物品。', '先自己选，然后和队友讨论，由队长提交。', '节目《ALONE》中优胜者实际携带的物品得分更高。根据团队排名给全员加分。'],
  },
  spot: {
    ja: ['チーム全員のスマホに同じ画像が出ます。拡大して違いを探しましょう。', '〇をつけられるのはリーダーだけ（最大{cap}個）。見つけたらリーダーに伝えてください。', '時間内に正しく見つけた数でチームの順位が決まります。'],
    en: ['Everyone on the team sees the same picture. Zoom in to find the differences.', 'Only the leader can place marks (max {cap}). Tell your leader when you find one.', 'The team ranking is decided by how many you find correctly in time.'],
    zh: ['队伍所有人的手机都会显示同一张图，放大寻找不同之处。', '只有队长可以画圈（最多{cap}个），找到后请告诉队长。', '按时间内正确找到的数量决定团队排名。'],
  },
  pair: {
    ja: ['相手のIDをお互いに入力するとペアが成立します。', 'ペアは最後まで変わりません。'],
    en: ['Enter each other’s ID to form a pair.', 'Pairs stay the same until the end.'],
    zh: ['互相输入对方的ID即可配对。', '搭档到最后都不会改变。'],
  },
  gift: {
    ja: ['1〜10のプレゼントのどれか1つに爆弾が隠されています。', '交代で、片方が爆弾を隠し、もう片方が1つ開けます。安全なら数字のぶんだけポイントになり、爆弾なら自分のポイントが0に戻ります（ゲームは続きます）。', '最後の2つでは、選ばれなかった方は爆弾を隠した側のものになります。1手{sec}秒、時間切れはランダムで進みます。'],
    en: ['One of the gifts 1–10 hides a 💣.', 'Take turns: one hides the 💣, the other opens a gift. Safe = you earn that number; 💣 = your score resets to 0 (the game goes on).', 'With 2 gifts left, the one not chosen goes to the player who hid the 💣. {sec}s per move; time-outs are random.'],
    zh: ['1〜10号礼物中有一个藏着炸弹。', '轮流进行：一方藏炸弹，另一方打开一个礼物。安全则获得该数字的分数，开到炸弹则自己的分数归零（游戏继续）。', '剩下2个时，没被选中的那个归藏炸弹的一方。每步{sec}秒，超时将随机进行。'],
  },
  final: {
    ja: ['最後の○×問題です。持ち点のうち、賭ける点数を決めてから答えます。', '正解なら賭けた分が増え、不正解なら減ります（0未満にはなりません）。', '下位3人には秘密の妨害アイテムがあります。何が起きるかは結果発表で！'],
    en: ['The last true/false question. Decide how many of your points to bet, then answer.', 'Correct = you gain your bet; wrong = you lose it (never below 0).', 'The bottom 3 have secret items… find out at the reveal!'],
    zh: ['最后一道○×题。先决定要押多少分，再作答。', '答对则增加下注分数，答错则扣除（不会低于0）。', '最后3名有秘密的干扰道具……结果公布时揭晓！'],
  },
};

export const RULE_KEYS = [['lobby', '受付・待機'], ['practice', '練習問題'], ['solo', '個人戦'], ['team', 'チーム作り'], ['nasa', 'チーム戦・NASAゲーム'], ['spot', 'チーム戦・間違い探し'], ['pair', 'ペア作り'], ['gift', 'プレゼントゲーム（R3）'], ['final', '一発逆転']];
// 見出しの初期値（管理画面で変更できる）
export const TITLE_DEFAULT = { practice: 'Question No.{no}', solo: 'Question No.{no}', team: 'Make a Team', pair: 'Find a Partner', nasa: 'Survival Kit', spot: 'Find the Difference', gift: 'Present Game', final: 'All or Nothing' };
export const RULES_DEFAULT = R;
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? '');
export const t = (lang, key, v) => fill(T[key]?.[lang] ?? T[key]?.ja ?? key, v);
// custom = 管理者が編集したルール（{key: {ja: '1行目\n2行目', en: ..., zh: ...}}）。無ければ初期値
export const rules = (lang, key, v, custom) => {
  const c = custom?.[key];
  const lines = c ? String(c[lang] || c.ja || '').split('\n').map(x => x.trim()).filter(Boolean) : null;
  return (lines && lines.length ? lines : (R[key]?.[lang] || R[key]?.ja || [])).map(s => fill(s, v));
};
