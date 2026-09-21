import { useEffect, useRef, useState, useCallback } from 'react';
import Waveform from './Waveform';
import Icon from './Icon';
import DownloadButton from './DownloadButton';
import * as tts from '../services/ttsService';

function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatSize(bytes) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AudioPlayer({ job, onRegenerate, onDownload, onDuration, saving }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');

  const isRealAudio = !!job.audioUrl;

  // ── Real MP3 path: auto-play each new clip ──
  useEffect(() => {
    if (!isRealAudio) return;
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);
    setEnded(false);
    setError('');
    audio.volume = volume;
    audio.playbackRate = speed;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  // ── Browser fallback path (VITE_USE_BACKEND=false) ──
  useEffect(() => {
    if (isRealAudio) return;
    const words = job.text.trim().split(/\s+/).length;
    const secs = Math.max(2, (words / 155) * 60 / (job.rate || 1));
    onDuration?.(job.id, secs);
    setDuration(secs);
    setElapsed(0);
    setLoading(false);
    setIsPlaying(true);
    let e = 0;
    tts.speak({
      text: job.text, voice: job.voice, volume, rate: job.rate, pitch: job.pitch,
      onEnd: () => setIsPlaying(false),
    });
    const id = setInterval(() => {
      e += 0.1;
      setElapsed(e);
      if (e >= secs) { clearInterval(id); setIsPlaying(false); }
    }, 100);
    return () => { clearInterval(id); tts.cancelBrowser(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const togglePlay = useCallback(() => {
    if (isRealAudio) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) { audio.play(); setIsPlaying(true); setEnded(false); }
      else { audio.pause(); setIsPlaying(false); }
    } else if (isPlaying) {
      tts.pauseBrowser(); setIsPlaying(false);
    } else {
      tts.resumeBrowser(); setIsPlaying(true);
    }
  }, [isRealAudio, isPlaying]);

  const skip = useCallback((secs) => {
    if (!isRealAudio || !audioRef.current) return;
    const a = audioRef.current;
    a.currentTime = Math.min(Math.max(0, a.currentTime + secs), duration || 0);
  }, [isRealAudio, duration]);

  const handleSeek = (percent) => {
    if (isRealAudio && audioRef.current && duration) {
      audioRef.current.currentTime = (percent / 100) * duration;
    } else {
      setElapsed((percent / 100) * duration);
    }
  };

  const handleVolume = (val) => {
    setVolume(val);
    if (isRealAudio && audioRef.current) audioRef.current.volume = val;
  };

  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (isRealAudio && audioRef.current) audioRef.current.playbackRate = next;
  };

  const replay = () => {
    if (isRealAudio && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      setEnded(false);
    }
  };

  // ── Keyboard shortcuts: space = play/pause, arrows = seek ──
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') skip(10);
      else if (e.code === 'ArrowLeft') skip(-10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip]);

  const progress = duration ? (elapsed / duration) * 100 : 0;
  const state = error ? 'error' : loading ? 'loading' : ended ? 'done' : isPlaying ? 'playing' : 'ready';
  const stateLabel = { error: 'Error', loading: 'Loading…', done: 'Finished', playing: 'Playing', ready: 'Ready' }[state];
  const meta = [isRealAudio ? 'MP3' : 'Browser voice', formatSize(job.sizeBytes)].filter(Boolean).join(' · ');

  return (
    <section className="card player-card" aria-live="polite">
      <div className="player-head">
        <span className="card-title">
          <span className={`live-dot${isPlaying ? ' on' : ''}`} aria-hidden="true" />
          Generated audio
        </span>
        <span className="player-head-end">
          <span className={`status-badge is-${state}`}>
            {state === 'done' && <Icon name="check" size={13} strokeWidth={3} />}
            {stateLabel}
          </span>
          <span className="player-meta">{meta}</span>
        </span>
      </div>

      {/* dir="auto" lets Urdu and Arabic lay out right-to-left on their own. */}
      {job.translated && job.spokenText && (
        <div className="spoken">
          <span className="spoken-label">
            <Icon name="translate" size={14} />
            Translated &amp; spoken as ({job.languageLabel}):
          </span>
          <p lang={job.language} dir="auto">{job.spokenText}</p>
        </div>
      )}

      {isRealAudio && (
        <audio
          ref={audioRef}
          src={job.audioUrl}
          preload="auto"
          onLoadedMetadata={(e) => {
            setDuration(e.target.duration);
            setLoading(false);
            onDuration?.(job.id, e.target.duration);
          }}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
          onEnded={() => { setIsPlaying(false); setEnded(true); }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => { setError('Could not load this audio. It may have expired — try regenerating.'); setLoading(false); }}
          hidden
        />
      )}

      <div className="scope">
        <Waveform playing={isPlaying} progress={progress} />
        <input type="range" className="range seek" min="0" max="100" step="0.1" value={progress}
               style={{ '--p': `${progress}%` }}
               onChange={(e) => handleSeek(Number(e.target.value))} aria-label="Seek"
               disabled={!!error} />
        <div className="time">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {error ? (
        <p className="player-error"><Icon name="alert" size={15} /> {error}</p>
      ) : (
        <div className="transport">
          <button type="button" className="play-btn" onClick={ended ? replay : togglePlay}
                  aria-label={ended ? 'Replay' : isPlaying ? 'Pause' : 'Play'}>
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Icon name={ended ? 'refresh' : isPlaying ? 'pause' : 'play'} size={16} strokeWidth={2.6} />
            )}
          </button>

          {isRealAudio && (
            <>
              <button type="button" className="pill" onClick={() => skip(-10)} aria-label="Back 10 seconds">« 10s</button>
              <button type="button" className="pill on" onClick={changeSpeed} aria-label="Playback speed">{Number.isInteger(speed) ? speed.toFixed(1) : speed}x</button>
              <button type="button" className="pill" onClick={() => skip(10)} aria-label="Forward 10 seconds">10s »</button>
            </>
          )}

          <div className="vol">
            <Icon name="volume" size={18} />
            <input type="range" className="range" min="0" max="100" value={volume * 100}
                   style={{ '--p': `${volume * 100}%` }}
                   onChange={(e) => handleVolume(Number(e.target.value) / 100)} aria-label="Volume" />
          </div>
        </div>
      )}

      <div className="player-actions">
        <DownloadButton onDownload={onDownload} saving={saving} />
        <button type="button" className="big-btn" onClick={onRegenerate}>
          <Icon name="refresh" size={18} className="big-btn-icon" />
          Regenerate
        </button>
      </div>
    </section>
  );
}
