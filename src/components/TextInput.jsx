import { MAX_CHARS } from '../constants/languages';

export default function TextInput({
  value,
  onChange,
  onClear,
  charCount = 0,
  wordCount = 0,
  isOver = false,
}) {
  const fill = Math.min(100, (charCount / MAX_CHARS) * 100);

  return (
    <div>
      <label className="field-label" htmlFor="tts-text">
        Your text
      </label>

      <div className={isOver ? 'input-shell over' : 'input-shell'}>
        <textarea
          id="tts-text"
          placeholder="Paste or type the text you want spoken aloud…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="meta-row">
          <span className="count">
            <strong>{charCount}</strong> characters
          </span>
          <span className="count">
            <strong>{wordCount}</strong> words
          </span>
          <span className={isOver ? 'limit over' : 'limit'}>
            <span className="limit-bar" aria-hidden="true">
              <span style={{ width: `${fill}%` }} />
            </span>
            {charCount} / {MAX_CHARS}
          </span>
          <button type="button" className="link-btn" onClick={onClear} disabled={!value}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
