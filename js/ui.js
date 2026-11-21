export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TEAM_COLORS = ['#ff6a9b', '#36b8e6', '#36c98e', '#ffb53a', '#8a78ec', '#ff5a7a', '#33ccbb', '#5b9cf0', '#ff9a4a', '#b07ce8'];
// DBのキーは 'u01'（ユーザー）、't3'（チーム）のように文字を付ける（数字だけだと配列に変換されるため）
export const num = k => String(k ?? '').replace(/\D/g, '');
export const sid = k => num(k);                       // 'u07' → '07'
export const ukey = input => { const n = parseInt(String(input).trim(), 10); return Number.isFinite(n) && n > 0 ? 'u' + String(n).padStart(2, '0') : null; };
export const tkey = input => { const n = parseInt(String(input).trim(), 10); return Number.isFinite(n) && n > 0 ? 't' + n : null; };
export const teamColor = tid => TEAM_COLORS[(parseInt(num(tid), 10) - 1) % TEAM_COLORS.length];
export const teamBadge = tid => tid ? `<span class="badge" style="background:${teamColor(tid)}">T${esc(num(tid))}</span>` : '';

export const CHOICE_COLORS = { A: '#ff6a9b', B: '#36b8e6', C: '#ffb53a', D: '#36c98e', O: '#36b8e6', X: '#ff6a9b' };
export const choiceLabel = c => c === 'O' ? '○' : c === 'X' ? '×' : c;

// 画像を縮小して dataURL（jpeg）にする
export function compressImage(file, maxSize = 400, quality = 0.75) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      res({ data: c.toDataURL('image/jpeg', quality), aspect: c.height / c.width, name: file.name });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// innerHTML を差し替えるときに、入力中の欄のフォーカスと値・スクロール位置を保つ
export function patch(el, html) {
  if (el._html === html) return false;
  const a = document.activeElement;
  const keep = a && a.id && el.contains(a) ? { id: a.id, v: a.value, s: a.selectionStart } : null;
  const y = scrollY;
  el.innerHTML = html; el._html = html;
  if (keep) {
    const n = document.getElementById(keep.id);
    if (n) { if ('value' in n && n.type !== 'range') n.value = keep.v; n.focus(); try { n.setSelectionRange(keep.s, keep.s); } catch {} }
  }
  scrollTo(0, y);
  return true;
}

export const fmtSec = ms => Math.max(0, Math.ceil(ms / 1000));

// プレゼントボックス（SVGイラスト）。n=番号、cls=状態クラス（on/gone/bomb）、label=札に書く文字
const GIFT_COLORS = [
  ['#ffb3d1', '#ff6aa3', '#e04585', '#ffffff'], ['#9eeaff', '#2fb6e8', '#1a8fc4', '#ffffff'],
  ['#d3c8ff', '#9a86f5', '#7462d8', '#ffe27a'], ['#a6f5e2', '#2fcbb0', '#1fa38c', '#ff6a8a'],
  ['#ffe9a3', '#ffbb33', '#e8941a', '#ff5a7a'], ['#ffb0bd', '#f5506f', '#d12f52', '#ffe27a'],
  ['#b5f0b8', '#47c46e', '#2e9e52', '#ff5a7a'], ['#b8d8ff', '#5a96f2', '#3b72d1', '#ffffff'],
  ['#ffd2ad', '#ff9045', '#e06a20', '#ffffff'], ['#ecc0ff', '#b768ea', '#9447c9', '#ffe27a'],
];
let giftSeq = 0;
export function giftHTML(n, cls = '', label = n) {
  const [l, m, d, r] = GIFT_COLORS[(n - 1) % 10], id = 'gf' + (++giftSeq);
  const open = cls.includes('gone');
  const lid = `<g class="lid" ${open ? 'transform="translate(-6 -16) rotate(-14 50 30)"' : ''}>
      <polygon points="10,34 26,26 90,26 74,34" fill="url(#${id}t)"/>
      <rect x="10" y="34" width="64" height="13" rx="1.5" fill="url(#${id}f)"/>
      <polygon points="74,34 90,26 90,39 74,47" fill="${d}"/>
      <polygon points="37,34 47,34 63,26 53,26" fill="${r}"/><polygon points="16,31 82,31 84,29 18,29" fill="${r}" opacity=".9"/>
      <rect x="37" y="34" width="10" height="13" fill="${r}"/><rect x="37" y="34" width="10" height="13" fill="#000" opacity=".06"/>
      <polygon points="80,30 84,28 84,41 80,43" fill="${r}" opacity=".85"/>
      <g transform="translate(50 27)">
        <path d="M0 0 C -14 -16, -26 -4, -16 3 C -10 6, -4 3, 0 0Z" fill="${r}" stroke="#0000001a" stroke-width=".8"/>
        <path d="M0 0 C 14 -16, 26 -4, 16 3 C 10 6, 4 3, 0 0Z" fill="${r}" stroke="#0000001a" stroke-width=".8"/>
        <path d="M-2 1 L -9 12 L -4 11 L -2 15Z M2 1 L 9 12 L 4 11 L 2 15Z" fill="${r}" stroke="#0000001a" stroke-width=".6"/>
        <path d="M-6 -7 C -10 -9, -15 -7, -16 -3" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>
        <ellipse cx="0" cy="1" rx="4" ry="3.4" fill="${r}" stroke="#0000001f" stroke-width=".8"/>
      </g></g>`;
  return `<div class="gift ${cls}"><svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="${m}"/></linearGradient>
      <linearGradient id="${id}t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
    <ellipse cx="50" cy="91" rx="38" ry="5" fill="#5a4fa0" opacity=".14"/>
    <rect x="14" y="45" width="56" height="44" rx="1.5" fill="url(#${id}f)"/>
    <polygon points="70,45 86,37 86,81 70,89" fill="${d}"/>
    ${open ? `<polygon points="14,45 30,37 86,37 70,45" fill="${d}" opacity=".9"/><polygon points="14,45 30,37 30,40 17,46" fill="#0003"/>` : ''}
    <rect x="37" y="45" width="10" height="44" fill="${r}"/><polygon points="76,42 80,40 80,84 76,86" fill="${r}" opacity=".85"/>
    <rect x="16" y="47" width="5" height="40" rx="2" fill="#fff" opacity=".28"/>
    ${lid}
    ${label !== '' ? `<g class="tag"><path d="M42 47 Q 40 54 33 58" stroke="#8a84b8" stroke-width=".9" fill="none"/>
      <rect x="14" y="55" width="38" height="24" rx="3" fill="#fff" stroke="#e3dff5" stroke-width=".8" transform="rotate(-6 33 66)"/>
      <circle cx="31" cy="58.4" r="1.3" fill="#c9c3e8" transform="rotate(-6 33 66)"/>
      <text x="33" y="73" text-anchor="middle" transform="rotate(-6 33 66)">${label}</text></g>` : ''}
  </svg></div>`;
}

// 背景の飾り（雪・三角形・円・イルミネーション）
export const BG_HTML = `<div class="bg"><div class="snow"></div><div class="dotgrid" style="left:-14px;top:22%"></div><div class="dotgrid" style="right:-30px;bottom:4%;height:180px"></div><div class="wm" id="wm">MERRY<br>XMAS</div>
  <span class="tri" style="left:-20px;top:18%;border-width:0 46px 80px 46px;border-color:transparent transparent #33ccbb33 transparent;transform:rotate(-20deg)"></span>
  <span class="tri" style="right:-12px;top:44%;border-width:0 34px 60px 34px;border-color:transparent transparent #ff7eb333 transparent;transform:rotate(25deg)"></span>
  <span class="tri" style="left:12%;bottom:12%;border-width:0 24px 42px 24px;border-color:transparent transparent #ffffffaa transparent;transform:rotate(15deg)"></span>
  <span class="tri" style="right:16%;top:10%;border-width:0 16px 28px 16px;border-color:transparent transparent #9b8cf044 transparent;transform:rotate(-35deg)"></span>
  <span class="c" style="right:8%;bottom:26%;width:28px;height:28px"></span>
  <span class="c" style="left:6%;top:34%;width:14px;height:14px;border-color:#33ccbb88"></span>
  <span class="c" style="right:22%;bottom:7%;width:12px;height:12px;border-color:#ff7eb388"></span>
  <svg class="lights" viewBox="0 0 360 34" preserveAspectRatio="none"><path d="M0 4 Q 45 26 90 8 T 180 8 T 270 8 T 360 6" fill="none" stroke="#7d78a866" stroke-width="1.5"/>
  ${['#ff5a7a','#ffc94a','#3fc98a','#5bc8f0','#ff7eb3','#ffc94a','#ff5a7a','#3fc98a','#9b8cf0','#ffc94a','#ff5a7a','#5bc8f0'].map((c, i) =>
    `<circle cx="${22 + i * 30}" cy="${[13, 19, 11, 11, 18, 10, 11, 18, 10, 11, 17, 8][i]}" r="4" fill="${c}"/>`).join('')}</svg></div>`;
