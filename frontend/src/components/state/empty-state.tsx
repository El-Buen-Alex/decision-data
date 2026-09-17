export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-fg-2/30 p-6 text-center text-fg-2">
      {message}
    </div>
  );
}
