export type ClassName = string | false | null | undefined;

export function cn(...classNames: ClassName[]): string | undefined {
  const value = classNames.filter(Boolean).join(" ");
  return value || undefined;
}
