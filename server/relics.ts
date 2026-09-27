// Tabela de drops (dados oficiais via warframestat) cruzada com os itens do warframe.market.
import { cached, HOUR } from './cache.ts';
import { getItems, type WfmItem } from './wfm.ts';
import type { RelicInfo, RelicReward } from '../shared/types.ts';
import type { Refinement } from '../shared/calc.ts';

const DROPS_URL = 'https://drops.warframestat.us/data/relics.json';

interface RawRelic {
  tier: string;
  relicName?: string;
  state: string;
  rewards: { itemName: string; chance: number }[];
}

async function getDrops(force = false): Promise<RawRelic[]> {
  return cached(
    'drops-relics',
    24 * HOUR,
    async () => {
      const res = await fetch(DROPS_URL);
      if (!res.ok) throw new Error(`drops ${res.status}`);
      const json = (await res.json()) as { relics: RawRelic[] };
      return json.relics;
    },
    force,
  );
}

export function wikiUrl(name: string) {
  return 'https://wiki.warframe.com/w/' + encodeURIComponent(name.replace(/ /g, '_'));
}

function resolveItem(name: string, byName: Map<string, WfmItem>): WfmItem | undefined {
  const n = name.toLowerCase();
  return byName.get(n) ?? byName.get(n + ' blueprint');
}

let built: { at: number; relics: RelicInfo[] } | null = null;

export async function getRelics(force = false): Promise<RelicInfo[]> {
  if (built && !force && Date.now() - built.at < HOUR) return built.relics;

  const [drops, items] = await Promise.all([getDrops(force), getItems(force)]);
  const byName = new Map(items.map((i) => [i.name.toLowerCase(), i]));

  const groups = new Map<string, RawRelic[]>();
  for (const r of drops) {
    if (!r.relicName) continue;
    const id = `${r.tier} ${r.relicName}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(r);
  }

  const relics: RelicInfo[] = [];
  for (const [id, states] of groups) {
    const [tier, code] = id.split(' ');
    const rewards = new Map<string, RelicReward>();
    for (const s of states) {
      const ref = s.state.toLowerCase() as Refinement;
      for (const rw of s.rewards) {
        let row = rewards.get(rw.itemName);
        if (!row) {
          const item = resolveItem(rw.itemName, byName);
          row = {
            name: rw.itemName,
            slug: item?.slug ?? null,
            ducats: item?.ducats ?? 0,
            chances: { intact: 0, exceptional: 0, flawless: 0, radiant: 0 },
          };
          rewards.set(rw.itemName, row);
        }
        row.chances[ref] += rw.chance / 100;
      }
    }
    const relicItem = byName.get(`${id} relic`.toLowerCase());
    relics.push({
      id,
      tier,
      code,
      slug: relicItem?.slug ?? null,
      vaulted: relicItem?.vaulted ?? false,
      wiki: wikiUrl(`${id} Relic`),
      rewards: [...rewards.values()],
    });
  }

  const tierOrder = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Vanguard'];
  relics.sort(
    (a, b) =>
      tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) || a.code.localeCompare(b.code, 'en', { numeric: true }),
  );
  built = { at: Date.now(), relics };
  return relics;
}
