import { useState } from 'react';
import { REFINEMENTS, REFINEMENT_LABEL, type Refinement } from '../../../shared/calc';
import type { InventoryEntry, RelicInfo } from '../../../shared/types';
import { useI18n } from '../i18n';

interface Props {
  relics: RelicInfo[];
  relicMap: Map<string, RelicInfo>;
  inventory: InventoryEntry[];
  onChange: (inv: InventoryEntry[]) => void;
}

export default function InventoryTable({ relics, relicMap, inventory, onChange }: Props) {
  const { t } = useI18n();
  const [newRelic, setNewRelic] = useState('');
  const [newRef, setNewRef] = useState<Refinement>('intact');
  const [newQty, setNewQty] = useState(1);

  const set = (i: number, patch: Partial<InventoryEntry>) =>
    onChange(inventory.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const add = () => {
    if (!relicMap.has(newRelic)) return;
    const i = inventory.findIndex((e) => e.relic === newRelic && e.refinement === newRef);
    if (i >= 0) set(i, { qty: inventory[i].qty + newQty });
    else onChange([...inventory, { relic: newRelic, refinement: newRef, qty: newQty }]);
    setNewRelic('');
    setNewQty(1);
  };

  return (
    <section className="card">
      <div className="row-between">
        <h2>{t('inv.title')}</h2>
        {inventory.length > 0 && (
          <button className="ghost small danger" onClick={() => confirm(t('inv.clearConfirm')) && onChange([])}>
            {t('inv.clearAll')}
          </button>
        )}
      </div>
      <p className="muted">{t('inv.saved')}</p>

      <datalist id="inv-relic-ids">
        {relics.map((r) => (
          <option key={r.id} value={r.id}>
            {r.vaulted ? 'vaulted' : t('inv.farmable')}
          </option>
        ))}
      </datalist>

      <div className="add-row">
        <input
          list="inv-relic-ids"
          placeholder={t('inv.placeholder')}
          value={newRelic}
          onChange={(e) => setNewRelic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <select value={newRef} onChange={(e) => setNewRef(e.target.value as Refinement)}>
          {REFINEMENTS.map((r) => (
            <option key={r} value={r}>
              {REFINEMENT_LABEL[r]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          className="qty"
          value={newQty}
          onChange={(e) => setNewQty(Math.max(1, Number(e.target.value) || 1))}
        />
        <button className="primary" disabled={!relicMap.has(newRelic)} onClick={add}>
          {t('inv.add')}
        </button>
      </div>

      {inventory.length === 0 ? (
        <p className="empty">{t('inv.empty')}</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>{t('col.relic')}</th>
              <th>{t('col.refinement')}</th>
              <th className="num">{t('col.qty')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {inventory.map((e, i) => {
              const r = relicMap.get(e.relic);
              return (
                <tr key={`${e.relic}|${e.refinement}|${i}`}>
                  <td>
                    <span className={`tier t-${r?.tier.toLowerCase()}`}>{e.relic}</span>
                    {r?.vaulted && <span className="badge vaulted">{t('badge.vaulted')}</span>}
                  </td>
                  <td>
                    <select
                      value={e.refinement}
                      onChange={(ev) => set(i, { refinement: ev.target.value as Refinement })}
                    >
                      {REFINEMENTS.map((x) => (
                        <option key={x} value={x}>
                          {REFINEMENT_LABEL[x]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min={1}
                      className="qty"
                      value={e.qty}
                      onChange={(ev) => set(i, { qty: Math.max(1, Number(ev.target.value) || 1) })}
                    />
                  </td>
                  <td>
                    <button
                      className="icon"
                      aria-label={t('common.remove')}
                      onClick={() => onChange(inventory.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
