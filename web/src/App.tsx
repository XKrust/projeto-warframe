import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InventoryEntry, PricesResponse, RelicInfo } from '../../shared/types';
import { api } from './api';
import { DEFAULT_SETTINGS, type Settings } from './model';
import UploadPrints from './components/UploadPrints';
import InventoryTable from './components/InventoryTable';
import Ranking from './components/Ranking';
import TraceAdvisor from './components/TraceAdvisor';
import SettingsBar from './components/SettingsBar';
import LanguagePicker from './components/LanguagePicker';
import { useI18n } from './i18n';

type Tab = 'prints' | 'inventory' | 'ranking' | 'traces';

const TABS: Tab[] = ['prints', 'inventory', 'ranking', 'traces'];

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('settings') ?? '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface PriceProgress {
  done: number;
  total: number;
}

export default function App() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('prints');
  const [relics, setRelics] = useState<RelicInfo[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [prices, setPrices] = useState<PricesResponse>({ items: {}, relics: {} });
  const [progress, setProgress] = useState<PriceProgress | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  useEffect(() => {
    Promise.all([api.relics(), api.inventory()])
      .then(([r, inv]) => {
        setRelics(r);
        setInventory(inv);
        loaded.current = true;
        if (inv.length) setTab('ranking');
      })
      .catch((e) => setError(t('app.loadError', { msg: e.message })));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
    } catch {
      /* sem storage, tudo bem */
    }
  }, [settings]);

  const relicMap = useMemo(() => new Map(relics.map((r) => [r.id, r])), [relics]);

  const updateInventory = useCallback((inv: InventoryEntry[]) => {
    setInventory(inv);
    if (loaded.current) api.saveInventory(inv).catch((e) => setError(t('app.saveError', { msg: e.message })));
  }, []);

  /** Busca preços das peças (e opcionalmente das relíquias) em lotes pra mostrar progresso. */
  const fetchPrices = useCallback(
    async (ids: string[], opts: { force?: boolean; withRelics?: boolean } = {}) => {
      const current = pricesRef.current;
      const itemSet = new Set<string>();
      const relicSet = new Set<string>();
      for (const id of ids) {
        const r = relicMap.get(id);
        if (!r) continue;
        for (const rw of r.rewards) if (rw.slug && (opts.force || !current.items[rw.slug])) itemSet.add(rw.slug);
        if (opts.withRelics && r.slug && (opts.force || !current.relics[r.slug])) relicSet.add(r.slug);
      }
      const jobs: { items: string[]; relics: string[] }[] = [];
      const items = [...itemSet];
      const rs = [...relicSet];
      for (let i = 0; i < items.length; i += 12) jobs.push({ items: items.slice(i, i + 12), relics: [] });
      for (let i = 0; i < rs.length; i += 12) jobs.push({ items: [], relics: rs.slice(i, i + 12) });
      if (!jobs.length) return;

      const total = items.length + rs.length;
      let done = 0;
      setProgress({ done, total });
      try {
        for (const job of jobs) {
          const res = await api.prices(job.items, job.relics, !!opts.force);
          setPrices((p) => ({ items: { ...p.items, ...res.items }, relics: { ...p.relics, ...res.relics } }));
          done += job.items.length + job.relics.length;
          setProgress({ done, total });
        }
      } catch (e) {
        setError(t('app.pricesError', { msg: (e as Error).message }));
      } finally {
        setProgress(null);
      }
    },
    [relicMap],
  );

  const pricesAt = useMemo(() => {
    const times = Object.values(prices.items)
      .map((p) => p.updatedAt)
      .filter(Boolean);
    return times.length ? Math.min(...times) : null;
  }, [prices]);

  const ownedIds = useMemo(() => [...new Set(inventory.map((e) => e.relic))], [inventory]);

  useEffect(() => {
    if (relics.length && ownedIds.length) fetchPrices(ownedIds, { withRelics: true });
  }, [relics.length, ownedIds, fetchPrices]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">◈</span>
          <div>
            <h1>Relic Advisor</h1>
            <p className="sub">{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="top-right">
          <LanguagePicker />
          <nav className="tabs">
            {TABS.map((id) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {t(`tab.${id}`)}
                {id === 'inventory' && inventory.length > 0 && (
                  <span className="pill">{inventory.reduce((s, e) => s + e.qty, 0)}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error} <span className="muted">{t('app.closeHint')}</span>
        </div>
      )}

      {(tab === 'ranking' || tab === 'traces') && (
        <SettingsBar
          settings={settings}
          onChange={setSettings}
          progress={progress}
          onRefresh={() => fetchPrices(ownedIds, { force: true, withRelics: true })}
          pricesAt={pricesAt}
        />
      )}

      <main>
        {!relics.length && !error && <div className="empty">{t('app.loading')}</div>}
        {relics.length > 0 && (
          <div hidden={tab !== 'prints'}>
            <UploadPrints
              relics={relics}
              onAdd={(entries) => {
                const merged = inventory.map((e) => ({ ...e }));
                for (const e of entries) {
                  const cur = merged.find((m) => m.relic === e.relic && m.refinement === e.refinement);
                  if (cur) cur.qty += e.qty;
                  else merged.push({ ...e });
                }
                updateInventory(merged);
                setTab('ranking');
              }}
              onReplace={(entries) => {
                updateInventory(entries);
                setTab('ranking');
              }}
            />
          </div>
        )}
        {relics.length > 0 && tab === 'inventory' && (
          <InventoryTable relics={relics} relicMap={relicMap} inventory={inventory} onChange={updateInventory} />
        )}
        {relics.length > 0 && tab === 'ranking' && (
          <Ranking
            relics={relics}
            relicMap={relicMap}
            inventory={inventory}
            prices={prices}
            settings={settings}
            busy={!!progress}
            fetchPrices={fetchPrices}
            goToPrints={() => setTab('prints')}
          />
        )}
        {relics.length > 0 && tab === 'traces' && (
          <TraceAdvisor relicMap={relicMap} inventory={inventory} prices={prices} settings={settings} />
        )}
      </main>

      <footer>
        {t('footer.drops')} · {t('footer.prices')} · {t('footer.info')}{' '}
        <a href="https://wiki.warframe.com/w/Void_Relic" target="_blank" rel="noreferrer">
          Warframe Wiki
        </a>
      </footer>
    </div>
  );
}
