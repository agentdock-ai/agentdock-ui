import { describe, expect, it, vi } from "vitest";
import { AgentStore } from "../src/core/agent-store.js";
import {
  intro,
  sequence,
  text,
  complete,
} from "../../../scripts/fixtures/events.js";

describe("AgentStore ownership and subscriptions", () => {
  it("isolates retained events and content from producer mutation", () => {
    const store = new AgentStore();
    const events = sequence([
      ...intro,
      {
        type: "message.part.delta",
        messageId: "answer",
        part: { type: "image", url: "https://example.test/original.png" },
      },
    ]);
    events.forEach((event) => store.applyEvent(event));
    const image = events.at(-1)!;
    if (image.type !== "message.part.delta" || image.part.type !== "image")
      throw new Error("Expected image event");
    image.part.url = "https://example.test/mutated.png";
    store.setStreamStatus("closed");
    expect(store.getSnapshot().renderModel.turns[0]!.items).toMatchObject([
      { blocks: [{ url: "https://example.test/original.png" }] },
    ]);
  });
  it("isolates locally submitted attachment content", () => {
    const store = new AgentStore();
    const attachment = { type: "file" as const, fileId: "original" };
    store.appendUserMessage("", [attachment]);
    attachment.fileId = "mutated";
    expect(store.getSnapshot().agent.messages[0]!.content).toEqual([
      { type: "file", fileId: "original" },
    ]);
  });
  it("notifies only for changes, supports unsubscribe and resets all history", () => {
    const store = new AgentStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.appendUserMessage("   ");
    store.setStreamStatus("idle");
    expect(listener).not.toHaveBeenCalled();
    const events = sequence([...intro, text("Answer"), complete("Answer")]);
    events.forEach((event) => store.applyEvent(event));
    store.applyEvent(events[0]!);
    expect(listener).toHaveBeenCalledTimes(events.length);
    expect(() =>
      store.applyEvent({ ...events[0]!, timestamp: "2026-10-04T00:00:00Z" }),
    ).toThrow("reused");
    unsubscribe();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(events.length);
    expect(store.getSnapshot()).toMatchObject({
      runs: [],
      events: [],
      turnEvents: [],
      turnStreamStatuses: [],
      streamStatus: "idle",
      agent: { status: "idle" },
      renderModel: { turns: [] },
    });
  });
  it("keeps the last local stop outcome when a new prompt is submitted", () => {
    const store = new AgentStore();
    sequence([...intro, text("Partial")]).forEach((event) =>
      store.applyEvent(event),
    );
    store.setStreamStatus("stopped");
    store.appendUserMessage("Next");
    store.setStreamStatus("consuming");
    expect(store.getSnapshot().turnStreamStatuses).toEqual([
      "stopped",
      "consuming",
    ]);
    expect(store.getSnapshot().renderModel.turns[0]).toMatchObject({
      state: "running",
      transportState: "stopped",
      items: [{ state: "stopped" }],
    });
  });
});

it("appends multiple local messages to the current pending turn", () => {
  const store = new AgentStore();
  store.appendUserMessage("First");
  store.appendUserMessage("Second");
  expect(store.getSnapshot().runs).toHaveLength(1);
  expect(store.getSnapshot().renderModel.turns[0]!.items).toMatchObject([
    { role: "user", blocks: [{ text: "First" }] },
    { role: "user", blocks: [{ text: "Second" }] },
  ]);
});
