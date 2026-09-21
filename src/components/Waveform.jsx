// A fixed, speech-like silhouette so the idle waveform reads as audio
// rather than a flat row of stubs.
const shape = (i, n) => {
  const t = i / (n - 1);
  const envelope = Math.sin(Math.PI * t) * 0.6 + 0.4;
  const ripple = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
  return Math.round(Math.max(18, envelope * ripple * 100));
};

// `progress` (0–100) lights up the bars already played.
export default function Waveform({ playing, progress = 0, bars = 30 }) {
  return (
    <div className={`wave${playing ? ' playing' : ''}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={(i / bars) * 100 < progress ? 'played' : ''}
          style={{
            '--h': `${shape(i, bars)}%`,
            '--t': i / (bars - 1),
            animationDelay: `${(i % 7) * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}
