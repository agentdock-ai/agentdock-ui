import type { IncomingMessage } from "node:http";

/** The local playground API accepts only requests from its own loopback origin. */
export function requestSecurityIssue(
  request: IncomingMessage,
  port: number,
  protocol = "http:",
): { status: number; error: string } | undefined {
  const host = request.headers.host;
  let origin: string;
  try {
    if (!host) throw new Error();
    const target = new URL(`${protocol}//${host}`);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
      target.host !== host.toLowerCase() ||
      Number(target.port || (protocol === "https:" ? 443 : 80)) !== port
    )
      throw new Error();
    origin = target.origin;
  } catch {
    return { status: 403, error: "Use the playground’s loopback address." };
  }
  const suppliedOrigin = request.headers.origin;
  if (
    request.headers["sec-fetch-site"] === "cross-site" ||
    (suppliedOrigin !== undefined && suppliedOrigin !== origin) ||
    (request.method !== "GET" &&
      request.method !== "HEAD" &&
      suppliedOrigin !== origin)
  )
    return {
      status: 403,
      error: "Only same-origin playground requests are allowed.",
    };
}

export function isJsonRequest(request: IncomingMessage): boolean {
  return (
    request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() ===
    "application/json"
  );
}
