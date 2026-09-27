import { useMemo, useState } from 'react';
import { allocateTraces, REFINEMENT_LABEL, type Refinement, type TraceOption } from '../../../shared/calc';
import type { InventoryEntry, PricesResponse, RelicInfo } from '../../../shared/types';
import { fmt, hasAllPrices, traceGroups, type Settings } from '../model';
import { useI18n } from '../i18n';

interface Props {
  relicMap: Map<string, RelicInfo>;
  inventory: InventoryEntry[];
  prices: PricesResponse;
  settings: Settings;
}

const MAX_COPIES = 400;

export default function TraceAdvisor({ relicMap, inventory, prices, settings }: Props) {
  const { t } = useI18n();
  const [budget, setBudget] = useState(() => {
    try {
      return Number(localStorage.getItem('traces') ?? 500);
    } catch {
      return 500;
    }
  });

  const plan = useMemo(() => {
    const groups: TraceOption[][] = [];
    for (const e of inventory) {
      const r = relicMap.get(e.relic);
      if (!r || !hasAllPrices(r, prices) || e.refinement === 'radiant') continue;
      const opts = traceGroups(r, e.refinement, prices, settings);
      for (let i = 0; i < e.qty && groups.length < MAX_COPIES; i++) groups.push(opts);
    }
    return allocateTraces(groups, budget);
  }, [inventory, relicMap, prices, settings, budget]);

  // Junta cópias iguais: "Neo S5 Intact → Radiant ×3"
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { relic: string; from: Refinement; to: Refinement; count: number; cost: number; gain: number }
    >();
    for (const o of plan.chosen) {
      const [relic, from] = o.id.split('|') as [string, Refinement];
      const k = `${o.id}|${o.to}`;
      const cur = map.get(k);
      if (cur) {
        cur.count++;
        cur.cost += o.cost;
        cur.gain += o.gain;
      } else map.set(k, { relic, from, to: o.to, count: 1, cost: o.cost, gain: o.gain });
    }
    return [...map.values()].sort((a, b) => b.gain / b.cost - a.gain / a.cost);
  }, [plan]);

  return (
    <section className="card">
      <h2>{t('traces.title')}</h2>
      <p className="muted">
        {t('traces.desc', { mode: settings.mode === 'duo' ? t('traces.modeDuo') : t('mode.solo') })}
      </p>
      <label className="field big-field">
        {t('traces.have')}
        <input
          type="number"
          min={0}
          step={25}
          value={budget}
          onChange={(e) => {
            const v = Math.max(0, Number(e.target.value) || 0);
            setBudget(v);
            try {
              localStorage.setItem('traces', String(v));
            } catch {
              /* ok */
            }
          }}
        />
        Void Traces
      </label>

      {inventory.length === 0 ? (
        <p className="empty">{t('items.emptyInv')}</p>
      ) : rows.length === 0 ? (
        <p className="empty">{t('traces.none')}</p>
      ) : (
        <>
          <div className="stats">
            <div>
              <span className="label">{t('stat.gain')}</span>
              <strong className="plat">+{fmt(plan.gain)} p</strong>
            </div>
            <div>
              <span className="label">{t('stat.used')}</span>
              <strong>
                {plan.spent} / {budget}
              </strong>
            </div>
            <div>
              <span className="label">{t('stat.per100')}</span>
              <strong>{fmt((plan.gain / Math.max(plan.spent, 1)) * 100)} p</strong>
            </div>
          </div>
          <table className="grid">
            <thead>
              <tr>
                <th>{t('col.relic')}</th>
                <th>{t('col.upgrade')}</th>
                <th className="num">{t('col.copies')}</th>
                <th className="num">{t('col.traces')}</th>
                <th className="num">{t('col.gain')}</th>
                <th className="num">{t('col.per100')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.relic}|${r.from}|${r.to}`}>
                  <td>
                    <span className={`tier t-${relicMap.get(r.relic)?.tier.toLowerCase()}`}>{r.relic}</span>
                  </td>
                  <td>
                    {REFINEMENT_LABEL[r.from]} → <b className={`ref-${r.to}`}>{REFINEMENT_LABEL[r.to]}</b>
                  </td>
                  <td className="num">×{r.count}</td>
                  <td className="num">{r.cost}</td>
                  <td className="num plat">+{fmt(r.gain)} p</td>
                  <td className="num">{fmt((r.gain / r.cost) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
