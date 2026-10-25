import type { AgentEventInput } from "@agentdock-ai/contracts";
type Helpers = Pick<
  typeof import("./events.js"),
  "sequence" | "intro" | "text" | "complete"
>;
const bar =
  '<chart type="bar" title="Monthly sales" unit="$k">\n{"x":["Jan","Feb","Mar"],"series":[{"name":"Sales","data":[12,18,15]}]}\n</chart>';
const line =
  '<chart type="line" title="Sales trend">\n{"x":["Jan","Feb","Mar"],"series":[{"name":"Sales","data":[12,18,15]}]}\n</chart>';
const answer = `Here are your monthly sales.\n\n${bar}\n\nFebruary had the highest sales.\n\n${line}\n\nThe chart tag can also be shown as a code example:\n\n\`\`\`html\n${bar}\n\`\`\``;
const invalid =
  '<chart type="bar" title="Malformed data">\nnot JSON\n</chart>\n\nThis unfinished chart keeps its source:\n\n<chart type="line" title="Missing closing tag">\n{"x":[1],"series":[{"name":"A","data":[1]}]}';
function fileEvents(): AgentEventInput[] {
  const files = [
    [
      "create_file",
      "index.html",
      "<!doctype html><html><body><h1>Hello</h1><p>A simple landing page.</p></body></html>",
    ],
    ["create_file", "data.json", '{"sales":[12,18,15],"ready":true}'],
    ["create_file", "report.csv", "Month,Sales\nJan,12\nFeb,18\nMar,15"],
    [
      "update_file",
      "index.html",
      "<!doctype html><html><body><h1>Welcome</h1><p>A simple landing page.</p></body></html>",
    ],
  ];
  return files.flatMap(([name, path, content], i) => {
    const call = {
      toolCallId: `artifact-${i + 1}`,
      name,
      input: { path, content },
    };
    return [
      { type: "tool.called", toolCall: call },
      {
        type: "tool.completed",
        result: { ...call, output: { path, content } },
      },
    ];
  });
}
export function featureScenarios({ sequence, intro, text, complete }: Helpers) {
  const deltas = Array.from({ length: Math.ceil(answer.length / 36) }, (_, i) =>
    text(answer.slice(i * 36, (i + 1) * 36)),
  );
  const link =
    "Open this [HTTPS reference](https://example.com) in the artifact panel. Some sites block framing; the viewer always offers Open in new tab.";
  return {
    chart: sequence([...intro, ...deltas, complete(answer)], "chart-run"),
    chartInvalid: sequence(
      [...intro, text(invalid), complete(invalid)],
      "invalid-chart-run",
    ),
    artifacts: sequence(
      [
        { type: "run.started" },
        ...fileEvents(),
        complete(
          "Created HTML, JSON and CSV files, then updated the HTML heading to Welcome. Use Open to inspect each file and switch between v1 and v2.",
        ),
      ],
      "artifact-run",
    ),
    artifactLink: sequence(
      [...intro, text(link), complete(link)],
      "artifact-link-run",
    ),
  };
}
