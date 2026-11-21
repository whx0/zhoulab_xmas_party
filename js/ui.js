// 共通の小物（エスケープ、キー変換、差分描画、画像圧縮、アイコン・装飾のSVG）

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// DBのキーは 'u01'（ユーザー）、't3'（チーム）のように文字を付ける（数字だけだと配列に変換されるため）
export const num = k => String(k ?? '').replace(/\D/g, '');
export const sid = k => num(k);                       // 'u07' → '07'
export const ukey = input => { const n = parseInt(String(input).trim(), 10); return Number.isFinite(n) && n > 0 ? 'u' + String(n).padStart(2, '0') : null; };
export const tkey = input => { const n = parseInt(String(input).trim(), 10); return Number.isFinite(n) && n > 0 ? 't' + n : null; };

export const TEAM_COLORS = ['#c9a96a', '#7fa7b8', '#b98a8a', '#8fae8b', '#a596c2', '#d0a07a', '#6f9aa0', '#c28fae', '#9aa36f', '#8c9cc9'];
export const teamColor = tid => TEAM_COLORS[(parseInt(num(tid), 10) - 1) % TEAM_COLORS.length] || '#c9a96a';
export const CHOICE_COLORS = { A: '#c9a96a', B: '#7fa7b8', C: '#b98a8a', D: '#8fae8b', O: '#7fa7b8', X: '#b98a8a' };
export const fmtN = n => Number(n || 0).toLocaleString('en-US');
export const fmtSec = ms => Math.max(0, Math.ceil(ms / 1000));

// 画像を縮小して dataURL（jpeg）にする
export function compressImage(file, maxSize = 400, quality = 0.8) {
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

// innerHTML を差し替えるときに、入力中の欄のフォーカス・値・スクロール位置を保つ
export function patch(el, html) {
  if (el._html === html) return false;
  const a = document.activeElement;
  const keep = a && a.id && el.contains(a) ? { id: a.id, v: a.value, s: a.selectionStart } : null;
  const vals = {};
  el.querySelectorAll('input[id]:not([type=range]):not([type=file]):not([type=checkbox]), textarea[id], select[id]').forEach(n => { if (n.dataset.keep !== undefined) vals[n.id] = n.value; });
  const y = scrollY;
  el.innerHTML = html; el._html = html;
  for (const [id, v] of Object.entries(vals)) { const n = document.getElementById(id); if (n) n.value = v; }
  if (keep) {
    const n = document.getElementById(keep.id);
    if (n) { if ('value' in n && n.type !== 'range') n.value = keep.v; n.focus(); try { n.setSelectionRange(keep.s, keep.s); } catch {} }
  }
  scrollTo(0, y);
  return true;
}

// ---------- 線画アイコン（stroke=currentColor） ----------
const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  gift: P('<rect x="3.5" y="9" width="17" height="11.5" rx="1"/><rect x="2.5" y="6" width="19" height="3.5" rx="1"/><path d="M12 6v14.5"/><path d="M12 6c-1.5-3.5-5.5-3.8-5.5-1.6C6.5 6 10 6 12 6zM12 6c1.5-3.5 5.5-3.8 5.5-1.6C17.5 6 14 6 12 6z"/>'),
  open: P('<path d="M3.5 12h17v8.5h-17z"/><path d="M12 12v8.5"/><path d="M4 9.5l15-4 .8 3-15 4z"/><path d="M11.4 7.5L9.8 3.6M11.4 7.5l3-2.9"/>'),
  bomb: P('<circle cx="10.5" cy="14" r="6.5"/><path d="M15 9.5l2-2"/><path d="M17 7.5c.6-1.6 2-2 3.2-1.4"/><path d="M20.5 3.5v1M22 5h-1M20.9 2.6l.6-.6"/><path d="M7.5 12a3.5 3.5 0 0 1 2.5-2.4"/>'),
  check: P('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  pen: P('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>'),
  star: P('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'),
  crown: P('<path d="M3.5 18h17M4.5 18L3 8l5 4 4-7 4 7 5-4-1.5 10"/>'),
  users: P('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><circle cx="17" cy="9.5" r="2.6"/><path d="M16.5 14c2.4.1 4 1.6 4.5 4.5"/>'),
  link: P('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  search: P('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>'),
  logout: P('<path d="M9 4H5v16h4"/><path d="M14 8l4 4-4 4M18 12H9"/>'),
  play: P('<path d="M7 5l12 7-12 7z"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="1"/>'),
  medal: P('<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3.5l3.5 6 3.5-6M12 12.5v5"/>'),
};

// ---------- 装飾 ----------
// 金の線で描くリース（中身は html で渡す）
export function wreathHTML(inner, { bow = true, size = 220 } = {}) {
  const R = 84, leaves = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, x = 110 + Math.cos(a) * R, y = 110 + Math.sin(a) * R;
    const deg = (a * 180) / Math.PI + (i % 2 ? 60 : -60) + 90;
    leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="4.2" transform="rotate(${deg.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }
  const berries = [20, 70, 125, 160, 215, 250, 300, 335].map(d => {
    const a = (d * Math.PI) / 180; return `<circle cx="${(110 + Math.cos(a) * (R + 2)).toFixed(1)}" cy="${(110 + Math.sin(a) * (R + 2)).toFixed(1)}" r="2.6" fill="#fff" stroke="none"/>`;
  }).join('');
  return `<div class="wreath" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 220 220" aria-hidden="true"><g fill="none" stroke="#c9a96a" stroke-width="1.1">
      <circle cx="110" cy="110" r="${R}" stroke-width=".8" opacity=".6"/>${leaves.join('')}</g>${berries}
      ${bow ? `<g fill="none" stroke="#c9a96a" stroke-width="1.4" stroke-linejoin="round">
        <path d="M110 196c-10-10-26-14-28-4s16 8 28 4z" fill="#0f2a39"/><path d="M110 196c10-10 26-14 28-4s-16 8-28 4z" fill="#0f2a39"/>
        <path d="M106 198l-8 18M114 198l8 18"/><circle cx="110" cy="196" r="4" fill="#0f2a39"/></g>` : ''}
      <path d="M110 16l2.4 6 6.2.4-4.8 3.9 1.6 6.1-5.4-3.4-5.4 3.4 1.6-6.1-4.8-3.9 6.2-.4z" fill="#e3cc95"/>
    </svg><div class="wreath-in">${inner}</div></div>`;
}

// ガラスのオーナメント（結果表示）
export function ornamentHTML(inner) {
  return `<div class="ornament"><svg viewBox="0 0 240 300" aria-hidden="true">
    <defs><radialGradient id="orb" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#2d5a6c"/><stop offset=".55" stop-color="#143546"/><stop offset="1" stop-color="#0c2230"/></radialGradient></defs>
    <path d="M120 0v52" stroke="#c9a96a" stroke-width="1.2"/><circle cx="120" cy="56" r="6" fill="none" stroke="#c9a96a" stroke-width="1.2"/>
    <rect x="104" y="60" width="32" height="16" rx="3" fill="#0f2a39" stroke="#c9a96a" stroke-width="1.2"/>
    <circle cx="120" cy="182" r="106" fill="url(#orb)" stroke="#c9a96a" stroke-width="1.4"/>
    <circle cx="120" cy="182" r="98" fill="none" stroke="#c9a96a" stroke-width=".6" opacity=".55"/>
    <path d="M24 160c40 14 152 14 192 0" fill="none" stroke="#c9a96a" stroke-width=".6" opacity=".5"/>
    <ellipse cx="86" cy="118" rx="28" ry="12" fill="#fff" opacity=".12" transform="rotate(-24 86 118)"/>
  </svg><div class="ornament-in">${inner}</div></div>`;
}

// 背景の飾り（雪・星・フレーム・吊り下げオーナメント）
const stars = [[8, 14, 10], [88, 22, 12], [92, 48, 9], [6, 52, 8], [78, 70, 7], [14, 82, 9], [50, 6, 6], [30, 30, 5], [70, 36, 5]];
export const BG_HTML = `<div class="bg"><div class="snow"></div><div class="snow s2"></div>
  ${stars.map(([x, y, s], i) => `<span class="spark" style="left:${x}%;top:${y}%;font-size:${s * 1.6}px;animation-delay:${i * 0.4}s">✦</span>`).join('')}
</div>
<div class="frame"><svg class="hang" viewBox="0 0 60 120" aria-hidden="true"><path d="M30 0v70" stroke="#c9a96a" stroke-width="1"/><circle cx="30" cy="86" r="14" fill="none" stroke="#c9a96a" stroke-width="1.1"/><rect x="25" y="68" width="10" height="5" rx="1" fill="none" stroke="#c9a96a"/></svg>
  <svg class="hang h2" viewBox="0 0 60 120" aria-hidden="true"><path d="M30 0v46" stroke="#c9a96a" stroke-width="1"/><circle cx="30" cy="60" r="11" fill="none" stroke="#c9a96a" stroke-width="1.1"/><path d="M19 58h22M20 63h20" stroke="#c9a96a" stroke-width=".8"/><rect x="26" y="44" width="8" height="4" rx="1" fill="none" stroke="#c9a96a"/></svg></div>`;
