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

// プレゼントボックス（CSS描画）。n=番号、cls=追加クラス
export const giftHTML = (n, cls = '', label = n) =>
  `<div class="gift g${((n - 1) % 10) + 1} ${cls}"><div class="body"></div><div class="lid"></div><div class="rv"></div><div class="bow"></div>${label !== '' ? `<div class="num">${label}</div>` : ''}</div>`;

// 背景の飾り（雪・三角形・円・イルミネーション）
export const BG_HTML = `<div class="bg"><div class="snow"></div><div class="wm" id="wm">MERRY<br>XMAS</div>
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
