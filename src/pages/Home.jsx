import { useRef, useState } from 'react';
import Brand from '../components/Brand';
import TextInput from '../components/TextInput';
import LanguageSelector from '../components/LanguageSelector';
import VoiceSelector from '../components/VoiceSelector';
import GenerateButton from '../components/GenerateButton';
import ErrorMessage from '../components/ErrorMessage';
import AudioPlayer from '../components/AudioPlayer';
import { DEFAULT_LANGUAGE, findLanguage } from '../constants/languages';
import { validateText } from '../utils/validateText';
import { useVoices } from '../hooks/useVoices';
import * as tts from '../services/ttsService';

export default function Home() {
  const [text, setText] = useState('');
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [status, setStatus] = useState('idle'); // idle | loading | ready
  const [job, setJob] = useState(null);
  const [requestError, setRequestError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);

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
        });
        new Audio(result.audioUrl).play();
      } else {
        tts.speak({ text: 'This is how this voice sounds.', voice: selectedVoice });
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!validation.valid) return;
    setRequestError('');
    setStatus('loading');
    try {
      if (tts.USE_BACKEND) {
        const result = await tts.generateSpeech({
          text,
          language: languageCode,
          voice: voiceParam,
        });
        setJob({
          audioUrl: result.audioUrl,
          fileName: result.fileName,
          id: result.fileName,
          spokenText: result.spokenText,
          translated: result.translated,
          language: result.language,
        });
      } else {
        setJob({ text, voice: selectedVoice, id: Date.now() });
      }
      setStatus('ready');
    } catch (err) {
      setRequestError(err.message || 'Failed to generate speech.');
      setStatus('idle');
    }
  };

  const handleClear = () => {
    setText('');
    setRequestError('');
    setStatus('idle');
    setJob(null);
    tts.cancelBrowser();
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
      <div className="wrap">
        <Brand />

        <div className="layout">
        <main className="panel composer">
          <span className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Natural voices · 9 languages
          </span>
          <h1>
            Turn your words into <span className="grad">a voice.</span>
          </h1>
          <p className="lede">
            Paste any text, pick a language and voice, and generate natural
            speech you can play or download.
          </p>

          <TextInput
            value={text}
            onChange={setText}
            onClear={handleClear}
            charCount={validation.charCount}
            wordCount={validation.wordCount}
            isOver={validation.isOver}
          />

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

        {/* Narrow right-hand column level with Generate speech; drops below the form on phones. */}
        <aside className="output" aria-label="Generated audio">
          {status === 'ready' && job ? (
            <AudioPlayer
              job={job}
              onRegenerate={handleGenerate}
              onDownload={handleDownload}
              saving={saving}
            />
          ) : (
            <div className={`output-empty${status === 'loading' ? ' is-loading' : ''}`}>
              <div className="output-empty-wave" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
              <p className="output-empty-title">
                {status === 'loading' ? 'Generating your audio…' : 'Your audio will appear here'}
              </p>
              <p className="output-empty-text">
                {status === 'loading'
                  ? 'This usually takes a few seconds.'
                  : 'Write some text, choose a voice, then press Generate speech.'}
              </p>
            </div>
          )}
        </aside>
        </div>

        <ul className="shortcuts" aria-label="Keyboard shortcuts">
          <li><kbd>Space</kbd> play / pause</li>
          <li><kbd>←</kbd><kbd>→</kbd> skip 10s</li>
        </ul>

      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}