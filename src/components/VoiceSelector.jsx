import Icon from './Icon';

export default function VoiceSelector({
  voices = [],
  value,
  onChange,
  languageLabel,
  onPreview,
}) {
  const empty = voices.length === 0;

  return (
    <div className="field">
      <div className="label-row">
        <label className="field-label" htmlFor="tts-voice">Voice persona</label>
        <button type="button" className="text-btn" onClick={onPreview} disabled={empty}>
          <Icon name="volume" size={15} />
          Preview sample
        </button>
      </div>

      <div className="select-shell">
        <Icon name="mic" size={18} className="select-icon" />
        <select
          id="tts-voice"
          value={value}
          disabled={empty}
          onChange={(event) => onChange(event.target.value)}
        >
          {empty ? (
            <option value="">No voices for {languageLabel}</option>
          ) : (
            voices.map((voice) => (
              <option key={`${voice.lang}-${voice.name}`} value={voice.name}>
                {voice.name} • {voice.gender}
              </option>
            ))
          )}
        </select>
        <Icon name="chevron" size={18} className="select-chevron" />
      </div>
    </div>
  );
}
