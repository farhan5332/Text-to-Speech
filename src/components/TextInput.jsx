import { useRef } from 'react';
import Icon from './Icon';
import { MAX_CHARS } from '../constants/languages';
import { polishText } from '../utils/polishText';

// Starter scripts; picking one replaces the text box.
const PROMPTS = [
  { id: 'intro', emoji: '👋', label: 'Intro', text: 'Hi there, and welcome! I’m glad you’re here. In the next few minutes, I’ll walk you through everything you need to get started.' },
  { id: 'pitch', emoji: '🚀', label: 'Product Pitch', text: 'Meet the fastest way to turn ideas into sound. Type a script, pick a voice, and get studio-quality audio in seconds — no microphone required.' },
  { id: 'podcast', emoji: '🎙️', label: 'Podcast Host', text: 'Welcome back to the show! Today we’re digging into a question listeners keep asking us… and trust me, the answer surprised even me.' },
  { id: 'audiobook', emoji: '📖', label: 'Audiobook', text: 'The rain had not stopped for three days. Elena stood at the window, watching the lamplight tremble on the wet cobblestones, and waited for the knock she knew would come.' },
  { id: 'trailer', emoji: '🎬', label: 'Movie Trailer', text: 'In a world where every word has power… one voice will rise above the rest. This summer, get ready to listen like never before.' },
];

// A spaced ellipsis is the pause marker every voice honours, and it survives
// translation, unlike SSML break tags.
const PAUSE = ' … ';

function formatEstimate(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `~${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `~${m}m ${Math.round(seconds % 60)}s`;
}

export default function TextInput({
  value,
  onChange,
  onClear,
  onPaste,
  charCount = 0,
  wordCount = 0,
  rate = 1,
  isOver = false,
}) {
  const areaRef = useRef(null);
  const seconds = wordCount ? (wordCount / 155) * 60 / rate : 0;

  const insertPause = () => {
    const el = areaRef.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const next = value.slice(0, start).trimEnd() + PAUSE + value.slice(end).trimStart();
    onChange(next);
    // Put the caret after the pause so typing continues naturally.
    requestAnimationFrame(() => {
      if (!el) return;
      const caret = value.slice(0, start).trimEnd().length + PAUSE.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <section className={`card script${isOver ? ' over' : ''}`}>
      <div className="card-head">
        <label className="card-title" htmlFor="tts-text">
          <Icon name="edit" size={16} />
          Your text script
        </label>
        <div className="card-actions">
          <button
            type="button"
            className="soft-btn accent"
            onClick={() => onChange(polishText(value))}
            disabled={!value.trim()}
            title="Tidy spacing, capitals and punctuation"
          >
            <Icon name="sparkles" size={15} />
            Polish
          </button>
          <button type="button" className="soft-btn" onClick={insertPause}>
            <Icon name="clock" size={15} />
            + Add Pause
          </button>
        </div>
      </div>

      <textarea
        id="tts-text"
        ref={areaRef}
        placeholder="Type or paste the text you want spoken aloud…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="prompts">
        <span className="prompts-label">Prompts:</span>
        {PROMPTS.map((p) => (
          <button key={p.id} type="button" className="prompt-chip" onClick={() => onChange(p.text)}>
            <span aria-hidden="true">{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>

      <div className="script-meta">
        <span><strong>{charCount}</strong> characters</span>
        <span className="dot" aria-hidden="true">•</span>
        <span><strong>{wordCount}</strong> words</span>
        <span className="dot" aria-hidden="true">•</span>
        <span className="estimate">Est. duration: <b>{formatEstimate(seconds)}</b></span>

        <span className="meta-end">
          <button type="button" className="link-btn" onClick={onPaste}>Paste</button>
          <button type="button" className="link-btn" onClick={onClear} disabled={!value}>Clear</button>
          <span className="meta-divider" aria-hidden="true" />
          <span className={`limit${isOver ? ' over' : ''}`}>
            {charCount} / {MAX_CHARS.toLocaleString('en-US')}
          </span>
        </span>
      </div>
    </section>
  );
}
