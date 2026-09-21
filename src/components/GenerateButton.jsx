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
          <svg className="generate-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3v18M5 8v8M19 8v8M8.5 5.5v13M15.5 5.5v13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Generate speech
        </>
      )}
    </button>
  )
}

export default GenerateButton
