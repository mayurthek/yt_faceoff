interface ErrorScreenProps {
  title: string;
  message: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export default function ErrorScreen({
  title,
  message,
  primaryAction,
  secondaryAction,
}: ErrorScreenProps) {
  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <h1>{title}</h1>
      <p className="error__message" role="status">
        {message}
      </p>
      <div className="ready__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </button>
        {secondaryAction && (
          <button
            type="button"
            className="button button--ghost"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </main>
  );
}