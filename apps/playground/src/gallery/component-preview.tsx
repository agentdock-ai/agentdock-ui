import { useId, type ReactNode } from "react";

export function ComponentPreview({
  name,
  children,
  wide = false,
  className = "",
}: {
  name: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      data-component-preview={name}
      className={`component-preview ${wide ? "component-preview-wide" : ""}`}
    >
      <h3 id={id}>{name}</h3>
      <div className={`component-preview-surface ${className}`}>{children}</div>
    </section>
  );
}
