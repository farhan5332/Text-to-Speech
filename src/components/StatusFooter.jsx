const STATUS_TEXT = {
  ok: 'All systems operational',
  checking: 'Checking the speech service…',
  down: 'Speech service unreachable',
  browser: 'Browser speech mode',
};

export default function StatusFooter({ health }) {
  return (
    <footer className="statusbar">
      <div className="statusbar-inner">
        <ul className="status-facts">
          <li className={`status-${health.status}`}>
            <span className="status-dot" aria-hidden="true" />
            {STATUS_TEXT[health.status]}
          </li>
          {health.latency != null && (
            <li>Latency: <b>{health.latency}ms</b></li>
          )}
          <li>24 kHz neural MP3</li>
          {health.ttlMinutes != null && (
            <li>Clips auto-delete after {health.ttlMinutes} min</li>
          )}
        </ul>

        <ul className="shortcuts" aria-label="Keyboard shortcuts">
          <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> generate</li>
          <li><kbd>Space</kbd> play / pause</li>
          <li><kbd>←</kbd><kbd>→</kbd> skip 10s</li>
        </ul>
      </div>
    </footer>
  );
}
