import type { InventoryEntry, PricesResponse, RelicInfo } from '../../shared/types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.json();
}

export const api = {
  relics: () => fetch('/api/relics').then((r) => json<RelicInfo[]>(r)),
  inventory: () => fetch('/api/inventory').then((r) => json<InventoryEntry[]>(r)),
  saveInventory: (inv: InventoryEntry[]) =>
    fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inv),
    }).then((r) => json<InventoryEntry[]>(r)),
  prices: (items: string[], relics: string[], force: boolean) =>
    fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, relics, force }),
    }).then((r) => json<PricesResponse>(r)),
};
