import './styles/fonts.css';
import './styles/base.css';
import './styles/card.css';
import './styles/home.css';
import './styles/play.css';
import './styles/deck.css';

import { loadDatabase } from './api.js';
import { createIndex } from './logic.js';
import { logo } from './ui/logo.js';
import { esc } from './ui/util.js';
import { mountTilt } from './ui/tilt.js';
import * as Home from './views/home.js';
import * as Play from './views/play.js';
import * as Deck from './views/deck.js';

export const S = {
  view: 'home',               // home | play | deck
  db: createIndex({ franchises: [], powers: [], pairs: [], fbattles: [], frounds: [] }),
  status: { kind: 'loading', text: 'Connexion à la base…' },
  opts: { mode: 'curated', franchise: 'random', p1: 'Joueur 1', p2: 'Joueur 2', excludeFilmed: true, highOnly: false, host: true },
  game: null,
  deck: { q: '', fr: 'all', filmed: 'all', conf: 'all', open: null },
};

const VIEWS = { home: Home, play: Play, deck: Deck };
const app = document.getElementById('app');

function topbar() {
  const s = S.status;
  return `<header class="topbar">
    <button class="topbar-logo" data-action="go" data-view="home" aria-label="Accueil">${logo()}</button>
    <div class="status status--${s.kind}" role="status"><i></i><span>${esc(s.text)}</span>${s.kind === 'warn' || s.kind === 'err' ? '<button class="linkbtn" data-action="reload">Réessayer</button>' : ''}</div>
    <nav class="seg" aria-label="Sections">
      <button data-action="go" data-view="home" aria-pressed="${S.view !== 'deck'}">Jouer</button>
      <button data-action="go" data-view="deck" aria-pressed="${S.view === 'deck'}">Deck</button>
    </nav>
  </header>`;
}

export function render() {
  const view = VIEWS[S.view];
  document.body.dataset.view = S.view;
  app.innerHTML = topbar() + `<main class="view view--${S.view}">${view.render(S)}</main>`;
  view.mount?.(S, app, render);
  mountTilt(app);
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action;
  if (a === 'go') {
    const v = t.dataset.view;
    // « Jouer » ramène à la battle en cours s'il y en a une ; le logo ramène toujours à l'accueil.
    S.view = v === 'home' && S.game && !t.closest('.topbar-logo') ? 'play' : v;
    render(); window.scrollTo({ top: 0 }); return;
  }
  if (a === 'reload') { boot(); return; }
  VIEWS[S.view].onAction?.(a, t, S, render, e);
});

async function boot() {
  S.status = { kind: 'loading', text: 'Connexion à la base…' };
  render();
  const res = await loadDatabase();
  S.db = createIndex(res.data);
  if (res.source === 'live') S.status = { kind: 'ok', text: `${res.data.powers.length} cartes en ligne` };
  else if (res.source === 'cache') S.status = { kind: 'warn', text: `Hors ligne : copie du ${new Date(res.at).toLocaleDateString('fr-FR')}` };
  else S.status = { kind: 'err', text: 'Base injoignable. Vérifie ta connexion.' };
  render();
}
boot();
