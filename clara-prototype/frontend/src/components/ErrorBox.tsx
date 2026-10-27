/**
 * Error display component.
 */

interface ErrorBoxProps {
  error: string;
  title?: string;
}

export function ErrorBox({ error, title = 'Error' }: ErrorBoxProps) {
  return (
    <div className="error-box">
      <strong>{title}</strong>
      {error}
    </div>
  );
}
