// Effets ponctuels : autocollant « JE GARDE ! / JE DONNE ! » et étincelles de révélation.
import { reduceMotion } from './util.js';

export function stamp(keep) {
  const host = document.getElementById('fx');
  const el = document.createElement('div');
  el.className = `sticker sticker--${keep ? 'keep' : 'give'}`;
  el.innerHTML = `<span>${keep ? 'JE GARDE !' : 'JE DONNE !'}</span>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), reduceMotion() ? 700 : 1100);
}

export function sparks(target, color, count = 22) {
  if (reduceMotion() || !target) return;
  const r = target.getBoundingClientRect();
  const host = document.getElementById('fx');
  const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const d = 140 + Math.random() * 160;
    s.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${color};--s:${4 + Math.random() * 6}px;animation-delay:${Math.random() * 60}ms`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

export function shake(el, px = 6) {
  if (reduceMotion() || !el) return;
  el.animate([
    { transform: 'translate(0,0)' }, { transform: `translate(${-px}px,${px / 2}px)` }, { transform: `translate(${px}px,${-px / 2}px)` },
    { transform: `translate(${-px / 2}px,0)` }, { transform: 'translate(0,0)' },
  ], { duration: 280, easing: 'ease-out' });
}
