import Icon from './Icon';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function GenerateButton({ onClick, loading, disabled }) {
  return (
    <button
      type="button"
      className="generate"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Generating…
        </>
      ) : (
        <>
          <Icon name="mic" size={22} className="generate-icon" />
          Generate Studio Speech
          <kbd className="generate-kbd" aria-label={isMac ? 'Command Enter' : 'Control Enter'}>
            {isMac ? '⌘' : 'Ctrl'} + Enter
          </kbd>
        </>
      )}
    </button>
  )
}

export default GenerateButton
