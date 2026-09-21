import { useEffect, useState } from 'react';
import * as tts from '../services/ttsService';

const INTERVAL_MS = 60000;

// Polls GET /api/health and times the round trip, so the status bar reports
// what the API is actually doing rather than a fixed label.
export function useHealth() {
  const [health, setHealth] = useState({
    status: tts.USE_BACKEND ? 'checking' : 'browser',
    latency: null,
    ttlMinutes: null,
  });

  useEffect(() => {
    if (!tts.USE_BACKEND) return undefined;
    let cancelled = false;

    const check = async () => {
      const started = performance.now();
      try {
        const data = await tts.checkHealth();
        if (cancelled) return;
        setHealth({
          status: data.status === 'ok' ? 'ok' : 'down',
          latency: Math.round(performance.now() - started),
          ttlMinutes: data.audioTtlMinutes ?? null,
        });
      } catch {
        if (!cancelled) setHealth((h) => ({ ...h, status: 'down', latency: null }));
      }
    };

    check();
    const id = setInterval(check, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return health;
}
