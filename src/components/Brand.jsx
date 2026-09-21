import Icon from './Icon';
import { LANGUAGES } from '../constants/languages';

// Only Text to Speech exists today; the other studios are shown so the
// product's direction is visible, but they cannot be selected.
const TABS = [
  { id: 'tts', label: 'Text to Speech', icon: 'text' },
  { id: 'clone', label: 'Voice Clone', icon: 'user' },
  { id: 'sts', label: 'Speech to Speech', icon: 'swap' },
  { id: 'dub', label: 'Translate & Dub', icon: 'translate' },
];

export default function Brand({ health, theme, onToggleTheme }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="/" aria-label="SpeakEasy Studio home">
          <span className="mark" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </span>
          <span className="name">Speak<b>Easy</b></span>
          <span className="studio-tag">Studio</span>
        </a>

        <nav className="tabs" aria-label="Studios">
          {TABS.map((tab) => {
            const active = tab.id === 'tts';
            return (
              <button
                key={tab.id}
                type="button"
                className={`tab${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                disabled={!active}
                title={active ? undefined : 'Coming soon'}
              >
                <Icon name={tab.icon} size={15} />
                <span>{tab.label}</span>
                {!active && <span className="soon">Soon</span>}
              </button>
            );
          })}
        </nav>

        <div className="topbar-end">
          <span className={`engine-pill is-${health.status}`}>
            <span className="engine-dot" aria-hidden="true" />
            <span>Neural TTS</span>
            <span className="sep" aria-hidden="true">•</span>
            <span>{LANGUAGES.length} languages</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
