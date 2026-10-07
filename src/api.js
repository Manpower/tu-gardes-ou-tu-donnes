// Accès à la base Supabase (lecture seule via la clé publique + RLS).
// 5 requêtes au démarrage, une par table, puis tout tourne en mémoire.

const SUPABASE_URL = 'https://vkqsfjcysoeuiiglplff.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OFLh36oKZ3zSk3QhwPp4HA_vhlDIZWq';
const CACHE_KEY = 'tgotd-cache-v2';
const PAGE = 1000;

async function fetchTable(table, order) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${order ? `&order=${order}` : ''}`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Accept: 'application/json', Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) throw new Error(`${table} : HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: new Date().toISOString(), data })); } catch { /* stockage indisponible */ }
}

/** Charge toute la base. Retourne { data, source: 'live' | 'cache', at?, error? } */
export async function loadDatabase() {
  try {
    const [franchises, powers, pairs, fbattles, frounds] = await Promise.all([
      fetchTable('franchises', 'name'),
      fetchTable('powers', 'id'),
      fetchTable('curated_pairs', 'franchise_id,battle_no,round_no'),
      fetchTable('fighter_battles', 'franchise_id,battle_no'),
      fetchTable('fighter_rounds', 'battle_id,round_no'),
    ]);
    const data = { franchises, powers, pairs, fbattles, frounds };
    writeCache(data);
    return { data, source: 'live' };
  } catch (error) {
    const cached = readCache();
    if (cached?.data) return { data: cached.data, source: 'cache', at: cached.at, error };
    return { data: { franchises: [], powers: [], pairs: [], fbattles: [], frounds: [] }, source: 'none', error };
  }
}
