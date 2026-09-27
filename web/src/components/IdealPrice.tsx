import type { PriceSummary } from '../../../shared/types';
import { fmt } from '../model';
import { useI18n, type Key } from '../i18n';

function salesLabel(perDay: number | null, t: (k: Key, v?: Record<string, string | number>) => string) {
  if (perDay == null) return null;
  if (perDay === 0) return t('sales.none');
  if (perDay < 1) return t('sales.week', { n: fmt(perDay * 7, 0) });
  return t('sales.day', { n: fmt(perDay, 0) });
}

/** Célula "Preço ideal": o número pra anunciar + com que frequência o item vende. */
export default function IdealPrice({ price, highlight }: { price: PriceSummary | undefined; highlight?: boolean }) {
  const { t } = useI18n();
  const value = price?.ideal ?? price?.sell ?? null;
  if (value == null) return <span className="muted">—</span>;
  const sales = salesLabel(price?.soldPerDay ?? null, t);
  const title = [
    price?.soldPerDay ? t('ideal.basedOn') : t('ideal.noHistory'),
    price?.lowest != null ? t('ideal.cheapest', { p: price.lowest }) : null,
  ]
    .filter(Boolean)
    .join('\n');
  return (
    <span className="ideal" title={title}>
      <span className={highlight ? 'plat' : ''}>{fmt(value, 0)} p</span>
      {sales && <span className={`sales ${price?.soldPerDay === 0 ? 'slow' : ''}`}>{sales}</span>}
    </span>
  );
}
