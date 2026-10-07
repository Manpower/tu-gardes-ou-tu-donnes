import { esc, frColor, announce, reduceMotion } from '../ui/util.js';
import { card, cardFront, imageUrl } from '../ui/card.js';
import { stamp, sparks, shake } from '../ui/fx.js';
import { mountDrag } from '../ui/drag.js';
import { TYPE_LABEL, decider, applyChoice, awardRound, nextRound, newBattle } from '../logic.js';

const names = (S) => [S.opts.p1.trim() || 'Joueur 1', S.opts.p2.trim() || 'Joueur 2'];

function seat(S, p) {
  const g = S.game; const n = names(S);
  const turn = g.phase === 'choose' && decider(g.i) === p;
  const fighter = g.mode === 'fighter';
  const role = g.phase === 'choose' ? (turn ? 'Décide' : 'Attend') : g.phase === 'end' ? '' : '';
  return `<aside class="seat seat--p${p} ${turn ? 'is-turn' : ''}" data-seat="${p}">
    <div class="seat-head">
      <span class="seat-name">${esc(n[p])}</span>
      ${role ? `<span class="seat-role">${role}</span>` : ''}
    </div>
    ${fighter ? '' : `<div class="seat-score" aria-label="Score">${g.score[p]}</div>`}
    <ul class="hand" aria-label="Cartes de ${esc(n[p])}">
      ${g.picks[p].map((c) => `<li style="--fr:${frColor(c.franchise_id)}"><span>${esc(c.name_fr)}</span></li>`).join('')}
      ${Array.from({ length: Math.max(0, 3 - g.picks[p].length) }, () => '<li class="empty"></li>').join('')}
    </ul>
    <div class="seat-drop" aria-hidden="true"></div>
  </aside>`;
}

function roundDots(g) {
  return `<ol class="dots" aria-label="Rounds">${[0, 1, 2].map((i) => {
    const r = g.rounds[i];
    const cls = i === g.i && g.phase !== 'end' ? 'now' : r.awarded !== undefined && g.mode !== 'fighter' ? `won won--p${r.awarded}` : r.got ? 'done' : '';
    return `<li class="${cls}"><span>${i + 1}</span></li>`;
  }).join('')}</ol>`;
}

function choosePanel(S) {
  const g = S.game; const r = g.rounds[g.i]; const n = names(S);
  const d = decider(g.i);
  const keepBtn = `<button class="act act--keep" data-action="choose" data-keep="1"><span class="act-arrow">${d === 0 ? '←' : ''}</span>Je garde<span class="act-arrow">${d === 1 ? '→' : ''}</span></button>`;
  const giveBtn = `<button class="act act--give" data-action="choose" data-keep="0"><span class="act-arrow">${d === 1 ? '←' : ''}</span>Je donne<span class="act-arrow">${d === 0 ? '→' : ''}</span></button>`;
  return `
    <div class="duel duel--choose">
      ${card(r.prop, { id: 'proposed', host: S.opts.host, className: 'tcg--table' })}
      ${card(null, { state: 'back', frId: g.fr, className: 'tcg--table tcg--hidden' })}
    </div>
    <p class="prompt"><b>${esc(n[d])}</b>, tu le gardes ou tu le donnes&nbsp;?</p>
    <div class="actions">${d === 0 ? keepBtn + giveBtn : giveBtn + keepBtn}</div>
    <p class="hint">Fais glisser la carte vers ton côté pour la garder, vers ${esc(n[1 - d])} pour la donner. Clavier : G ou D.</p>`;
}

function trap(p) {
  return p.catch ? `<div class="trap"><b>Le piège</b>${esc(p.catch)}</div>` : '<div class="trap trap--none">Aucun piège</div>';
}

function revealPanel(S) {
  const g = S.game; const r = g.rounds[g.i]; const n = names(S);
  const fighter = g.mode === 'fighter';
  const winSide = r.winner === 'proposed' ? 0 : r.winner === 'hidden' ? 1 : null;
  const flip = !!g.anim;
  let verdict;
  if (fighter) {
    verdict = `<p class="why">${esc(n[r.got[0]])} repart avec <b>${esc(r.prop.name_fr)}</b>, ${esc(n[r.got[1]])} avec <b>${esc(r.hid.name_fr)}</b>.</p>`;
  } else if (r.winner) {
    verdict = `<p class="verdict-title">Round pour ${esc(n[r.awarded])}</p>${r.why ? `<p class="why">${esc(r.why)}</p>` : ''}`;
  } else {
    verdict = `<p class="verdict-title">Au plateau de trancher</p>${r.why ? `<p class="why">${esc(r.why)}</p>` : ''}
      <div class="award">${[0, 1].map((p) => `<button class="chipbtn chipbtn--p${p}" data-action="award" data-p="${p}" aria-pressed="${r.awarded === p}">Round pour ${esc(n[p])}</button>`).join('')}</div>`;
  }
  const src = S.opts.host && r.src ? `<p class="src">Confiance ${esc(r.conf)}. ${esc(r.src)}</p>` : '';
  const canNext = fighter || r.awarded !== undefined;
  return `
    <div class="duel duel--reveal">
      <div class="slot">${card(r.prop, { owner: n[r.got[0]], ownerSide: r.got[0], host: S.opts.host, winner: winSide === 0, loser: winSide === 1, className: 'tcg--table' })}${trap(r.prop)}</div>
      <div class="slot">${card(r.hid, { owner: n[r.got[1]], ownerSide: r.got[1], host: S.opts.host, winner: winSide === 1, loser: winSide === 0, state: flip ? 'flip' : 'front', className: 'tcg--table', id: 'revealed' })}${trap(r.hid)}</div>
    </div>
    <div class="verdict">${verdict}${src}</div>
    <div class="next"><button class="btn btn--play" data-action="next" ${canNext ? '' : 'disabled'}>${g.i < 2 ? 'Round suivant' : 'Voir le résultat'}</button></div>`;
}

function endPanel(S) {
  const g = S.game; const n = names(S);
  let winner = -1; let title;
  if (g.mode === 'fighter') {
    winner = g.winnerF ?? -1;
    title = winner < 0 ? 'Qui gagne le combat ?' : `${esc(n[winner])} remporte le combat`;
  } else if (g.score[0] === g.score[1]) title = 'Égalité parfaite';
  else { winner = g.score[0] > g.score[1] ? 0 : 1; title = `${esc(n[winner])} remporte la battle`; }
  return `
    <h2 class="end-title">${title}</h2>
    ${g.mode !== 'fighter' ? `<p class="end-score">${g.score[0]} – ${g.score[1]}</p>` : ''}
    <div class="end-hands">${[0, 1].map((p) => `<div class="end-hand ${winner === p ? 'is-winner' : ''}">
      <h3 class="end-name end-name--p${p}">${esc(n[p])}</h3>
      <div class="end-cards">${g.picks[p].map((c) => card(c, { className: 'tcg--mini', small: true })).join('')}</div></div>`).join('')}</div>
    ${g.mode === 'fighter' ? `<div class="verdict">${S.opts.host && g.note ? `<p class="why">${esc(g.note)}</p>` : ''}
      <div class="award">${[0, 1].map((p) => `<button class="chipbtn chipbtn--p${p}" data-action="fwin" data-p="${p}" aria-pressed="${winner === p}">${esc(n[p])} gagne</button>`).join('')}</div>
      ${S.opts.host ? `<p class="src">Confiance ${esc(g.conf)}. ${esc(g.src || '')}</p>` : ''}</div>` : ''}
    <div class="next"><button class="btn btn--play" data-action="again">Nouvelle battle</button><button class="btn btn--ghost" data-action="settings">Changer les réglages</button></div>`;
}

export function render(S) {
  const g = S.game;
  if (!g) return '';
  const r = g.rounds[Math.min(g.i, 2)];
  const head = `<div class="felt-head">
      <span class="tag tag--fr">${esc(S.db.franchises.find((f) => f.id === g.fr)?.name || g.fr)}</span>
      ${roundDots(g)}
      ${g.phase === 'reveal' ? `<span class="tag">${esc(TYPE_LABEL[r.type])}</span>` : '<span class="tag tag--ghost">Round ' + (g.i + 1) + ' sur 3</span>'}
    </div>`;
  const body = g.phase === 'choose' ? choosePanel(S) : g.phase === 'reveal' ? revealPanel(S) : endPanel(S);
  return `<div class="table table--${g.phase}" style="--fr:${frColor(g.fr)}">
    ${seat(S, 0)}
    <section class="felt">${head}${body}</section>
    ${seat(S, 1)}
    ${g.phase !== 'end' ? '<button class="quit linkbtn" data-action="quit">Abandonner la battle</button>' : ''}
  </div>`;
}

let keyHandler = null;
export function mount(S, root, rerender) {
  const g = S.game;
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = null;
  if (!g) return;

  if (g.phase === 'choose') {
    const d = decider(g.i);
    // précharge l'illustration de la carte cachée pour que le retournement soit net
    const hid = g.rounds[g.i].hid;
    const hidSrc = hid?.media ? `media/${hid.media}.webp` : imageUrl(hid);
    if (hidSrc) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = hidSrc; }
    const seats = root.querySelectorAll('.seat');
    mountDrag(root.querySelector('#proposed'), {
      onHover: (side) => seats.forEach((s) => {
        const p = +s.dataset.seat;
        s.dataset.hot = side === p ? (p === d ? 'keep' : 'give') : '';
      }),
      onDrop: (side) => choose(S, side === d, rerender),
    });
    keyHandler = (e) => {
      if (e.target.closest('input,textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'g') choose(S, true, rerender);
      else if (k === 'd') choose(S, false, rerender);
      else if (k === 'arrowleft') choose(S, d === 0, rerender);
      else if (k === 'arrowright') choose(S, d === 1, rerender);
    };
    document.addEventListener('keydown', keyHandler);
  }

  if (g.phase === 'reveal' && g.anim) {
    const r = g.rounds[g.i];
    const target = root.querySelector('#revealed');
    stamp(g.anim.keep);
    setTimeout(() => {
      if ((r.hid.tier || 0) >= 4) sparks(target, frColor(r.hid.franchise_id));
      shake(root.querySelector('.felt'), 5);
    }, reduceMotion() ? 0 : 420);
    g.anim = null;
    announce(`${r.keep ? 'Gardé' : 'Donné'}. Pouvoir caché : ${r.hid.name_fr}.`);
  }
}

function choose(S, keep, rerender) {
  const g = S.game;
  if (!g || g.phase !== 'choose') return;
  applyChoice(g, keep);
  g.anim = { keep };
  rerender();
}

export function onAction(a, t, S, rerender) {
  const g = S.game;
  if (a === 'choose') choose(S, t.dataset.keep === '1', rerender);
  else if (a === 'award') { awardRound(g, +t.dataset.p); rerender(); }
  else if (a === 'next') { nextRound(g); rerender(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); }
  else if (a === 'fwin') { g.winnerF = +t.dataset.p; rerender(); }
  else if (a === 'again') { const ng = newBattle(S.db, S.opts); if (ng) S.game = ng; rerender(); window.scrollTo({ top: 0 }); }
  else if (a === 'settings' || a === 'quit') { S.game = null; S.view = 'home'; rerender(); window.scrollTo({ top: 0 }); }
}

export { cardFront };
