import { useEffect, useRef, useState, useCallback } from 'react';
import Waveform from './Waveform';
import DownloadButton from './DownloadButton';
import * as tts from '../services/ttsService';

function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ job, onRegenerate, onDownload, saving }) {
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
    const secs = Math.max(2, (words / 155) * 60);
    setDuration(secs);
    setElapsed(0);
    setLoading(false);
    setIsPlaying(true);
    let e = 0;
    tts.speak({ text: job.text, voice: job.voice, volume, onEnd: () => setIsPlaying(false) });
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

  return (
    <section className="result" aria-live="polite">
      <div className="result-head">
        <span className="title">
          <span className={`live-dot${isPlaying ? ' on' : ''}`} aria-hidden="true" />
          Generated audio
        </span>
        <span className={`badge${error ? ' is-error' : loading ? ' is-loading' : ''}`}>
          {error ? 'Error' : loading ? 'Loading…' : ended ? 'Finished' : 'Ready'}
        </span>
      </div>

      {/* dir="auto" lets Urdu and Arabic lay out right-to-left on their own. */}
      {job.translated && job.spokenText && (
        <p className="spoken" lang={job.language} dir="auto">
          <span>Translated, spoken as:</span> {job.spokenText}
        </p>
      )}

      {isRealAudio && (
        <audio
          ref={audioRef}
          src={job.audioUrl}
          preload="auto"
          onLoadedMetadata={(e) => { setDuration(e.target.duration); setLoading(false); }}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
          onEnded={() => { setIsPlaying(false); setEnded(true); }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => { setError('Could not load this audio. Try regenerating.'); setLoading(false); }}
          hidden
        />
      )}

      <Waveform playing={isPlaying} />

      {error ? (
        <p className="player-error">{error}</p>
      ) : (
        <>
          <div className="player">
            <button type="button" className="play-btn" onClick={ended ? replay : togglePlay}
                    aria-label={ended ? 'Replay' : isPlaying ? 'Pause' : 'Play'}>
              {loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : ended ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                </svg>
              ) : isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="track">
              <input type="range" className="seek" min="0" max="100" value={progress}
                     style={{ '--p': `${progress}%` }}
                     onChange={(e) => handleSeek(Number(e.target.value))} aria-label="Seek" />
              <div className="time">
                <span>{formatTime(elapsed)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="vol">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" />
              </svg>
              <input type="range" min="0" max="100" value={volume * 100}
                     style={{ '--p': `${volume * 100}%` }}
                     onChange={(e) => handleVolume(Number(e.target.value) / 100)} aria-label="Volume" />
            </div>
          </div>

          {isRealAudio && (
            <div className="transport">
              <button type="button" className="pill" onClick={() => skip(-10)} aria-label="Back 10 seconds">« 10s</button>
              <button type="button" className="pill speed" onClick={changeSpeed} aria-label="Playback speed">{speed}×</button>
              <button type="button" className="pill" onClick={() => skip(10)} aria-label="Forward 10 seconds">10s »</button>
            </div>
          )}
        </>
      )}

      <div className="result-actions">
        <DownloadButton onDownload={onDownload} saving={saving} />
        <button type="button" className="btn-ghost" onClick={onRegenerate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
          </svg>
          Regenerate
        </button>
      </div>
    </section>
  );
}