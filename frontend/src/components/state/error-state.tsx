export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <div role="alert" className="rounded-lg border border-negative/40 bg-negative/10 p-4 text-fg">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
