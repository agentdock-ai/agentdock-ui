export function EmptyState({
  title = "How can I help you today?",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mb-8 px-2 text-center">
      <h1 className="text-balance text-[26px] font-semibold leading-[34px] tracking-[-0.03em] sm:text-[28px]">
        {title}
      </h1>
      {description && (
        <p className="mx-auto mt-2.5 max-w-md text-balance text-[14px] leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
export function Suggestions({
  suggestions,
  disabled,
  onSubmit,
}: {
  suggestions: readonly string[];
  disabled?: boolean;
  onSubmit: (text: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {suggestions.map((prompt) => (
        <button
          type="button"
          key={prompt}
          disabled={disabled}
          onClick={() => onSubmit(prompt)}
          className="min-h-8 rounded-full border border-border bg-background px-3.5 py-1 text-[13px] leading-5 text-muted-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] outline-none transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-9"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
