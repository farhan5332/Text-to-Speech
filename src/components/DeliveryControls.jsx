const SPEAKING_RATES = [0.8, 1, 1.2, 1.5];

const formatRate = (rate) => `${rate.toFixed(1)}x`;
const formatPitch = (pitch) => `${pitch > 0 ? '+' : ''}${pitch}%`;

// Speed and pitch are sent to the voice engine, so they change the generated
// file itself — unlike the player's speed, which only changes playback.
export default function DeliveryControls({ rate, onRateChange, pitch, onPitchChange }) {
  // Map -50..50 onto the track fill so the filled part grows from the left.
  const fill = ((pitch + 50) / 100) * 100;

  return (
    <div className="delivery">
      <div className="field">
        <div className="label-row plain">
          <span className="field-name" id="speed-label">Speaking speed</span>
          <span className="field-value">{formatRate(rate)}</span>
        </div>
        <div className="segmented" role="group" aria-labelledby="speed-label">
          {SPEAKING_RATES.map((r) => (
            <button
              key={r}
              type="button"
              className={r === rate ? 'on' : ''}
              aria-pressed={r === rate}
              onClick={() => onRateChange(r)}
            >
              {formatRate(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="label-row plain">
          <label className="field-name" htmlFor="tts-pitch">Pitch</label>
          <span className="field-value">{formatPitch(pitch)}</span>
        </div>
        <input
          id="tts-pitch"
          type="range"
          className="range"
          min="-50"
          max="50"
          step="5"
          value={pitch}
          style={{ '--p': `${fill}%` }}
          onChange={(e) => onPitchChange(Number(e.target.value))}
          onDoubleClick={() => onPitchChange(0)}
          aria-valuetext={formatPitch(pitch)}
          title="Double-click to reset"
        />
        <div className="range-scale" aria-hidden="true">
          <span>Deeper</span><span>Natural</span><span>Higher</span>
        </div>
      </div>
    </div>
  );
}
