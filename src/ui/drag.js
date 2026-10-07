// Glisser la carte proposée vers un côté de la table pour décider.
// side 0 = gauche (Joueur 1), side 1 = droite (Joueur 2).
import { reduceMotion } from './util.js';

export function mountDrag(cardEl, { onHover, onDrop }) {
  if (!cardEl) return;
  const threshold = () => Math.min(140, window.innerWidth * 0.18);
  let start = null; let dx = 0; let dy = 0; let id = null;

  const side = () => (Math.abs(dx) < threshold() * 0.35 ? null : dx < 0 ? 0 : 1);

  cardEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY }; dx = 0; dy = 0; id = e.pointerId;
    cardEl.setPointerCapture(id);
    cardEl.classList.add('is-dragging');
  });
  cardEl.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== id) return;
    dx = e.clientX - start.x; dy = (e.clientY - start.y) * 0.35;
    cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
    onHover?.(side(), Math.min(1, Math.abs(dx) / threshold()));
  });
  const end = (e) => {
    if (!start || e.pointerId !== id) return;
    const s = Math.abs(dx) >= threshold() ? (dx < 0 ? 0 : 1) : null;
    start = null;
    cardEl.classList.remove('is-dragging');
    onHover?.(null, 0);
    if (s === null) {
      cardEl.style.transition = reduceMotion() ? 'none' : 'transform .35s cubic-bezier(.34,1.56,.64,1)';
      cardEl.style.transform = '';
      setTimeout(() => { cardEl.style.transition = ''; }, 360);
      return;
    }
    cardEl.style.transition = reduceMotion() ? 'none' : 'transform .22s ease-in, opacity .22s';
    cardEl.style.transform = `translate(${s === 0 ? -window.innerWidth * 0.4 : window.innerWidth * 0.4}px, ${dy}px) rotate(${s === 0 ? -24 : 24}deg)`;
    cardEl.style.opacity = '0';
    setTimeout(() => onDrop(s), reduceMotion() ? 0 : 200);
  };
  cardEl.addEventListener('pointerup', end);
  cardEl.addEventListener('pointercancel', end);
}
