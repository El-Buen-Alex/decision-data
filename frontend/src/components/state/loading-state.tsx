export function LoadingState({ label }: { label: string }): JSX.Element {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-fg-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
