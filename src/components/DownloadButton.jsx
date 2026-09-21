import Icon from './Icon';

export default function DownloadButton({ onDownload, saving }) {
  return (
    <button type="button" className="big-btn" onClick={onDownload} disabled={saving}>
      {saving ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        <Icon name="download" size={18} className="big-btn-icon" />
      )}
      {saving ? 'Saving…' : 'Download (MP3)'}
    </button>
  );
}
