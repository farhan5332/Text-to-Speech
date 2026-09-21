// A fixed, speech-like silhouette so the idle waveform reads as audio
// rather than a flat row of stubs.
const shape = (i, n) => {
  const t = i / (n - 1);
  const envelope = Math.sin(Math.PI * t) * 0.7 + 0.3;
  const ripple = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
  return Math.round(Math.max(12, envelope * ripple * 100));
};

export default function Waveform({ playing, bars = 48 }) {
  return (
    <div className={`wave${playing ? ' playing' : ''}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            '--h': `${shape(i, bars)}%`,
            '--t': i / (bars - 1),
            animationDelay: `${i * 0.045}s`,
          }}
        />
      ))}
    </div>
  );
}
