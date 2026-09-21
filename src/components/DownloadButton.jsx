export default function DownloadButton({ onDownload, saving }) {
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={onDownload}
      disabled={saving}
    >
      {saving ? (
        <span
          className="spinner"
          aria-hidden="true"
          style={{ width: 15, height: 15 }}
        />
      ) : (
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
      )}
      {saving ? 'Saving…' : 'Download audio'}
    </button>
  );
}