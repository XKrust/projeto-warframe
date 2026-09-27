import type { Refinement } from './calc';

export interface RelicReward {
  name: string;
  slug: string | null; // null = não negociável (Forma, Kuva...)
  ducats: number;
  chances: Record<Refinement, number>; // frações 0..1
}

export interface RelicInfo {
  id: string; // "Axi A1"
  tier: string;
  code: string;
  slug: string | null;
  vaulted: boolean;
  wiki: string;
  rewards: RelicReward[];
}

export interface InventoryEntry {
  relic: string; // RelicInfo.id
  refinement: Refinement;
  qty: number;
}

export interface PriceSummary {
  sell: number | null; // mediana dos 3 menores sell online
  lowest: number | null; // anúncio de venda online mais barato
  ideal: number | null; // preço ideal pra anunciar (ver server/pricing.ts)
  soldPerDay: number | null; // unidades vendidas por dia (histórico); null = não buscado
  buy: number | null; // maior buy online
  orders: number;
  updatedAt: number; // ms, quando o preço foi buscado no warframe.market
}

export interface PricesResponse {
  items: Record<string, PriceSummary>;
  relics: Record<string, Partial<Record<Refinement, PriceSummary>>>;
}
