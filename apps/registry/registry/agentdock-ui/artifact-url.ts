import { safeUrl } from "./utils.js";
/** Data images stay in img elements; executable data documents never enter a frame. */
export function artifactMediaUrl(value?: string, image = false) {
  if (
    image &&
    value &&
    /^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*,/i.test(value)
  )
    return value;
  const safe = safeUrl(value);
  return safe && (/^https?:/i.test(safe) || safe.startsWith("/"))
    ? safe
    : undefined;
}
export function artifactLinkUrl(value?: string) {
  const url = safeUrl(value);
  return url && /^https:/i.test(url) ? url : undefined;
}
export function artifactLinkSandbox(url: string) {
  const sameOrigin = new URL(url).origin === globalThis.location?.origin;
  return `allow-scripts allow-forms allow-popups${sameOrigin ? "" : " allow-same-origin"}`;
}
