import { describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { PlaygroundAttachments } from "../server/attachments.js";

function upload(
  bytes: Buffer | string,
  name = "notes.txt",
  mimeType = "text/plain",
) {
  return Object.assign(Readable.from([bytes]), {
    headers: {
      "x-file-name": encodeURIComponent(name),
      "content-type": mimeType,
    },
  }) as unknown as IncomingMessage;
}
describe("app attachment storage", () => {
  it("feeds uploaded text into the model input and scopes it to the app's thread", async () => {
    const store = new PlaygroundAttachments();
    const file = await store.upload(upload("Launch on Friday"), "thread");
    expect(store.message("Summarize", [file.id], "thread")).toEqual([
      { type: "text", text: "Summarize" },
      { type: "text", text: "Attached file: notes.txt\nLaunch on Friday" },
    ]);
    expect(store.get(file.id, "other-thread")).toBeUndefined();
    expect(() => store.message("", [file.id], "other-thread")).toThrow(
      "unavailable",
    );
    expect(() => store.message("", [file.id, file.id], "thread")).toThrow(
      "Invalid attachments",
    );
  });
  it("maps supported images in the backend without provider events reaching the browser", async () => {
    const store = new PlaygroundAttachments();
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/r0AAAAASUVORK5CYII=",
      "base64",
    );
    const file = await store.upload(
      upload(bytes, "image.png", "image/png"),
      "thread",
    );
    expect(file.mimeType).toBe("image/png");
    expect(store.message("", [file.id], "thread")).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${bytes.toString("base64")}` },
      },
    ]);
  });
  it("rejects unsupported binary, unsafe names and oversized uploads", async () => {
    const store = new PlaygroundAttachments();
    await expect(
      store.upload(upload("%PDF", "report.pdf", "application/pdf"), "t"),
    ).rejects.toThrow("supported image");
    await expect(
      store.upload(upload("<svg/>", "image.svg", "image/svg+xml"), "t"),
    ).rejects.toThrow("supported image");
    await expect(
      store.upload(upload("text", "../notes.txt"), "t"),
    ).rejects.toThrow("Invalid file name");
    await expect(
      store.upload(upload(Buffer.alloc(256_001, "a")), "t"),
    ).rejects.toThrow("256 KB");
    await expect(
      store.upload(upload(Buffer.alloc(5_000_001)), "t"),
    ).rejects.toThrow("5 MB");
    await expect(
      store.upload(upload(Buffer.from([255, 255]), "notes.txt"), "t"),
    ).rejects.toThrow();
  });
  it("bounds the total text sent and expires stored uploads", async () => {
    const store = new PlaygroundAttachments();
    const first = await store.upload(upload(Buffer.alloc(150_000, "a")), "t");
    const second = await store.upload(
      upload(Buffer.alloc(150_000, "b"), "more.txt"),
      "t",
    );
    expect(() => store.message("", [first.id, second.id], "t")).toThrow(
      "total",
    );
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.now() + 31 * 60_000);
    try {
      expect(store.get(first.id, "t")).toBeUndefined();
    } finally {
      clock.mockRestore();
    }
  });
});
