import { useEffect, useState } from 'react';
import Icon from './Icon';

const COLLAPSED = 4;

function timeAgo(then, now = Date.now()) {
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function formatLength(seconds) {
  if (!seconds) return '—';
  const s = Math.round(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Clips generated this session. Server copies expire, so older ones may no
// longer play; the player says so when that happens.
export default function StudioHistory({ items, activeId, onPlay }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Keep "5m ago" labels honest without re-rendering the whole page.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const shown = expanded ? items : items.slice(0, COLLAPSED);

  return (
    <section className="card history" aria-labelledby="history-title">
      <div className="history-head">
        <h2 className="card-title" id="history-title">
          <Icon name="clock" size={17} />
          Studio history
        </h2>
        {items.length > COLLAPSED && (
          <button type="button" className="text-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `View all (${items.length})`}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="history-empty">Clips you generate this session will be listed here.</p>
      ) : (
        <ul className="history-list">
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`history-item${item.id === activeId ? ' active' : ''}`}
                onClick={() => onPlay(item)}
                aria-label={`Play ${item.voice}: ${item.title}`}
              >
                <span className="history-play" aria-hidden="true">
                  <Icon name="play" size={13} />
                </span>
                <span className="history-body">
                  <span className="history-title">{item.voice} • {item.title}</span>
                  <span className="history-quote" lang={item.language} dir="auto">
                    “{item.snippet}”
                  </span>
                </span>
                <span className="history-side">
                  <span className="history-len">{formatLength(item.duration)}</span>
                  <span className={`history-when${now - item.createdAt < 60000 ? ' fresh' : ''}`}>
                    {timeAgo(item.createdAt, now)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
