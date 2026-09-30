export function ThinkingIndicator() {
  return (
    <div
      className="flex min-h-6 items-center gap-2 px-2 font-mono text-xs leading-5 text-muted-foreground"
      aria-hidden="true"
    >
      <span className="text-primary motion-safe:animate-pulse">&gt;</span>
      <span>thinking</span>
    </div>
  );
}
