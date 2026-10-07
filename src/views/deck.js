import { esc, frColor } from '../ui/util.js';
import { card } from '../ui/card.js';

const PAGE = 60;
let limit = PAGE;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function filtered(S) {
  const q = S.deck; const nq = norm(q.q);
  return S.db.powers.filter((p) => (q.fr === 'all' || p.franchise_id === q.fr)
    && (q.filmed === 'all' || (q.filmed === 'yes') === !!p.already_filmed)
    && (q.conf === 'all' || p.confidence === q.conf)
    && (!nq || norm([p.name_fr, p.romaji, p.name_en, p.holder, p.pitch, p.category].join(' ')).includes(nq)))
    .sort((a, b) => (b.tier || 0) - (a.tier || 0) || a.name_fr.localeCompare(b.name_fr, 'fr'));
}

function modal(S) {
  const p = S.db.byId.get(S.deck.open);
  if (!p) return '';
  const fr = S.db.franchises.find((f) => f.id === p.franchise_id)?.name || '';
  const rows = [
    ['Franchise', fr], ['Détenteur', p.holder], ['Nom anglais', p.name_en], ['Romaji', p.romaji], ['Kanji', p.kanji],
    ['Tier', p.tier ? `${p.tier} sur 5` : 'Non renseigné'], ['Confiance', p.confidence],
    ['Tournage', p.already_filmed ? 'Déjà tourné' : 'Pas encore tourné'],
  ].filter(([, v]) => v);
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(p.name_fr)}">
    <button class="modal-scrim" data-action="close" aria-label="Fermer"></button>
    <div class="modal-box" style="--fr:${frColor(p.franchise_id)}">
      <div class="modal-card">${card(p, { className: 'tcg--zoom', host: true })}</div>
      <div class="modal-info">
        <button class="modal-close" data-action="close" aria-label="Fermer">×</button>
        <h2>${esc(p.name_fr)}</h2>
        <p class="modal-pitch">${esc(p.pitch)}</p>
        ${p.catch ? `<div class="trap"><b>Le piège</b>${esc(p.catch)}</div>` : ''}
        <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${p.source ? `<p class="src">Source : ${p.source_url ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">${esc(p.source)}</a>` : esc(p.source)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

export function render(S) {
  const q = S.deck;
  const list = filtered(S);
  const shown = list.slice(0, limit);
  const sel = (id, cur, opts, label) => `<select id="${id}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  return `
  <div class="deck-head">
    <h1>Le deck <span>${S.db.powers.length} cartes</span></h1>
    <button class="btn btn--ghost" data-action="export">Exporter la base en JSON</button>
  </div>
  <div class="deck-filters">
    <input type="search" id="dq" placeholder="Chercher un pouvoir, un détenteur, un romaji" value="${esc(q.q)}" aria-label="Recherche">
    ${sel('dfi', q.filmed, [['all', 'Tournées ou non'], ['no', 'Pas encore tournées'], ['yes', 'Déjà tournées']], 'Tournage')}
    ${sel('dco', q.conf, [['all', 'Toute confiance'], ['haute', 'Confiance haute'], ['moyenne', 'À vérifier']], 'Confiance')}
  </div>
  <div class="deck-chips">
    <button class="dchip" data-action="dfr" data-id="all" aria-pressed="${q.fr === 'all'}">Toutes</button>
    ${S.db.franchises.map((f) => `<button class="dchip" data-action="dfr" data-id="${esc(f.id)}" aria-pressed="${q.fr === f.id}" style="--fr:${frColor(f.id)}"><i></i>${esc(f.name)}</button>`).join('')}
  </div>
  <p class="deck-count">${list.length} carte${list.length > 1 ? 's' : ''}, de la plus puissante à la plus faible</p>
  <div class="deck-grid">${shown.length ? shown.map((p) => `<button class="deck-item" data-action="open" data-id="${esc(p.id)}" aria-label="${esc(p.name_fr)}">${card(p, { className: 'tcg--grid', host: true, small: true })}</button>`).join('')
    : '<p class="deck-empty">Aucune carte ne correspond. Élargis la recherche ou choisis une autre franchise.</p>'}</div>
  ${list.length > shown.length ? `<div class="next"><button class="btn btn--ghost" data-action="more">Afficher ${Math.min(PAGE, list.length - shown.length)} cartes de plus</button></div>` : ''}
  ${modal(S)}`;
}

export function mount(S, root, rerender) {
  const q = root.querySelector('#dq');
  q?.addEventListener('input', () => {
    S.deck.q = q.value; limit = PAGE;
    const pos = q.selectionStart; rerender();
    const el = document.getElementById('dq'); el.focus(); el.setSelectionRange(pos, pos);
  });
  root.querySelector('#dfi')?.addEventListener('change', (e) => { S.deck.filmed = e.target.value; limit = PAGE; rerender(); });
  root.querySelector('#dco')?.addEventListener('change', (e) => { S.deck.conf = e.target.value; limit = PAGE; rerender(); });
  if (S.deck.open) {
    root.querySelector('.modal-close')?.focus();
    const esc = (e) => { if (e.key === 'Escape') { S.deck.open = null; document.removeEventListener('keydown', esc); rerender(); } };
    document.addEventListener('keydown', esc);
  }
}

export function onAction(a, t, S, rerender) {
  if (a === 'dfr') { S.deck.fr = t.dataset.id; limit = PAGE; rerender(); }
  else if (a === 'more') { limit += PAGE; rerender(); }
  else if (a === 'open') { S.deck.open = t.dataset.id; rerender(); }
  else if (a === 'close') { S.deck.open = null; rerender(); }
  else if (a === 'export') {
    const { byId, ...data } = S.db;
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), ...data }, null, 1)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tu-gardes-ou-tu-donnes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); URL.revokeObjectURL(link.href);
  }
}
