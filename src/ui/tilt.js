// Inclinaison 3D + reflet holographique qui suit le pointeur (technique inspirée de pokemon-cards-css).
import { reduceMotion } from './util.js';

function bind(el) {
  if (el._tilt) return;
  el._tilt = true;
  const body = el.querySelector('.tcg-body');
  let raf = 0;
  let target = null;

  const apply = () => {
    raf = 0;
    if (!target) return;
    const { x, y } = target;
    body.style.setProperty('--mx', `${x * 100}%`);
    body.style.setProperty('--my', `${y * 100}%`);
    body.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
    body.style.setProperty('--ry', `${(x - 0.5) * 20}deg`);
    body.style.setProperty('--hyp', Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2).toFixed(3));
  };

  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || el.classList.contains('is-dragging')) return;
    const r = el.getBoundingClientRect();
    target = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    el.classList.add('is-active');
    if (!raf) raf = requestAnimationFrame(apply);
  });
  el.addEventListener('pointerleave', () => {
    target = null;
    el.classList.remove('is-active');
    ['--mx', '--my', '--rx', '--ry', '--hyp'].forEach((v) => body.style.removeProperty(v));
  });
}

export function mountTilt(root = document) {
  if (reduceMotion()) return;
  root.querySelectorAll('[data-tilt]').forEach(bind);
}
