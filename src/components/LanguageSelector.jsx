import { LANGUAGES } from '../constants/languages';

export default function LanguageSelector({ value, onChange }) {
  return (
    <div>
      <div className="label-row">
        <label className="field-label" htmlFor="tts-lang">
          Language
        </label>
      </div>
      <div className="select-shell">
        <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <select
          id="tts-lang"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
