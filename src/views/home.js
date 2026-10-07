import { esc, frColor } from '../ui/util.js';
import { logo } from '../ui/logo.js';
import { card } from '../ui/card.js';
import { newBattle, playableCount } from '../logic.js';

const MODES = [
  { id: 'curated', name: 'Paires écrites', desc: 'Tes paires avec leur verdict. Un troll possible au premier round.' },
  { id: 'random', name: 'Tirage au sort', desc: 'Six pouvoirs piochés dans la franchise. Le plateau tranche.' },
  { id: 'fighter', name: 'Combattant', desc: 'Un personnage, puis deux pouvoirs. Le meilleur combattant gagne.' },
];

let showcaseId = null;
function showcase(S) {
  const pool = S.db.powers.filter((p) => p.kind === 'pouvoir' && (p.tier || 0) >= 4 && !p.already_filmed);
  if (!pool.length) return null;
  if (!showcaseId || !S.db.byId.has(showcaseId)) showcaseId = pool[Math.floor(Math.random() * pool.length)].id;
  return S.db.byId.get(showcaseId);
}

export function render(S) {
  const o = S.opts;
  const demo = showcase(S);
  const frTiles = [{ id: 'random', name: 'Au hasard' }, ...S.db.franchises].map((f) => {
    const n = f.id === 'random' ? null : playableCount(S.db, f.id, o);
    return `<button class="pack ${n === 0 ? 'is-empty' : ''}" data-action="fr" data-id="${esc(f.id)}" aria-pressed="${o.franchise === f.id}" style="--fr:${f.id === 'random' ? '#F4F2FF' : frColor(f.id)}">
      <span class="pack-name">${esc(f.name)}</span>
      <span class="pack-count">${n === null ? 'Une franchise tirée au sort' : `${n} carte${n > 1 ? 's' : ''} jouable${n > 1 ? 's' : ''}`}</span>
    </button>`;
  }).join('');

  return `
  <section class="hero">
    <div class="hero-copy">
      ${logo({ size: 'xl' })}
      <p class="hero-lead">On te montre un pouvoir. Tu le gardes, ton rival prend celui qui est caché. Tu le donnes, c'est toi qui prends le caché. Trois rounds pour savoir qui a le meilleur flair.</p>
      ${S.game ? '<button class="btn btn--ghost" data-action="resume">Reprendre la battle en cours</button>' : ''}
    </div>
    <div class="hero-card">
      ${demo ? card(demo, { className: 'tcg--hero' }) : '<div class="tcg tcg--hero tcg--placeholder"></div>'}
      ${demo ? '<button class="linkbtn hero-reroll" data-action="reroll">Montre-moi une autre carte</button>' : ''}
    </div>
  </section>

  <section class="setup" aria-label="Réglages de la battle">
    <div class="setup-block">
      <h2>Mode de jeu</h2>
      <div class="modes">${MODES.map((m) => `<button class="mode" data-action="mode" data-id="${m.id}" aria-pressed="${o.mode === m.id}"><strong>${m.name}</strong><span>${m.desc}</span></button>`).join('')}</div>
    </div>
    <div class="setup-block">
      <h2>Franchise <small>une seule par battle</small></h2>
      <div class="packs">${frTiles}</div>
    </div>
    <div class="setup-block setup-row">
      <div class="players">
        <label class="field field--p0"><span>Joueur 1</span><input id="p1" value="${esc(o.p1)}" maxlength="18" autocomplete="off"></label>
        <span class="vs">VS</span>
        <label class="field field--p1"><span>Joueur 2</span><input id="p2" value="${esc(o.p2)}" maxlength="18" autocomplete="off"></label>
      </div>
      <div class="toggles">
        <label class="toggle"><input type="checkbox" id="opt-filmed" ${o.excludeFilmed ? 'checked' : ''}><span>Écarter les pouvoirs déjà tournés</span></label>
        <label class="toggle"><input type="checkbox" id="opt-high" ${o.highOnly ? 'checked' : ''}><span>Confiance haute uniquement</span></label>
        <label class="toggle"><input type="checkbox" id="opt-host" ${o.host ? 'checked' : ''}><span>Mode animateur : sources et alertes</span></label>
      </div>
    </div>
    <div class="start">
      <button class="btn btn--play" data-action="start" ${S.db.powers.length ? '' : 'disabled'}>Lancer la battle</button>
      <p class="start-error" id="start-error" role="alert"></p>
    </div>
  </section>`;
}

export function mount(S, root, rerender) {
  const bindInput = (id, key, prop = 'value') => {
    const el = root.querySelector(`#${id}`);
    // les filtres changent le nombre de cartes jouables : on réaffiche
    el?.addEventListener(prop === 'value' ? 'input' : 'change', () => { S.opts[key] = el[prop]; if (prop === 'checked') rerender(); });
  };
  bindInput('p1', 'p1'); bindInput('p2', 'p2');
  bindInput('opt-filmed', 'excludeFilmed', 'checked');
  bindInput('opt-high', 'highOnly', 'checked');
  bindInput('opt-host', 'host', 'checked');
}

export function onAction(a, t, S, render) {
  if (a === 'mode') { S.opts.mode = t.dataset.id; render(); }
  else if (a === 'fr') { S.opts.franchise = t.dataset.id; render(); }
  else if (a === 'reroll') { showcaseId = null; render(); }
  else if (a === 'resume') { S.view = 'play'; render(); }
  else if (a === 'start') {
    const g = newBattle(S.db, S.opts);
    if (!g) {
      document.getElementById('start-error').textContent = 'Pas assez de cartes pour ces réglages. Choisis une autre franchise ou désactive un filtre.';
      return;
    }
    S.game = g; S.view = 'play'; render(); window.scrollTo({ top: 0 });
  }
}
