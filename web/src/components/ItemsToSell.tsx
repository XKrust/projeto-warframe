import { useMemo, useState } from 'react';
import { REFINEMENT_LABEL, type Refinement } from '../../../shared/calc';
import type { InventoryEntry, PriceSummary, PricesResponse, RelicInfo } from '../../../shared/types';
import { fmt, priceOf, type Settings } from '../model';
import IdealPrice from './IdealPrice';
import { useI18n } from '../i18n';

interface Props {
  relicMap: Map<string, RelicInfo>;
  inventory: InventoryEntry[];
  prices: PricesResponse;
  settings: Settings;
}

interface Source {
  relic: RelicInfo;
  refinement: Refinement;
  qty: number;
  chance: number;
}

interface ItemRow {
  name: string;
  slug: string;
  ducats: number;
  price: PriceSummary | undefined;
  value: number;
  sources: Source[];
  pAny: number; // chance de sair pelo menos 1 abrindo tudo
}

const GOOD = 15; // plat a partir do qual vale anunciar

function tip(row: ItemRow) {
  if (!row.price || row.price.orders === 0) return { key: 'tip.noOrders', cls: 'open' } as const;
  if (row.value >= GOOD) return { key: 'tip.sell', cls: 'sell' } as const;
  if (row.ducats >= 45 && row.value <= 6) return { key: 'tip.ducats', cls: 'up' } as const;
  return { key: 'tip.low', cls: 'open' } as const;
}

export default function ItemsToSell({ relicMap, inventory, prices, settings }: Props) {
  const { t } = useI18n();
  const [onlyGood, setOnlyGood] = useState(false);

  const rows = useMemo(() => {
    const map = new Map<string, ItemRow>();
    for (const e of inventory) {
      const relic = relicMap.get(e.relic);
      if (!relic) continue;
      for (const rw of relic.rewards) {
        if (!rw.slug) continue;
        let row = map.get(rw.slug);
        if (!row) {
          const price = prices.items[rw.slug];
          row = {
            name: rw.name,
            slug: rw.slug,
            ducats: rw.ducats,
            price,
            value: priceOf(price, settings.priceField),
            sources: [],
            pAny: 0,
          };
          map.set(rw.slug, row);
        }
        row.sources.push({ relic, refinement: e.refinement, qty: e.qty, chance: rw.chances[e.refinement] });
      }
    }
    for (const row of map.values()) {
      const pNone = row.sources.reduce((p, s) => p * Math.pow(1 - s.chance, s.qty), 1);
      row.pAny = 1 - pNone;
      row.sources.sort((a, b) => b.chance * b.qty - a.chance * a.qty);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [inventory, relicMap, prices, settings.priceField]);

  const shown = onlyGood ? rows.filter((r) => r.value >= GOOD) : rows;
  const loading = rows.filter((r) => !r.price).length;

  return (
    <div className="card">
      <div className="row-between">
        <div>
          <h2>{t('items.title')}</h2>
          <p className="muted">{t('items.desc')}</p>
        </div>
        <label className="field">
          <input
            type="checkbox"
            checked={onlyGood}
            onChange={(e) => setOnlyGood(e.target.checked)}
            style={{ width: 'auto' }}
          />
          {t('items.onlyGood', { n: GOOD })}
        </label>
      </div>
      {loading > 0 && <p className="muted">{t('items.loading', { n: loading })}</p>}
      {inventory.length === 0 ? (
        <p className="empty">{t('items.emptyInv')}</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>{t('col.item')}</th>
              <th className="num">{t('col.ideal')}</th>
              <th className="num">{t('col.quick')}</th>
              <th className="num">{t('col.ducats')}</th>
              <th>{t('col.sources')}</th>
              <th className="num">{t('col.pAny')}</th>
              <th>{t('col.tip')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const tp = tip(r);
              return (
                <tr key={r.slug}>
                  <td>
                    <a
                      href={`https://warframe.market/items/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title={t('market.open')}
                    >
                      {r.name}
                    </a>
                  </td>
                  <td className="num">{r.price ? <IdealPrice price={r.price} highlight={r.value >= GOOD} /> : '…'}</td>
                  <td className="num">{r.price?.buy != null ? `${r.price.buy} p` : '—'}</td>
                  <td className="num muted">{r.ducats || '—'}</td>
                  <td>
                    <div className="chips">
                      {r.sources.map((s) => (
                        <a
                          key={`${s.relic.id}|${s.refinement}`}
                          className={`chip t-${s.relic.tier.toLowerCase()}`}
                          href={s.relic.wiki}
                          target="_blank"
                          rel="noreferrer"
                          title={t('items.chanceTip', {
                            relic: s.relic.id,
                            ref: REFINEMENT_LABEL[s.refinement],
                            pct: fmt(s.chance * 100, 2),
                          })}
                        >
                          {s.relic.id}
                          {s.qty > 1 && ` ×${s.qty}`} <span className="dim">{fmt(s.chance * 100, 0)}%</span>
                        </a>
                      ))}
                    </div>
                  </td>
                  <td className="num">{fmt(r.pAny * 100, 0)}%</td>
                  <td>
                    <span className={`action ${tp.cls}`}>{t(tp.key)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="muted small">{t('items.note')}</p>
    </div>
  );
}
