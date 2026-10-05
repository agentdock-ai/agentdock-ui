# Chat component source map

These files are the canonical editable component source for `agentdock-ui add chat`. Registry manifests and the playground are generated from this directory.

| File                                                                             | Responsibility                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `chat.tsx`                                                                       | Public entry point; binds a `ChatAdapter` to the UI tree. |
| `chat-shell.tsx`, `chat-viewport.tsx`, `scroll-to-latest.tsx`                    | Layout and transcript scrolling.                          |
| `empty-state.tsx`, `composer.tsx`, `chat-action-bar.tsx`                         | User input and primary actions.                           |
| `message-list.tsx`, `message.tsx`, `message-content.tsx`, `markdown-content.tsx` | Ordered transcript and safe content rendering.            |
| `streaming-text.tsx`, `thinking-indicator.tsx`, `reasoning.tsx`                  | Active agent output.                                      |
| `tool-call.tsx`, `tool-timeline.tsx`, `approval-card.tsx`, `error-state.tsx`     | Activity, decisions, and errors.                          |
| `types.ts`, `utils.ts`, `index.ts`                                               | Shared component contracts and exports.                   |

Do not substitute raw Agentdock events directly into individual components. They must receive the normalized render model defined by `@agentdock-ai/ui-core`.
