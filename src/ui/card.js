import { esc, frColor } from './util.js';
import { logoMark } from './logo.js';

const gems = (t) => (t ? `<span class="tcg-gems" title="Tier ${t} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= t ? 'on' : ''}"></i>`).join('')}</span>` : '');

/** Hash simple et stable pour dériver un motif unique par carte. */
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Cercle magique généré à partir de l'id : chaque carte a le sien, toujours le même. */
function sigil(id) {
  const h = hash(id);
  const k = 5 + (h % 5);                 // branches de l'étoile
  const step = k >= 7 ? 3 : 2;
  const ticks = 24 + ((h >> 4) % 4) * 8;
  const inner = 14 + ((h >> 8) % 9);
  const rot = (h >> 12) % 360;
  const pt = (i, r) => { const a = (Math.PI * 2 * i) / k - Math.PI / 2; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; };
  const star = Array.from({ length: k }, (_, i) => pt((i * step) % k, 37)).join(' ');
  const tickLines = Array.from({ length: ticks }, (_, i) => {
    const a = (Math.PI * 2 * i) / ticks; const r1 = i % 2 ? 44 : 42.5;
    return `<line x1="${(50 + r1 * Math.cos(a)).toFixed(2)}" y1="${(50 + r1 * Math.sin(a)).toFixed(2)}" x2="${(50 + 47 * Math.cos(a)).toFixed(2)}" y2="${(50 + 47 * Math.sin(a)).toFixed(2)}"/>`;
  }).join('');
  const nodes = Array.from({ length: k }, (_, i) => { const [x, y] = pt(i, 37).split(','); return `<circle cx="${x}" cy="${y}" r="1.8"/>`; }).join('');
  return `<svg class="tcg-sigil" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(${rot} 50 50)" fill="none" stroke="currentColor" stroke-width=".9">
    <circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="41" stroke-dasharray="1.2 2.4"/>${tickLines}
    <polygon points="${star}"/><circle cx="50" cy="50" r="${inner}"/><circle cx="50" cy="50" r="${inner - 4}" stroke-dasharray="3 2"/>
    <g fill="currentColor" stroke="none">${nodes}<circle cx="50" cy="50" r="2.4"/></g></g></svg>`;
}

const FANDOM = 'https://static.wikia.nocookie.net/';
/**
 * URL redimensionnée par Fandom (GIF ressortis en WebP animé, SVG en PNG).
 * Fandom répond 404 si on demande plus large que l'original : on plafonne à image_w quand on le connaît.
 */
export function imageUrl(p, w = 520) {
  if (!p?.image) return null;
  const width = p.image_w ? Math.min(w, p.image_w) : w;
  return `${FANDOM}${p.image}/revision/latest/scale-to-width-down/${width}`;
}

const FAIL = "this.parentNode.classList.remove('has-img');this.remove()";

/**
 * Illustration de la carte.
 * Les anciens GIF Fandom sont convertis en local (media/<slug>.webp pour l'image fixe,
 * media/<slug>.mp4 pour la boucle) : le deck et les mini-cartes n'affichent que l'image fixe,
 * la table, l'accueil et le zoom jouent la vidéo. Si la vidéo ne se lit pas, l'image fixe (poster) reste affichée.
 */
function artMedia(p, src, opts) {
  const cls = `tcg-img tcg-img--${p.image_kind === 'p' ? 'portrait' : 'scene'}`;
  if (p.media && !opts.small) {
    return `<video class="${cls}" src="media/${esc(p.media)}.mp4" poster="${esc(src)}" autoplay muted loop playsinline preload="metadata" disablepictureinpicture aria-hidden="true" onerror="this.onerror=null;this.removeAttribute('src')"></video>`;
  }
  return `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" onerror="${FAIL}">`;
}

function nameSize(name) {
  const n = name.length;
  return n > 34 ? 'xs' : n > 24 ? 's' : n > 16 ? 'm' : 'l';
}

/**
 * Face avant d'une carte.
 * opts: { owner, ownerSide (0|1), winner, side, host, showCatch, compact }
 */
export function cardFront(p, opts = {}) {
  if (!p) return '';
  const tier = p.tier || 0;
  const foil = tier >= 5 ? 'holo' : tier >= 3 ? 'foil' : 'plain';
  const who = p.kind === 'personnage' ? (p.role || 'Personnage') : (p.holder || '');
  const flags = [];
  if (opts.host) {
    if (p.already_filmed) flags.push('<span class="flag flag--filmed">Déjà tourné</span>');
    if (p.confidence === 'moyenne') flags.push('<span class="flag flag--warn">À vérifier</span>');
  }
  const src = p.media ? `media/${p.media}.webp` : imageUrl(p, opts.small ? 320 : 520);
  return `<div class="tcg-face tcg-front tcg--${foil}" style="--fr:${frColor(p.franchise_id)}">
    <div class="tcg-frame">
      <div class="tcg-top"><span class="tcg-cat">${esc(p.category || (p.kind === 'personnage' ? 'Personnage' : 'Pouvoir'))}</span>${gems(tier)}</div>
      <h3 class="tcg-name tcg-name--${nameSize(p.name_fr)}">${esc(p.name_fr)}</h3>
      <div class="tcg-art ${src ? 'has-img' : ''}">
        ${sigil(p.id)}
        ${src ? artMedia(p, src, opts) : ''}
        ${!src && p.kanji && [...p.kanji].length <= 8 ? `<span class="tcg-glyph tcg-glyph--${Math.min(8, Math.max(2, [...p.kanji].length))}">${esc(p.kanji)}</span>` : ''}
        ${p.romaji || p.name_en ? `<span class="tcg-sub">${esc(p.romaji || p.name_en)}</span>` : ''}
        ${flags.length ? `<span class="tcg-flags">${flags.join('')}</span>` : ''}
      </div>
      <div class="tcg-text"><p>${esc(p.pitch)}</p></div>
      <div class="tcg-foot"><span>${esc(who)}</span></div>
    </div>
    <div class="tcg-shine"></div><div class="tcg-glare"></div>
  </div>`;
}

export function cardBack(frId) {
  return `<div class="tcg-face tcg-back" style="--fr:${frColor(frId)}">
    <div class="tcg-back-ring">${logoMark(96)}</div>
    <span class="tcg-back-label">Pouvoir caché</span>
    <div class="tcg-glare"></div>
  </div>`;
}

/**
 * Carte complète avec conteneur 3D (inclinaison + retournement).
 * opts.state: 'front' | 'back' | 'flip' (back -> front animé)
 */
export function card(p, opts = {}) {
  const state = opts.state || 'front';
  const owner = opts.owner ? `<div class="tcg-owner tcg-owner--p${opts.ownerSide}">Pour ${esc(opts.owner)}</div>` : '';
  const cls = ['tcg', state === 'back' ? 'is-back' : '', state === 'flip' ? 'is-flipping' : '', opts.winner ? 'is-winner' : '', opts.loser ? 'is-loser' : '', opts.className || ''].join(' ');
  return `<div class="${cls}" ${opts.id ? `id="${opts.id}"` : ''} data-tilt ${opts.attrs || ''}>
    ${owner}
    <div class="tcg-body">
      <div class="tcg-flipper">
        ${state === 'back' ? cardBack(opts.frId || p?.franchise_id) : cardFront(p, opts)}
        ${state === 'flip' ? cardBack(opts.frId || p?.franchise_id).replace('tcg-back"', 'tcg-back tcg-back--rear"') : ''}
      </div>
    </div>
  </div>`;
}
