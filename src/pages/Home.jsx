import { useEffect, useRef, useState } from 'react';
import Brand from '../components/Brand';
import TextInput from '../components/TextInput';
import LanguageSelector from '../components/LanguageSelector';
import VoiceSelector from '../components/VoiceSelector';
import DeliveryControls from '../components/DeliveryControls';
import GenerateButton from '../components/GenerateButton';
import ErrorMessage from '../components/ErrorMessage';
import AudioPlayer from '../components/AudioPlayer';
import StudioHistory from '../components/StudioHistory';
import StatusFooter from '../components/StatusFooter';
import { DEFAULT_LANGUAGE, LANGUAGES, findLanguage } from '../constants/languages';
import { validateText } from '../utils/validateText';
import { useVoices } from '../hooks/useVoices';
import { useHealth } from '../hooks/useHealth';
import { useTheme } from '../hooks/useTheme';
import * as tts from '../services/ttsService';

const HISTORY_LIMIT = 20;

const clip = (text, max) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);
const titleFrom = (text) => clip(text.trim().split(/\s+/).slice(0, 4).join(' '), 32);

export default function Home() {
  const [text, setText] = useState('');
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | ready
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);
  const health = useHealth();
  const { theme, toggle: toggleTheme } = useTheme();

  // findLanguage falls back to the first entry, so an unknown code can never
  // leave `language` undefined and crash the render.
  const language = findLanguage(languageCode);
  // Voices are matched on the full code ("en-US"), so picking English (UK)
  // cannot offer a US voice the backend would then reject.
  const {
    voices,
    voiceName,
    choose,
    selectedVoice,
    error: voicesError,
    retry: retryVoices,
  } = useVoices(language.code.toLowerCase());
  // An empty string would be rejected as an unknown voice; omitting it lets the
  // server fall back to the language's default voice.
  const voiceParam = voiceName || undefined;

  const validation = validateText(text);
  const errorMessage = requestError || (validation.isOver ? validation.error : '');
  const canGenerate = validation.valid && status !== 'loading';

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const previewVoice = async () => {
    try {
      if (tts.USE_BACKEND) {
        const result = await tts.generateSpeech({
          text: 'This is how this voice sounds.',
          language: languageCode,
          voice: voiceParam,
          rate,
          pitch,
        });
        new Audio(result.audioUrl).play();
      } else {
        tts.speak({ text: 'This is how this voice sounds.', voice: selectedVoice, rate, pitch });
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!validation.valid || status === 'loading') return;
    setRequestError('');
    setStatus('loading');
    try {
      let next;
      if (tts.USE_BACKEND) {
        const result = await tts.generateSpeech({
          text,
          language: languageCode,
          voice: voiceParam,
          rate,
          pitch,
        });
        next = {
          audioUrl: result.audioUrl,
          fileName: result.fileName,
          id: result.fileName,
          sizeBytes: result.sizeBytes,
          spokenText: result.spokenText,
          translated: result.translated,
          language: result.language,
          languageLabel: findLanguage(result.language).label,
        };
      } else {
        next = { text, voice: selectedVoice, rate, pitch, id: Date.now() };
      }
      setJob(next);
      setHistory((items) => [
        {
          id: next.id,
          job: next,
          voice: voiceName || language.voices[0].label,
          title: titleFrom(text),
          snippet: clip(next.spokenText || text, 60),
          language: next.language || languageCode,
          createdAt: Date.now(),
          duration: null,
        },
        ...items,
      ].slice(0, HISTORY_LIMIT));
      setStatus('ready');
    } catch (err) {
      setRequestError(err.message || 'Failed to generate speech.');
      setStatus(job ? 'ready' : 'idle');
    }
  };

  // Ctrl/Cmd + Enter generates from anywhere, including inside the text box.
  const generateRef = useRef(handleGenerate);
  useEffect(() => {
    generateRef.current = handleGenerate;
  });
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleDuration = (id, duration) => {
    setHistory((items) => items.map((it) => (it.id === id && !it.duration ? { ...it, duration } : it)));
  };

  const playFromHistory = (item) => {
    setRequestError('');
    setJob(item.job);
    setStatus('ready');
  };

  const handleClear = () => {
    setText('');
    setRequestError('');
    tts.cancelBrowser();
  };

  const handlePaste = async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted) {
        showToast('Your clipboard is empty.');
        return;
      }
      setText((current) => (current ? `${current.trimEnd()} ${pasted}` : pasted));
    } catch {
      showToast('Clipboard access was blocked — press Ctrl+V in the text box instead.');
    }
  };

  const handleDownload = async () => {
    if (!job?.audioUrl) {
      showToast('Download is available in backend mode.');
      return;
    }

    setSaving(true);
    try {
      // The clip lives on the API origin, and browsers ignore the `download`
      // attribute across origins — so pull the bytes in and save them locally.
      const blob = await tts.fetchAudioBlob(job.audioUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.fileName || 'speech.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Saved to your downloads.');
    } catch {
      showToast('Could not download that clip. Try generating it again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <Brand health={health} theme={theme} onToggleTheme={toggleTheme} />

      <div className="layout">
        <main className="composer">
          <span className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Natural neural voices • {LANGUAGES.length} languages • auto-translate
          </span>
          <h1>
            Turn your words into <span className="grad">a voice.</span>
          </h1>
          <p className="lede">
            Type or paste below, choose a language, voice, speed and pitch, and
            generate studio-grade speech in seconds.
          </p>

          <TextInput
            value={text}
            onChange={setText}
            onClear={handleClear}
            onPaste={handlePaste}
            charCount={validation.charCount}
            wordCount={validation.wordCount}
            rate={rate}
            isOver={validation.isOver}
          />

          <section className="card settings" aria-label="Voice settings">
            <div className="selectors">
              <LanguageSelector value={languageCode} onChange={setLanguageCode} />
              <VoiceSelector
                voices={voices}
                value={voiceName}
                onChange={choose}
                languageLabel={language.label}
                onPreview={previewVoice}
              />
            </div>

            {voicesError && (
              <ErrorMessage
                message={`Voices could not be loaded. ${voicesError}`}
                onRetry={retryVoices}
              />
            )}

            <DeliveryControls
              rate={rate}
              onRateChange={setRate}
              pitch={pitch}
              onPitchChange={setPitch}
            />
          </section>

          <GenerateButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            loading={status === 'loading'}
          />

          <ErrorMessage message={errorMessage} />
          {!errorMessage && validation.warning && (
            <p className="warning">{validation.warning}</p>
          )}
        </main>

        <aside className="side" aria-label="Generated audio and history">
          {job ? (
            <AudioPlayer
              job={job}
              onRegenerate={handleGenerate}
              onDownload={handleDownload}
              onDuration={handleDuration}
              saving={saving}
            />
          ) : (
            <div className={`card output-empty${status === 'loading' ? ' is-loading' : ''}`}>
              <div className="output-empty-wave" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <p className="output-empty-title">
                {status === 'loading' ? 'Generating your audio…' : 'Your audio will appear here'}
              </p>
              <p className="output-empty-text">
                {status === 'loading'
                  ? 'This usually takes a few seconds.'
                  : 'Write a script, choose a voice, then press Generate Studio Speech.'}
              </p>
            </div>
          )}

          <StudioHistory items={history} activeId={job?.id} onPlay={playFromHistory} />
        </aside>
      </div>

      <StatusFooter health={health} />

      <div className={`toast${toast ? ' show' : ''}`} role="status">{toast}</div>
    </div>
  );
}
