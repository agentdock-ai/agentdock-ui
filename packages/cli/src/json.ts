import { readFile } from "node:fs/promises";
/** Read JSONC project config without changing comments or formatting in the original. */
export async function readJson(path: string): Promise<Record<string, unknown>> {
  const source = await readFile(path, "utf8");
  let result = "",
    quoted = false,
    escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      result += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') {
      quoted = true;
      result += c;
    } else if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      result += "\n";
    } else if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/"))
        i++;
      if (i >= source.length)
        throw new SyntaxError("Unterminated JSON comment.");
      i++;
      result += " ";
    } else result += c;
  }
  let clean = "";
  quoted = false;
  escaped = false;
  for (let i = 0; i < result.length; i++) {
    const c = result[i]!;
    if (!quoted && c === ",") {
      let next = i + 1;
      while (/\s/.test(result[next] ?? "")) next++;
      if (result[next] === "}" || result[next] === "]") continue;
    }
    clean += c;
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
  }
  const value: unknown = JSON.parse(clean);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${path} must contain a JSON object.`);
  return value as Record<string, unknown>;
}
