import type { PriceProgress } from '../App';
import type { Settings } from '../model';
import { useI18n } from '../i18n';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  progress: PriceProgress | null;
  onRefresh: () => void;
  pricesAt: number | null; // preço mais antigo em uso (ms)
}

export default function SettingsBar({ settings, onChange, progress, onRefresh, pricesAt }: Props) {
  const { t, locale } = useI18n();
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const ago = (ms: number) => {
    const min = Math.round((Date.now() - ms) / 60000);
    return min < 1 ? t('settings.now') : t('settings.minAgo', { n: min });
  };
  return (
    <div className="settings">
      <div className="seg" role="group" aria-label={t('settings.mode')}>
        <button className={settings.mode === 'solo' ? 'on' : ''} onClick={() => set({ mode: 'solo' })}>
          {t('settings.solo')}
        </button>
        <button className={settings.mode === 'duo' ? 'on' : ''} onClick={() => set({ mode: 'duo' })}>
          {t('settings.duo')}
        </button>
      </div>

      <div className="seg" role="group" aria-label={t('settings.price')}>
        <button
          className={settings.priceField === 'sell' ? 'on' : ''}
          onClick={() => set({ priceField: 'sell' })}
          title={t('settings.idealTip')}
        >
          {t('settings.ideal')}
        </button>
        <button
          className={settings.priceField === 'buy' ? 'on' : ''}
          onClick={() => set({ priceField: 'buy' })}
          title={t('settings.quickTip')}
        >
          {t('settings.quick')}
        </button>
      </div>

      <label className="field" title={t('settings.traceTip')}>
        {t('settings.traceWorth')}
        <input
          type="number"
          min={0}
          step={0.01}
          value={settings.traceValue}
          onChange={(e) => set({ traceValue: Math.max(0, Number(e.target.value) || 0) })}
        />
        plat
      </label>

      <div className="spacer" />

      {progress ? (
        <div className="progress" aria-live="polite">
          <div className="bar">
            <div style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <span>{t('settings.progress', { done: progress.done, total: progress.total })}</span>
        </div>
      ) : (
        <>
          {pricesAt && (
            <span className="muted small" title={t('settings.pricesAtTip')}>
              {t('settings.pricesAt', {
                time: new Date(pricesAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                ago: ago(pricesAt),
              })}
            </span>
          )}
          <button className="ghost" onClick={onRefresh}>
            {t('settings.refresh')}
          </button>
        </>
      )}
    </div>
  );
}
