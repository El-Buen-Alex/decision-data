export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <div role="alert" className="rounded-lg border border-negative bg-negative-tint p-4 text-fg">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
