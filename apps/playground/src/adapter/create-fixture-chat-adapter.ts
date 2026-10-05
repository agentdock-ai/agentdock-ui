import type { ChatAdapter, AgentStore } from "@agentdock-ai/react";
import {
  scenarios,
  sequence,
  complete,
  intro,
  text,
  type Scenario,
} from "../../../../scripts/fixtures/events.js";
export function createFixtureChatAdapter(
  store: AgentStore,
  scenario: Scenario = "markdown",
): ChatAdapter {
  return {
    async *sendMessage({ signal }) {
      const runId = `demo-${crypto.randomUUID()}`;
      const selected = scenario === "empty" ? "markdown" : scenario;
      const inputs = (
        scenarios[selected].length ? scenarios[selected] : scenarios.markdown
      ).map(
        ({
          protocolVersion,
          eventId,
          runId,
          logicalSequence,
          sequence,
          phaseId,
          timestamp,
          ...input
        }) => input,
      );
      const events = sequence(inputs, runId);
      for (const event of events) {
        if (signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 180));
        yield event;
      }
      if (["streaming", "reasoning", "thinking"].includes(selected)) {
        let offset = events.length;
        for (let i = 0; i < 12; i++) {
          if (signal.aborted) return;
          await new Promise((resolve) => setTimeout(resolve, 350));
          yield* sequence(
            selected === "thinking" && i === 0
              ? intro.slice(1)
              : [text(" A little more detail.")],
            runId,
            "phase-1",
            offset++,
          );
        }
        yield* sequence(
          [
            complete(
              "A focused chat keeps the answer readable and the next step clear.",
            ),
          ],
          runId,
          "phase-1",
          offset,
        );
      }
    },
    async cancelRun({ runId }) {
      const { agent } = store.getSnapshot();
      if (agent.runId !== runId) throw new Error("Run unavailable");
      store.applyEvent(
        sequence(
          [{ type: "run.cancelled", reason: "User stopped the fixture" }],
          runId,
          agent.lastPhaseId ?? "phase-1",
          agent.lastLogicalSequence,
        )[0]!,
      );
    },
    async *respondToInterrupt({ runId, interruptId, decisions }) {
      if (runId === null)
        throw new Error("The fixture has no saved checkpoint.");
      const { agent } = store.getSnapshot();
      yield* sequence(
        [
          {
            type: "interrupt.resolved",
            interruptId,
            decisions: [...decisions],
          },
          complete("Your response was received. We can continue from here."),
        ],
        runId,
        "phase-2",
        agent.lastLogicalSequence,
      );
    },
  };
}
