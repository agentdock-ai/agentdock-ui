import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { playgroundAttachmentPolicy as policy } from "../src/adapter/attachment-policy.js";

const MAX_TEXT_BYTES = 256_000;
const MAX_STORED_BYTES = 50_000_000;
const TTL = 30 * 60 * 1_000;
interface StoredAttachment {
  id: string;
  threadId: string;
  name: string;
  size: number;
  mimeType: string;
  bytes: Buffer;
  text?: string;
  expires: number;
}

/** Local demo storage. Production storage and authorization belong to the host. */
export class PlaygroundAttachments {
  private files = new Map<string, StoredAttachment>();
  private expire() {
    for (const [id, file] of this.files)
      if (file.expires < Date.now()) this.files.delete(id);
  }
  async upload(request: IncomingMessage, threadId: string) {
    this.expire();
    const encoded = request.headers["x-file-name"];
    const name = typeof encoded === "string" ? decodeURIComponent(encoded) : "";
    if (!name || name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(name))
      throw new Error("Invalid file name.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > policy.maxFileSize) throw new Error("File exceeds 5 MB.");
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    const requestedType =
      request.headers["content-type"]?.split(";")[0]?.toLowerCase() ?? "";
    const imageType = sniffImage(bytes);
    let text: string | undefined;
    if (!imageType) {
      if (
        requestedType.startsWith("image/") ||
        (!requestedType.startsWith("text/") &&
          !/\.(txt|md|csv|json|js|jsx|ts|tsx|py|yaml|yml|toml|log)$/i.test(
            name,
          ))
      )
        throw new Error("Upload a text, code or supported image file.");
      if (size > MAX_TEXT_BYTES)
        throw new Error("Text files must be under 256 KB.");
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0"))
        throw new Error("Binary files are not supported.");
    }
    const used = [...this.files.values()].reduce(
      (sum, file) => sum + file.size,
      0,
    );
    if (used + size > MAX_STORED_BYTES || this.files.size >= 200)
      throw new Error("Local attachment storage is full.");
    const file: StoredAttachment = {
      id: randomUUID(),
      threadId,
      name,
      size,
      bytes,
      mimeType: imageType ?? "text/plain",
      text,
      expires: Date.now() + TTL,
    };
    this.files.set(file.id, file);
    return {
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
    };
  }
  get(id: string, threadId: string) {
    this.expire();
    const file = this.files.get(id);
    return file?.threadId === threadId ? file : undefined;
  }
  message(prompt: string, ids: unknown, threadId: string) {
    if (ids === undefined || (Array.isArray(ids) && ids.length === 0)) {
      if (!prompt.trim()) throw new Error("Add a message or attachment.");
      return prompt;
    }
    if (
      !Array.isArray(ids) ||
      ids.length > policy.maxFiles ||
      ids.some((id) => typeof id !== "string") ||
      new Set(ids).size !== ids.length
    )
      throw new Error("Invalid attachments.");
    const content: (
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    )[] = [];
    if (prompt.trim()) content.push({ type: "text", text: prompt });
    let textBytes = 0;
    for (const id of ids) {
      const file = this.get(id, threadId);
      if (!file) throw new Error("An attachment expired or is unavailable.");
      if (file.text !== undefined) {
        textBytes += file.size;
        if (textBytes > MAX_TEXT_BYTES)
          throw new Error("Attached text exceeds 256 KB in total.");
        content.push({
          type: "text",
          text: `Attached file: ${file.name}\n${file.text}`,
        });
      } else
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${file.mimeType};base64,${file.bytes.toString("base64")}`,
          },
        });
    }
    return content;
  }
}
function sniffImage(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")))
    return "image/gif";
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return undefined;
}
