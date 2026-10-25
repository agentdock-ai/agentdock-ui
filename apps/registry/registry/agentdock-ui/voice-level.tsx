export function VoiceLevel({ level }: { level: number }) {
  return (
    <span
      role="meter"
      aria-label="Microphone level"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Math.round(level * 100) / 100}
      className="inline-flex h-4 w-12 items-end gap-0.5"
    >
      <span className="h-2 w-full overflow-hidden rounded bg-muted motion-reduce:hidden">
        <span
          className="block h-full rounded bg-emerald-600 dark:bg-emerald-400"
          style={{ width: `${Math.max(5, level * 100)}%` }}
        />
      </span>
      <span
        aria-hidden="true"
        className="hidden h-2 w-6 rounded bg-emerald-600 motion-reduce:block dark:bg-emerald-400"
      />
    </span>
  );
}
