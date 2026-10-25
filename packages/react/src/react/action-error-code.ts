/** Only short machine codes cross into UI errors; provider diagnostics stay private. */
export function actionErrorCode(error: unknown): { code?: string } {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  return typeof code === "string" && /^[a-z][a-z0-9_.]{0,63}$/.test(code)
    ? { code }
    : {};
}
