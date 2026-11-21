// タイマーページ（管理者が設定したカウントダウンを大きく表示）
import { db } from './db.js';
import { BG_HTML, esc } from './ui.js';

const tp = document.getElementById('tp');
document.body.insertAdjacentHTML('afterbegin', `<div style="position:fixed;inset:0;z-index:-1">${BG_HTML}</div>`);
let tm = null;
db.on('timer', v => { tm = v; draw(); });

const C = 2 * Math.PI * 46;
function draw() {
  const has = tm && tm.dur;
  const remain = !has ? 0 : tm.running ? Math.max(0, tm.endAt - db.now()) : (tm.remain || 0);
  const s = Math.ceil(remain / 1000), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const ratio = has ? Math.max(0, Math.min(1, remain / tm.dur)) : 1;
  const state = !has ? 'idle' : remain <= 0 ? 'end' : tm.running ? 'run' : 'pause';
  tp.className = 'tp ' + state;
  const html = `<div class="eyebrow">ZHOU LAB · XMAS PARTY</div>
    <div class="label">${esc(has ? (tm.label || 'Timer') : 'Merry Christmas')}</div>
    <div class="tring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".6"/>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#e3cc95" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - ratio)).toFixed(1)}"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(201,169,106,.35)" stroke-width=".3"/></svg>
      <div class="in"><div class="num">${state === 'idle' ? 'Ready' : state === 'end' ? 'Time up!' : txt}</div>
      <div class="st">${state === 'pause' ? 'PAUSED' : state === 'run' ? 'REMAINING' : state === 'end' ? '時間です · TIME UP · 时间到' : ''}</div></div></div>
    <div class="foot">✦ ✦ ✦</div>`;
  if (tp._h !== html) { tp.innerHTML = html; tp._h = html; }
}
setInterval(draw, 200);
draw();
