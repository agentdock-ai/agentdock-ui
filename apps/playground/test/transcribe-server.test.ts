import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { expect, it, vi } from "vitest";
import { handleTranscription } from "../server/transcribe.js";
import type { PlaygroundTranscriptionOptions } from "../server/transcribe-provider.js";
class Reply extends EventEmitter {
  status = 0;
  destroyed = false;
  writableEnded = false;
  body = "";
  writeHead(status: number) {
    this.status = status;
    return this;
  }
  end(body: string) {
    this.body = body;
    this.writableEnded = true;
  }
  json() {
    return JSON.parse(this.body);
  }
}
async function upload(
  form: FormData,
  options: PlaygroundTranscriptionOptions = {},
) {
  const raw = new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: form,
  });
  const request = Readable.from([
    Buffer.from(await raw.arrayBuffer()),
  ]) as unknown as IncomingMessage;
  request.method = "POST";
  request.headers = { "content-type": raw.headers.get("content-type") ?? "" };
  const response = new Reply();
  await handleTranscription(
    request,
    response as unknown as ServerResponse,
    options,
  );
  return response;
}
function audio(type = "audio/webm;codecs=opus", size = 5) {
  const form = new FormData();
  form.set(
    "audio",
    new Blob([new Uint8Array(size)], { type }),
    "recording.webm",
  );
  return form;
}
it("returns an explicit 501 without speech credentials", async () => {
  const response = await upload(audio());
  expect(response.status).toBe(501);
  expect(response.json()).toMatchObject({
    code: "transcription_unavailable",
    message: expect.stringContaining("PLAYGROUND_STT_API_KEY"),
  });
});
it("validates audio type, nonempty files, duplicate files and the 10 MB limit", async () => {
  expect((await upload(audio("text/html"))).status).toBe(415);
  expect((await upload(audio("audio/webm", 0))).status).toBe(400);
  expect((await upload(new FormData())).status).toBe(400);
  expect((await upload(audio("audio/mp4", 10 * 1024 * 1024 + 1))).status).toBe(
    413,
  );
  expect(
    (await upload(audio("audio/mp4", 10 * 1024 * 1024 + 100000))).status,
  ).toBe(413);
  const duplicate = audio();
  duplicate.append(
    "audio",
    new Blob(["second"], { type: "audio/mp4" }),
    "second.mp4",
  );
  expect((await upload(duplicate)).status).toBe(400);
});
it("calls the configured file transcription provider and returns only text", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ text: "A voice sentence", languages: [{ code: "en" }] }),
    );
  const result = await upload(audio("audio/mp4"), {
    apiKey: "test-key",
    request,
  });
  expect(result.status).toBe(200);
  expect(result.json()).toEqual({ text: "A voice sentence" });
  expect(request.mock.calls[0]?.[0]).toBe(
    "https://api.openai.com/v1/audio/transcriptions",
  );
  const init = request.mock.calls[0]?.[1];
  expect(init?.body).toBeInstanceOf(FormData);
  expect((init?.body as FormData).get("model")).toBe("gpt-transcribe");
  expect((init?.body as FormData).get("file")).toBeInstanceOf(Blob);
});
it("never exposes provider errors or invalid upstream JSON", async () => {
  for (const response of [
    Response.json({ error: "secret API key" }, { status: 401 }),
    Response.json({ text: 42 }),
    new Response("not JSON"),
  ]) {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    const result = await upload(audio(), { apiKey: "test", request });
    expect(result.status).toBe(502);
    expect(result.json().code).toBe("transcription_failed");
    expect(result.body).not.toContain("secret");
  }
});
