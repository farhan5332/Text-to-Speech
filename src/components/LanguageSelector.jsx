import Icon from './Icon';
import { LANGUAGES } from '../constants/languages';

const optionLabel = (lang) =>
  lang.native && !lang.label.startsWith(lang.native) ? `${lang.label} (${lang.native})` : lang.label;

export default function LanguageSelector({ value, onChange }) {
  const translates = !value.startsWith('en');

  return (
    <div className="field">
      <div className="label-row">
        <label className="field-label" htmlFor="tts-lang">Language &amp; accent</label>
        {translates && <span className="field-hint">Auto-translate on</span>}
      </div>
      <div className="select-shell">
        <Icon name="globe" size={18} className="select-icon" />
        <select id="tts-lang" value={value} onChange={(e) => onChange(e.target.value)}>
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{optionLabel(lang)}</option>
          ))}
        </select>
        <Icon name="chevron" size={18} className="select-chevron" />
      </div>
    </div>
  );
}
