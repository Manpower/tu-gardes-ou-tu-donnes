import IMAGES from './data/images.json';
// Logique de jeu pure : aucune manipulation du DOM ici.

export const TYPE_LABEL = {
  troll: 'Troll', fatal: 'Contrecoup fatal', tight: 'Duel serré', god: 'Sommet dépassé',
  free: 'Tirage libre', fighter: 'Combattant',
};

export const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Ordre de décision : round 1 J1, round 2 J2, round 3 J1 */
export const decider = (i) => (i === 1 ? 1 : 0);

export function createIndex(db) {
  // rattache l'illustration (data/images.json, chemins Fandom) à chaque carte
  db.powers.forEach((p) => { const i = IMAGES[p.id]; p.image = i ? i.p : null; p.image_w = i?.w || 0; p.image_kind = i ? i.m : null; p.image_src = i ? i.s : null; p.media = i?.v || null; });
  const byId = new Map(db.powers.map((p) => [p.id, p]));
  return { ...db, byId };
}

export function powerAllowed(p, opts) {
  if (!p) return false;
  if (opts.excludeFilmed && p.already_filmed) return false;
  if (opts.highOnly && p.confidence !== 'haute') return false;
  return true;
}

export function playableCount(db, frId, opts) {
  return db.powers.filter((p) => p.franchise_id === frId && p.kind === 'pouvoir' && powerAllowed(p, opts)).length;
}

const used = { pairs: new Set(), fighter: new Set() };

function franchiseOrder(db, opts) {
  const ids = db.franchises.map((f) => f.id);
  return opts.franchise === 'random' ? shuffle(ids) : [opts.franchise];
}

function curated(db, opts) {
  const key = (id) => db.byId.get(id)?.kanji || id;
  for (const fr of franchiseOrder(db, opts)) {
    let pool = db.pairs.filter((p) => p.franchise_id === fr
      && powerAllowed(db.byId.get(p.proposed_id), opts) && powerAllowed(db.byId.get(p.hidden_id), opts)
      && (!opts.highOnly || p.confidence === 'haute'));
    if (pool.length < 3) continue;
    const fresh = pool.filter((p) => !used.pairs.has(p.id));
    if (fresh.length >= 3) pool = fresh; else pool.forEach((p) => used.pairs.delete(p.id));

    let chosen = null;
    for (let attempt = 0; attempt < 30 && !chosen; attempt++) {
      const take = [];
      for (const p of shuffle(pool)) {
        if (take.length > 0 && p.type === 'troll') continue; // troll : round 1 uniquement
        const k = [key(p.proposed_id), key(p.hidden_id)];
        if (take.some((t) => [key(t.proposed_id), key(t.hidden_id)].some((x) => k.includes(x)))) continue;
        take.push(p);
        if (take.length === 3) break;
      }
      if (take.length === 3) chosen = take;
    }
    if (!chosen) continue;
    chosen.forEach((p) => used.pairs.add(p.id));
    return {
      fr,
      rounds: chosen.map((p) => ({
        type: p.type, prop: db.byId.get(p.proposed_id), hid: db.byId.get(p.hidden_id),
        winner: p.winner, why: p.why, conf: p.confidence, src: p.source,
      })),
    };
  }
  return null;
}

function random(db, opts) {
  for (const fr of franchiseOrder(db, opts)) {
    const pool = shuffle(db.powers.filter((p) => p.franchise_id === fr && p.kind === 'pouvoir' && powerAllowed(p, opts)));
    const take = []; const keys = new Set();
    for (const p of pool) {
      const k = p.kanji || p.name_fr;
      if (keys.has(k)) continue;
      keys.add(k); take.push(p);
      if (take.length === 6) break;
    }
    if (take.length < 6) continue;
    return { fr, rounds: [0, 1, 2].map((i) => ({ type: 'free', prop: take[i * 2], hid: take[i * 2 + 1], winner: null })) };
  }
  return null;
}

function fighter(db, opts) {
  for (const fr of franchiseOrder(db, opts)) {
    const pool = db.fbattles.filter((b) => b.franchise_id === fr && (!opts.highOnly || b.confidence === 'haute')
      && db.frounds.filter((r) => r.battle_id === b.id)
        .every((r) => powerAllowed(db.byId.get(r.proposed_id), opts) && powerAllowed(db.byId.get(r.hidden_id), opts)));
    if (!pool.length) continue;
    const fresh = pool.filter((b) => !used.fighter.has(b.id));
    const b = pick(fresh.length ? fresh : pool);
    used.fighter.add(b.id);
    const rr = db.frounds.filter((r) => r.battle_id === b.id).sort((a, c) => a.round_no - c.round_no);
    return {
      fr, note: b.note, conf: b.confidence, src: b.source,
      rounds: rr.map((r) => ({ type: 'fighter', prop: db.byId.get(r.proposed_id), hid: db.byId.get(r.hidden_id), winner: null })),
    };
  }
  return null;
}

export function newBattle(db, opts) {
  const b = opts.mode === 'curated' ? curated(db, opts) : opts.mode === 'random' ? random(db, opts) : fighter(db, opts);
  if (!b) return null;
  return { ...b, mode: opts.mode, i: 0, phase: 'choose', score: [0, 0], picks: [[], []] };
}

/** Applique le choix du joueur qui décide. Retourne le round mis à jour. */
export function applyChoice(g, keep) {
  const r = g.rounds[g.i];
  const d = decider(g.i); const o = 1 - d;
  r.keep = keep;
  r.got = keep ? [d, o] : [o, d]; // got[0] reçoit le proposé, got[1] reçoit le caché
  g.picks[r.got[0]].push(r.prop);
  g.picks[r.got[1]].push(r.hid);
  g.phase = 'reveal';
  if (r.winner) awardRound(g, r.winner === 'proposed' ? r.got[0] : r.got[1]);
  return r;
}

export function awardRound(g, player) {
  const r = g.rounds[g.i];
  if (r.awarded !== undefined) g.score[r.awarded]--;
  r.awarded = player;
  g.score[player]++;
}

export function nextRound(g) {
  if (g.i < 2) { g.i++; g.phase = 'choose'; } else g.phase = 'end';
}
