import Icon from './Icon';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error" role="alert">
      <Icon name="alert" size={16} strokeWidth={2.2} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="error-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
