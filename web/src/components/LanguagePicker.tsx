import { LANGS, useI18n, type Lang } from '../i18n';

// Bandeiras em SVG: no Windows, emoji de bandeira aparece só como as letras ("BR").
function Flag({ lang }: { lang: Lang }) {
  if (lang === 'pt')
    return (
      <svg viewBox="0 0 28 20" aria-hidden="true">
        <rect width="28" height="20" fill="#009c3b" />
        <path d="M14 2.5 25.5 10 14 17.5 2.5 10z" fill="#ffdf00" />
        <circle cx="14" cy="10" r="4.6" fill="#002776" />
        <path d="M9.6 9.2c3-.9 6.1-.5 8.8 1" stroke="#fff" strokeWidth="0.9" fill="none" />
      </svg>
    );
  if (lang === 'es')
    return (
      <svg viewBox="0 0 28 20" aria-hidden="true">
        <rect width="28" height="20" fill="#aa151b" />
        <rect y="5" width="28" height="10" fill="#f1bf00" />
      </svg>
    );
  // English: bandeira dos EUA simplificada
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="28" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="12" height={(20 / 13) * 7} fill="#3c3b6e" />
    </svg>
  );
}

export default function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="langs" role="group" aria-label={t('app.language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          className={lang === l.id ? 'on' : ''}
          onClick={() => setLang(l.id)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.id}
        >
          <Flag lang={l.id} />
        </button>
      ))}
    </div>
  );
}
