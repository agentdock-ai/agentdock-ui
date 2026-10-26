# Chat component source map

These files are the canonical editable component source for `agentdock-ui add chat`. Registry manifests and the playground are generated from this directory.

| File                                                                             | Responsibility                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `chat.tsx`                                                                       | Public entry point; binds a `ChatAdapter` to the UI tree. |
| `chat-shell.tsx`, `chat-viewport.tsx`, `scroll-to-latest.tsx`                    | Layout and transcript scrolling.                          |
| `empty-state.tsx`, `composer.tsx`, `chat-action-bar.tsx`                         | User input and primary actions.                           |
| `message-list.tsx`, `message.tsx`, `message-content.tsx`, `markdown-content.tsx` | Ordered transcript and safe content rendering.            |
| `streaming-text.tsx`, `thinking-indicator.tsx`, `reasoning.tsx`                  | Active agent output.                                      |
| `tool-call.tsx`, `tool-timeline.tsx`                                             | Tool activity rows with status, timing and failures.      |
| `approval-card.tsx`, `interrupt-card.tsx`                                        | Approvals and answers to custom interrupts.               |
| `alert.tsx`, `error-state.tsx`, `run-status-banner.tsx`                          | Status anatomy, errors, pauses, stops and reconnects.     |
| `types.ts`, `utils.ts`, `index.ts`                                               | Shared component contracts and exports.                   |

Do not substitute raw Agentdock events directly into individual components. They must receive the normalized render model defined by `@agentdock-ai/ui-core`.

| New source                                                                                                | Responsibility                                                                         |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tagged-content.tsx`, `chart-block.tsx`, `chart-frame.tsx`, `chart-*.tsx`                                 | Assistant-only tagged charts, SVG plots, legends, tooltips, tables and safe fallbacks. |
| `chat-artifacts.tsx`, `artifact-context.tsx`                                                              | Optional normalized artifact projection and UI-only tab/version state.                 |
| `chat-split.tsx`, `use-artifact-split.ts`                                                                 | Remembered split width and native mobile/full-screen focus trapping.                   |
| `artifact-panel.tsx`, `artifact-header.tsx`, `artifact-tabs.tsx`, `artifact-card.tsx`, `artifact-icon.ts` | Artifact shell and accessible controls.                                                |
| `artifact-view.tsx`, `artifact-view-*.tsx`, `json-tree.tsx`                                               | Bounded viewers; no network calls, code execution or highlighting dependency.          |
| `artifact-url.ts`, `use-artifact-url.ts`, `artifact-download.ts`                                          | Safe media URLs, bounded iframe policy and owned/revoked blob URLs.                    |
| `voice-input.tsx`, `use-voice-input.ts`, `voice-recorder.ts`                                              | Microphone lifecycle, optional metering and draft-only transcription.                  |

Charts are extracted only from assistant answers. Apps can add this guidance to their system prompt:

> To show a chart, write `<chart type="bar|line|area|pie" title="…">` on its own line, then a JSON body, then `</chart>` on its own line. Use `{ "x": [...], "series": [{ "name": "Sales", "data": [...] }] }` (pie: `{ "slices": [{ "label": "A", "value": 1 }] }`). Use finite numbers, at most 8 series, 200 points and 12 slices. Put examples inside fenced code blocks.

File previews are opt in: `<Chat artifacts={{ mapTool, links: "panel" }} … />`. The conservative default mapper uses complete tools with string `path` and `content` inputs. Custom mappers may return several drafts for a tool that produces both a link and page text. Tabs never auto-open. HTTPS link interception requires `links: "panel"`; modifier clicks keep browser behavior. HTML scripts are disabled unless `allowHtmlScripts` is explicitly set and HTML never receives `allow-same-origin`. Optional `canEmbed(url)` belongs to the host, which owns any server-side header checks.

Voice input appears only for `adapter.transcribe`. It records at most 120 seconds, releases tracks on Stop, Cancel, tab hide and unmount, and inserts text at the composer selection. It never sends automatically. `createConversationClient({ transcription: true, … })` enables multipart `POST {baseUrl}/transcribe`; other clients leave the route disabled. The app owns provider credentials and audio requests.
