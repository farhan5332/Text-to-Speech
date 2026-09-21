export default function VoiceSelector({
  voices = [],
  value,
  onChange,
  languageLabel,
  onPreview,
}) {
  const empty = voices.length === 0;

  return (
    <div>
      <div className="label-row">
        <label className="field-label" htmlFor="tts-voice">
          Voice
        </label>
        <button type="button" className="chip-btn" onClick={onPreview} disabled={empty}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" />
          </svg>
          Preview
        </button>
      </div>

      <div className="select-shell">
        <svg className="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
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
              <option key={`${voice.language}-${voice.name}`} value={voice.name}>
                {voice.name} · {voice.gender}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
