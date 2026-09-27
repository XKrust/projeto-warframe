import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REFINEMENTS, REFINEMENT_LABEL, type Refinement } from '../../../shared/calc';
import type { InventoryEntry, RelicInfo } from '../../../shared/types';
import { readRelicsFromImage } from '../ocr';
import { useI18n } from '../i18n';

interface Props {
  relics: RelicInfo[];
  onAdd: (entries: InventoryEntry[]) => void;
  onReplace: (entries: InventoryEntry[]) => void;
}

interface Staged {
  key: number;
  relic: string;
  refinement: Refinement;
  uncertain: boolean; // nome corrigido por aproximação
  qty: number;
  qtyGuess: boolean; // OCR não leu a quantidade
  raw: string;
}

interface Shot {
  id: number;
  name: string;
  url: string;
  status: 'wait' | 'run' | 'ok' | 'fail';
  progress: number;
  found: number;
}

let nextKey = 1;

export default function UploadPrints({ relics, onAdd, onReplace }: Props) {
  const { t } = useI18n();
  const [shots, setShots] = useState<Shot[]>([]);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rawText, setRawText] = useState('');
  const known = useMemo(() => relics.map((r) => r.id), [relics]);

  // Fila: dá pra mandar mais prints enquanto os anteriores ainda estão sendo lidos.
  const queue = useRef<{ id: number; file: File }[]>([]);
  const running = useRef(false);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    while (queue.current.length) {
      const { id, file } = queue.current.shift()!;
      const patch = (p: Partial<Shot>) => setShots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));
      patch({ status: 'run' });
      try {
        const res = await readRelicsFromImage(file, known, (p) => patch({ progress: p }));
        setRawText((t) => (t ? t + '\n\n' : '') + `== ${file.name || 'print'} ==\n` + res.text);
        setStaged((st) => {
          const out = [...st];
          for (const p of res.relics) {
            const refinement = p.refinement ?? 'intact';
            // Prints sobrepostos mostram o mesmo tile: não soma, fica a maior quantidade lida.
            const i = out.findIndex((x) => x.raw !== 'manual' && x.relic === p.relic && x.refinement === refinement);
            if (i >= 0) {
              if (p.qtyRead && (out[i].qtyGuess || p.qty > out[i].qty))
                out[i] = { ...out[i], qty: p.qty, qtyGuess: false };
              continue;
            }
            out.push({
              key: nextKey++,
              relic: p.relic,
              refinement, // sem nada escrito no print = Intact
              uncertain: !!p.uncertain,
              qty: p.qty,
              qtyGuess: !p.qtyRead,
              raw: p.raw,
            });
          }
          return out;
        });
        patch({ status: 'ok', progress: 1, found: res.relics.length });
      } catch (e) {
        console.error(e);
        patch({ status: 'fail' });
      }
    }
    running.current = false;
    setBusy(false);
  }, [known]);

  const handleFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;
      const added = images.map((file) => ({ id: nextKey++, file }));
      setShots((s) => [
        ...s,
        ...added.map(({ id, file }) => ({
          id,
          name: file.name || t('prints.pasted'),
          url: URL.createObjectURL(file),
          status: 'wait' as const,
          progress: 0,
          found: 0,
        })),
      ]);
      queue.current.push(...added);
      pump();
    },
    [pump, t],
  );

  // Ctrl+V com print na área de transferência
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) handleFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFiles]);

  const update = (key: number, patch: Partial<Staged>) =>
    setStaged((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const entries = (): InventoryEntry[] => {
    const map = new Map<string, InventoryEntry>();
    for (const s of staged) {
      if (!known.includes(s.relic)) continue;
      const k = `${s.relic}|${s.refinement}`;
      const cur = map.get(k);
      if (cur) cur.qty += s.qty;
      else map.set(k, { relic: s.relic, refinement: s.refinement, qty: s.qty });
    }
    return [...map.values()];
  };

  return (
    <section className="stack">
      <div className="card">
        <h2>{t('prints.title')}</h2>
        <p className="muted">
          {t('prints.help1')} <kbd>Ctrl</kbd>+<kbd>V</kbd>. {t('prints.help2')}
        </p>
        <label
          className={`drop ${dragging ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles([...e.dataTransfer.files]);
          }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              handleFiles([...(e.target.files ?? [])]);
              e.target.value = ''; // permite escolher o mesmo arquivo de novo
            }}
          />
          <span className="big">⇪</span>
          <span>{t('prints.drop')}</span>
        </label>

        {shots.length > 0 && (
          <div className="shots">
            {shots.map((s) => (
              <figure key={s.id} className={`shot ${s.status}`}>
                <img src={s.url} alt={s.name} />
                <figcaption>
                  {s.status === 'wait' && t('prints.wait')}
                  {s.status === 'run' && t('prints.run', { pct: Math.round(s.progress * 100) })}
                  {s.status === 'ok' && t('prints.ok', { n: s.found })}
                  {s.status === 'fail' && t('prints.fail')}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row-between">
          <h2>{t('prints.checkTitle')}</h2>
          <button
            className="ghost small"
            onClick={() =>
              setStaged((s) => [
                ...s,
                {
                  key: nextKey++,
                  relic: '',
                  refinement: 'intact',
                  uncertain: false,
                  qty: 1,
                  qtyGuess: false,
                  raw: 'manual',
                },
              ])
            }
          >
            {t('prints.addManual')}
          </button>
        </div>
        {staged.length === 0 ? (
          <p className="muted">{busy ? t('prints.reading') : t('prints.nothing')}</p>
        ) : (
          <>
            <datalist id="relic-ids">
              {known.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
            <table className="grid">
              <thead>
                <tr>
                  <th>{t('col.relic')}</th>
                  <th>{t('col.refinement')}</th>
                  <th className="num">{t('col.qty')}</th>
                  <th>{t('col.readText')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {staged.map((s) => {
                  const valid = known.includes(s.relic);
                  return (
                    <tr key={s.key} className={valid ? '' : 'invalid'}>
                      <td>
                        <input
                          list="relic-ids"
                          className={s.uncertain ? 'guess' : ''}
                          title={s.uncertain ? t('prints.uncertainTip') : undefined}
                          value={s.relic}
                          placeholder={t('prints.placeholder')}
                          onChange={(e) => update(s.key, { relic: e.target.value, uncertain: false })}
                        />
                      </td>
                      <td>
                        <select
                          value={s.refinement}
                          onChange={(e) => update(s.key, { refinement: e.target.value as Refinement })}
                        >
                          {REFINEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {REFINEMENT_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min={1}
                          className={`qty ${s.qtyGuess ? 'guess' : ''}`}
                          title={s.qtyGuess ? t('prints.qtyGuessTip') : undefined}
                          value={s.qty}
                          onChange={(e) =>
                            update(s.key, { qty: Math.max(1, Number(e.target.value) || 1), qtyGuess: false })
                          }
                        />
                      </td>
                      <td className="muted mono clip" title={s.raw}>
                        {s.raw}
                      </td>
                      <td>
                        <button
                          className="icon"
                          aria-label={t('common.remove')}
                          onClick={() => setStaged((x) => x.filter((y) => y.key !== s.key))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  onAdd(entries());
                  setStaged([]);
                }}
              >
                {t('prints.addToInv')}
              </button>
              <button
                className="ghost"
                disabled={busy}
                onClick={() => {
                  onReplace(entries());
                  setStaged([]);
                }}
              >
                {t('prints.replaceInv')}
              </button>
            </div>
          </>
        )}
        {rawText && (
          <details className="raw">
            <summary>{t('prints.raw')}</summary>
            <pre>{rawText}</pre>
          </details>
        )}
      </div>
    </section>
  );
}
