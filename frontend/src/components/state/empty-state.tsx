export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-fg-2">
      {message}
    </div>
  );
}
