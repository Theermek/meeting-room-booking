export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-edge-strong px-4 py-6 text-center text-sm text-foreground-muted">
      {message}
    </p>
  );
}
