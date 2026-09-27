import { Fragment, useMemo, useState } from 'react';
import { REFINEMENT_LABEL, evByRefinement, type Action, type Refinement } from '../../../shared/calc';
import type { InventoryEntry, PricesResponse, RelicInfo } from '../../../shared/types';
import { analyze, fmt, hasAllPrices, priceOf, rewardRows, type Analysis, type Settings } from '../model';
import ItemsToSell from './ItemsToSell';
import IdealPrice from './IdealPrice';
import { useI18n } from '../i18n';

interface Props {
  relics: RelicInfo[];
  relicMap: Map<string, RelicInfo>;
  inventory: InventoryEntry[];
  prices: PricesResponse;
  settings: Settings;
  busy: boolean;
  fetchPrices: (ids: string[], opts?: { force?: boolean; withRelics?: boolean }) => Promise<void>;
  goToPrints: () => void;
}

const FARM_TIERS = new Set(['Lith', 'Meso', 'Neo', 'Axi']);

function rarity(introChance: number) {
  if (introChance <= 0.03) return 'rare' as const;
  if (introChance <= 0.12) return 'uncommon' as const;
  return 'common' as const;
}

function ActionBadge({ action }: { action: Action }) {
  const { t } = useI18n();
  if (action.kind === 'sell')
    return (
      <span className="action sell" title={t('action.sellTip')}>
        {t('action.sell', { p: fmt(action.price, 0) })}
      </span>
    );
  if (action.kind === 'upgrade')
    return (
      <span className={`action up ref-${action.to}`} title={`${action.traces} traces`}>
        {t('action.upgrade', { ref: REFINEMENT_LABEL[action.to], gain: fmt(action.gain) })}{' '}
        <span className="dim">{t('action.perTrace', { v: fmt(action.platPerTrace * 100) })}</span>
      </span>
    );
  return <span className="action open">{t('action.open', { ref: REFINEMENT_LABEL[action.refinement] })}</span>;
}

function RewardsTable({
  relic,
  current,
  prices,
  settings,
}: {
  relic: RelicInfo;
  current: Refinement;
  prices: PricesResponse;
  settings: Settings;
}) {
  const { t } = useI18n();
  const rows = [...relic.rewards].sort((a, b) => a.chances.intact - b.chances.intact);
  return (
    <table className="grid inner">
      <thead>
        <tr>
          <th>{t('col.item')}</th>
          <th>{t('col.rarity')}</th>
          <th className="num">{t('col.chance', { ref: REFINEMENT_LABEL[current] })}</th>
          <th className="num">{t('col.chance', { ref: 'Radiant' })}</th>
          <th className="num">{t('col.ideal')}</th>
          <th className="num">{t('col.quick')}</th>
          <th className="num">{t('col.ducats')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((rw) => {
          const p = rw.slug ? prices.items[rw.slug] : undefined;
          const rar = rarity(rw.chances.intact);
          const value = rw.slug ? priceOf(p, settings.priceField) : 0;
          return (
            <tr key={rw.name}>
              <td>
                {rw.slug ? (
                  <a href={`https://warframe.market/items/${rw.slug}`} target="_blank" rel="noreferrer">
                    {rw.name}
                  </a>
                ) : (
                  <span className="muted">
                    {rw.name} {t('reward.untradeable')}
                  </span>
                )}
              </td>
              <td>
                <span className={`rar ${rar}`}>{t(`rarity.${rar}`)}</span>
              </td>
              <td className="num">{fmt(rw.chances[current] * 100, 2)}%</td>
              <td className="num">{fmt(rw.chances.radiant * 100, 2)}%</td>
              <td className="num">{rw.slug ? <IdealPrice price={p} highlight={value >= 20} /> : '—'}</td>
              <td className="num">{p?.buy != null ? `${p.buy} p` : '—'}</td>
              <td className="num muted">{rw.ducats || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BestItem({ relic, prices, settings }: { relic: RelicInfo; prices: PricesResponse; settings: Settings }) {
  let best: { name: string; value: number } | null = null;
  for (const rw of relic.rewards) {
    const v = rw.slug ? priceOf(prices.items[rw.slug], settings.priceField) : 0;
    if (!best || v > best.value) best = { name: rw.name, value: v };
  }
  if (!best) return null;
  return (
    <span className="best-item">
      {best.name} <span className={best.value >= 15 ? 'plat' : 'muted'}>{fmt(best.value, 0)} p</span>
    </span>
  );
}

function RelicName({ relic }: { relic: RelicInfo }) {
  const { t } = useI18n();
  return (
    <>
      <a
        className={`tier t-${relic.tier.toLowerCase()}`}
        href={relic.wiki}
        target="_blank"
        rel="noreferrer"
        title={t('relic.wikiTip')}
      >
        {relic.id}
      </a>
      {relic.vaulted ? (
        <span className="badge vaulted">{t('badge.vaulted')}</span>
      ) : (
        <span className="badge farm">{t('badge.farmable')}</span>
      )}
    </>
  );
}

export default function Ranking({
  relics,
  relicMap,
  inventory,
  prices,
  settings,
  busy,
  fetchPrices,
  goToPrints,
}: Props) {
  const { t } = useI18n();
  const [view, setView] = useState<'items' | 'mine' | 'farm'>('items');
  const [open, setOpen] = useState<string | null>(null);

  const mine = useMemo(() => {
    const out: Analysis[] = [];
    for (const e of inventory) {
      const r = relicMap.get(e.relic);
      if (!r || !hasAllPrices(r, prices)) continue;
      out.push(analyze(r, e.refinement, e.qty, prices, settings));
    }
    return out.sort((a, b) => b.rec.bestValue - a.rec.bestValue);
  }, [inventory, relicMap, prices, settings]);

  const pending = inventory.filter((e) => {
    const r = relicMap.get(e.relic);
    return r && !hasAllPrices(r, prices);
  }).length;

  const farmable = useMemo(() => relics.filter((r) => !r.vaulted && FARM_TIERS.has(r.tier)), [relics]);
  const farm = useMemo(
    () =>
      farmable
        .filter((r) => hasAllPrices(r, prices))
        .map((r) => {
          const rows = rewardRows(r, prices, settings.priceField);
          const ev = evByRefinement(rows, settings.mode);
          const bi = rows.reduce((best, row, i) => (row.value > rows[best].value ? i : best), 0);
          return { relic: r, ev, best: r.rewards[bi], bestValue: rows[bi].value };
        })
        .sort((a, b) => b.ev.radiant - a.ev.radiant),
    [farmable, prices, settings],
  );
  const farmMissing = farmable.length - farm.length;

  const total = mine.reduce((s, a) => s + a.rec.bestValue * a.qty, 0);
  const copies = mine.reduce((s, a) => s + a.qty, 0);

  return (
    <section className="stack">
      <div className="seg view-switch">
        <button className={view === 'items' ? 'on' : ''} onClick={() => setView('items')}>
          {t('view.items')}
        </button>
        <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>
          {t('view.mine')}
        </button>
        <button className={view === 'farm' ? 'on' : ''} onClick={() => setView('farm')}>
          {t('view.farm')}
        </button>
      </div>

      {view === 'items' && (
        <ItemsToSell relicMap={relicMap} inventory={inventory} prices={prices} settings={settings} />
      )}

      {view === 'mine' && (
        <div className="card">
          {inventory.length === 0 ? (
            <div className="empty">
              {t('mine.empty')}
              <button className="primary" onClick={goToPrints}>
                {t('mine.sendPrints')}
              </button>
            </div>
          ) : (
            <>
              <div className="stats">
                <div>
                  <span className="label">{t('stat.invValue')}</span>
                  <strong className="plat">{fmt(total, 0)} p</strong>
                </div>
                <div>
                  <span className="label">{t('stat.analyzed')}</span>
                  <strong>{copies}</strong>
                </div>
                <div>
                  <span className="label">{t('stat.toUpgrade')}</span>
                  <strong>{mine.filter((a) => a.rec.action.kind === 'upgrade').reduce((s, a) => s + a.qty, 0)}</strong>
                </div>
                <div>
                  <span className="label">{t('stat.toSell')}</span>
                  <strong>{mine.filter((a) => a.rec.action.kind === 'sell').reduce((s, a) => s + a.qty, 0)}</strong>
                </div>
              </div>
              {pending > 0 && (
                <p className="muted">{busy ? t('mine.fetching', { n: pending }) : t('mine.noPrice', { n: pending })}</p>
              )}
              <table className="grid ranking">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('col.relic')}</th>
                    <th>{t('col.have')}</th>
                    <th className="num">{t('col.evIntact')}</th>
                    <th className="num">{t('col.evRadiant')}</th>
                    <th>{t('col.bestItem')}</th>
                    <th>{t('col.recommendation')}</th>
                    <th className="num">{t('col.unitValue')}</th>
                    <th className="num">{t('col.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((a, i) => {
                    const key = `${a.relic.id}|${a.refinement}`;
                    const isOpen = open === key;
                    return (
                      <Fragment key={key}>
                        <tr className="clickable" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}>
                          <td className="muted">{i + 1}</td>
                          <td onClick={(e) => (e.target as HTMLElement).tagName === 'A' && e.stopPropagation()}>
                            <span className="caret">{isOpen ? '▾' : '▸'}</span> <RelicName relic={a.relic} />
                          </td>
                          <td>
                            <span className={`ref-${a.refinement}`}>{REFINEMENT_LABEL[a.refinement]}</span> ×{a.qty}
                          </td>
                          <td className="num">{fmt(a.rec.ev.intact)}</td>
                          <td className="num">{fmt(a.rec.ev.radiant)}</td>
                          <td>
                            <BestItem relic={a.relic} prices={prices} settings={settings} />
                          </td>
                          <td>
                            <ActionBadge action={a.rec.action} />
                          </td>
                          <td className="num">{fmt(a.rec.bestValue)} p</td>
                          <td className="num plat">{fmt(a.rec.bestValue * a.qty, 0)} p</td>
                        </tr>
                        {isOpen && (
                          <tr className="detail">
                            <td colSpan={9}>
                              <RewardsTable
                                relic={a.relic}
                                current={a.refinement}
                                prices={prices}
                                settings={settings}
                              />
                              {a.relicPrice != null && (
                                <p className="muted small">
                                  {t('mine.relicMarket', { ref: REFINEMENT_LABEL[a.refinement], p: fmt(a.relicPrice) })}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted small">
                {t('mine.evNote', { mode: settings.mode === 'duo' ? t('mode.duo') : t('mode.solo') })}
              </p>
            </>
          )}
        </div>
      )}

      {view === 'farm' && (
        <div className="card">
          <div className="row-between">
            <div>
              <h2>{t('farm.title')}</h2>
              <p className="muted">{t('farm.desc', { n: farmable.length })}</p>
            </div>
            {farmMissing > 0 && (
              <button className="primary" disabled={busy} onClick={() => fetchPrices(farmable.map((r) => r.id))}>
                {busy ? t('farm.fetching') : t('farm.fetch', { n: farmMissing })}
              </button>
            )}
          </div>
          {farm.length === 0 ? (
            <p className="empty">{t('farm.hint')}</p>
          ) : (
            <table className="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('col.relic')}</th>
                  <th className="num">{t('col.evIntact')}</th>
                  <th className="num">{t('col.evRadiant')}</th>
                  <th className="num">{t('col.gainUpgrading')}</th>
                  <th>{t('col.bestDrop')}</th>
                </tr>
              </thead>
              <tbody>
                {farm.map((f, i) => {
                  const key = `farm|${f.relic.id}`;
                  const isOpen = open === key;
                  return (
                    <Fragment key={key}>
                      <tr className="clickable" onClick={() => setOpen(isOpen ? null : key)}>
                        <td className="muted">{i + 1}</td>
                        <td onClick={(e) => (e.target as HTMLElement).tagName === 'A' && e.stopPropagation()}>
                          <span className="caret">{isOpen ? '▾' : '▸'}</span> <RelicName relic={f.relic} />
                        </td>
                        <td className="num">{fmt(f.ev.intact)}</td>
                        <td className="num plat">{fmt(f.ev.radiant)}</td>
                        <td className="num">+{fmt(f.ev.radiant - f.ev.intact)}</td>
                        <td>
                          {f.best.name} <span className="muted">({fmt(f.bestValue, 0)} p)</span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="detail">
                          <td colSpan={6}>
                            <RewardsTable relic={f.relic} current="intact" prices={prices} settings={settings} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
