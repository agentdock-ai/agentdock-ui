# Agentdock UI design system

This is the visual and verbal system for the editable chat components in
`apps/registry/registry/agentdock-ui`. It is a styling contract only. It never
changes the event format, render model or component props.

## Persona: the Quiet Operator

Agentdock's chat interface behaves like a calm, competent colleague: someone
who does the work, says what's happening in a few words and steps aside when
you're reading.

| Trait           | In the interface                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Calm**        | Neutral surfaces, one accent (the host `primary`), no decorative color. Motion only signals life: running, streaming. |
| **Precise**     | Tool names and data in mono. Labels are short and exact. Status is a word, not a sentence.                            |
| **Deferential** | The answer is the page. Activity, reasoning and metadata collapse to a single line until asked for.                   |
| **Accountable** | Decisions (approvals) and failures (errors) are the only things allowed to raise their voice: a card, a border tint.  |

### Voice

- Sentence case everywhere (`Approve all`, not `Approve All`).
- Present tense for live state (`Running`, `Thinking`), past tense when done (`Ran 3 tools`).
- No exclamation marks, no apologies, no "Oops". Say what happened and what to do next.
- Never surface stack traces, tokens or keys. `safeDiagnosticText` already enforces this; copy should too.

## Principles

1. **Content first.** Assistant prose has no bubble, no avatar and the widest
   measure. Chrome (borders, fills) belongs to controls and decisions, not text.
2. **One line until opened.** Reasoning, tool calls, tool groups and raw tool
   output are disclosure rows. Their details live in a single inset panel.
3. **Hierarchy through surface, not color.** Flat → bordered → bordered +
   elevated. Only approvals and the composer are elevated.
4. **Host-themed.** Use only shadcn semantic tokens so the host's brand, light
   and dark modes carry through. No Agentdock stylesheet, no new CSS variables.
5. **Respect motion and pointer preferences.** Every animation is
   `motion-safe`/`motion-reduce` guarded; touch targets grow under
   `pointer: coarse`.

## Tokens

### Color (host semantic tokens only)

The installer requires `background`, `foreground`, `muted`, `border`,
`primary`, `ring` and `destructive`; components also use `muted-foreground`,
`primary-foreground` and `card` from the standard shadcn set.

| Role                      | Utility                                  |
| ------------------------- | ---------------------------------------- |
| Page / transcript         | `bg-background text-foreground`          |
| Raised surface (cards)    | `bg-card`                                |
| Subtle fill (user bubble) | `bg-muted`                               |
| Inset panel               | `bg-muted/40`                            |
| Hover fill                | `hover:bg-muted/60`                      |
| Secondary text, icons     | `text-muted-foreground`                  |
| Hairline                  | `border-border`                          |
| Soft hairline             | `border-border/70`                       |
| Primary action            | `bg-primary text-primary-foreground`     |
| Focus                     | `ring-ring/60` (2px) + `ring-offset-2`   |
| Focus halo (composer)     | `border-ring/60 ring-4 ring-ring/10`     |
| Danger text / icon        | `text-destructive`                       |
| Danger surface            | `border-destructive/25 bg-destructive/5` |

Recommended neutral host palette (used by the playground and review app):

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.2 0 0);
  --card: oklch(1 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.5 0 0);
  --primary: oklch(0.2 0 0);
  --primary-foreground: oklch(0.99 0 0);
  --border: oklch(0.915 0 0);
  --ring: oklch(0.55 0 0);
  --destructive: oklch(0.56 0.2 25);
}
.dark {
  --background: oklch(0.155 0 0);
  --foreground: oklch(0.94 0 0);
  --card: oklch(0.185 0 0);
  --muted: oklch(0.225 0 0);
  --muted-foreground: oklch(0.68 0 0);
  --primary: oklch(0.94 0 0);
  --primary-foreground: oklch(0.17 0 0);
  --border: oklch(0.27 0 0);
  --ring: oklch(0.62 0 0);
  --destructive: oklch(0.7 0.17 25);
}
```

### Typography

Inherits the host `font-sans` and `font-mono`. The playground uses Inter and
IBM Plex Mono.

| Style    | Spec                                             | Used for                                  |
| -------- | ------------------------------------------------ | ----------------------------------------- |
| Display  | 28px / 34px, 600, `tracking-[-0.03em]`           | Empty-state title                         |
| Heading  | 16px / 24px, 600, `tracking-tight`               | Markdown h1–h2                            |
| Body     | 14px / 1.7                                       | Assistant prose, user bubble (1.6)        |
| Label    | 13px / 20px, 500                                 | Buttons, card titles, activity rows       |
| Meta     | 12px / 16px, 400                                 | Hints, status words, attachment sizes     |
| Overline | 11px / 16px, 500, uppercase, `tracking-[0.06em]` | Panel section labels, sidebar groups      |
| Mono     | 12.5px / 20px                                    | Tool names; 12px / 20px in payload panels |

### Spacing

4px base. Transcript column `max-w-[44rem]` with 16px gutters. Turns are
separated by 32px, items inside a turn by 16px, rows inside a group by 2px.
Cards use 16px padding; inset panels 12px.

### Radius

| Utility          | Value  | Used for                                                   |
| ---------------- | ------ | ---------------------------------------------------------- |
| `rounded-md`     | 6px    | Inline code, glyph tiles, small icon buttons               |
| `rounded-lg`     | 8px    | Buttons, menu items, activity rows, sidebar rows           |
| `rounded-xl`     | 12px   | Inset panels, code blocks, chips, errors, menus, workspace |
| `rounded-2xl`    | 16px   | Approval card, dialogs                                     |
| `rounded-[20px]` | 20px   | User bubble                                                |
| `rounded-3xl`    | 24px   | Composer                                                   |
| `rounded-full`   | 9999px | Send/stop, suggestions, scroll-to-latest, status pills     |

### Elevation

Shadows are deliberately faint; in dark mode the border does the work.

| Level | Utility                                                                 | Used for                      |
| ----- | ----------------------------------------------------------------------- | ----------------------------- |
| 0     | none                                                                    | Prose, rows, panels           |
| 1     | `shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]`                                  | Buttons, chips, approval card |
| 2     | `shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]` | Composer                      |
| 3     | `shadow-lg` / `shadow-2xl`                                              | Menus, dialogs, scroll pill   |

### Motion

- Color/border transitions: 150ms ease-out.
- Disclosure chevrons rotate 90° over 200ms.
- Live state only. Thinking, working, running tools and streaming reasoning
  use **shimmer**: `ShimmerText` sweeps a `foreground` highlight across
  `muted-foreground/75` text (gradient `bg-clip-text`, 250% wide, 2s
  `cubic-bezier(0.45, 0, 0.55, 1)`, infinite). It runs on the Web Animations
  API, so hosts need no keyframes. Uploads keep `animate-spin`.
- Streaming text never pulses.
- Every transition carries `motion-reduce:transition-none`; every animation is
  `motion-safe:` or, for shimmer, skipped under `prefers-reduced-motion`.

### Iconography

lucide-react through `ChatIcon` (1.5 stroke, decorative, `aria-hidden`).
Sizes: 13px in activity rows (no tile, 60% opacity), 15–16px in controls and
cards, 18px in the send button.

## Status vocabulary

| State          | Glyph               | Word           | Tone        |
| -------------- | ------------------- | -------------- | ----------- |
| Thinking       | shimmer             | Thinking       | muted       |
| Working        | shimmer             | Working        | muted       |
| Running        | shimmer on the name | —              | muted       |
| Needs approval | wrench              | Needs approval | muted       |
| Complete       | wrench (no word)    | —              | muted       |
| Failed         | circle alert        | Failed         | destructive |
| Stopped        | circle stop         | Stopped        | muted       |
| Paused         | circle pause        | Run paused     | muted       |

## Components

### Layout

- **ChatWorkspace**: `rounded-xl` bordered frame, 48px header, 240px sidebar
  on `bg-muted/40`. On mobile the sidebar becomes a modal drawer.
- **ChatShell**: transcript above, composer anchored below with a 24px fade so
  content scrolls _under_ the composer instead of being cut.
- **ChatViewport**: centered 44rem column; scroll-to-latest is a floating
  round pill (elevation 3).

### Conversation

- **User message**: right-aligned `bg-muted` bubble, `rounded-[20px]`,
  `px-4 py-2.5`, max 85% width. Attached images stack above it.
- **Assistant message**: unboxed prose. Copy action sits below the final
  answer as a ghost icon button.
- **Markdown**: 1.7 line height; headings 16/15px; code blocks are `rounded-xl`
  inset panels; inline code is a `bg-muted` 6px chip; tables are bordered
  `rounded-xl` with a muted header row.
- **Attachments in content**: file/citation cards are a 36px icon tile, a
  name and one meta line; images are 96px `rounded-xl` thumbnails with a
  dialog preview.

### Activity (tools and reasoning)

Activity is text, not chrome. No tiles, no fills, no borders on the row:

```
[13px glyph]  label (mono for tool names)   status word   ›
```

- Rows are `min-h-7`, muted, and turn `foreground` on hover. The chevron is
  hidden until hover or focus on tool rows, and half-opacity on group rows.
- Expanded tool details sit indented under the label: a 12px muted heading
  (Input, Progress, Output) over a `rounded-lg bg-muted/60` mono block.
  Failures render the error component in place of Output.
- A group of tools is one line (`Ran 3 tools`, `· 1 failed` in destructive)
  that expands to a `border-l` rail of tool rows. While any tool runs, the
  line reads `Running 2 tools` and shimmers.
- **Reasoning**: `Thinking` (shimmer) while streaming, `Thought process` once
  done. Its body is a quiet `border-l` quote, max 14rem tall.
- **ThinkingIndicator**: one shimmering word, `Thinking` or `Working`.

### Decisions: ApprovalCard

The approval card is the one component allowed to interrupt reading, so it
is the only bordered card in the transcript, and it stays quiet inside.

```
╭──────────────────────────────────────────────────────────╮
│ ⛨ Title                                                  │
│ Detail text from the agent                               │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Action label                                         │ │
│ │ key        value                                     │ │
│ └──────────────────────────────────────────────────────┘ │
│ The agent is paused…    Edit  [Reject all] [Approve all] │
╰──────────────────────────────────────────────────────────╯
```

- `rounded-2xl border bg-card p-4`, elevation 1. No dividers or banded sections.
- Each action is a `bg-muted/50 rounded-lg` block: the label, then its object
  arguments as a mono key/value list (non-objects fall back to JSON).
- **Edit** swaps the lists for JSON textareas and the actions for **Cancel**
  / **Submit edits**. Decisions sent are unchanged: `approve`, `reject`,
  `edit` with `editedAction`.
- Primary = approve, outline = reject, ghost = edit.
- Resolved approvals collapse to an activity-style row: `✓ Response received`.

### Errors

- **ErrorState**: `rounded-xl` danger surface, circle-alert glyph, title in
  `text-destructive` 500, detail in muted text (first line, 240 characters max).
- Composer and attachment errors are inline 12px destructive text.
- Stopped turns end with a muted `Stopped · Your partial answer is preserved.`
  line with a stop glyph.

### Input

- **Composer**: elevation 2, `rounded-3xl`, `bg-card`; focus adds a soft
  ring halo. Bottom bar: attach (ghost round, left) and send/stop (primary
  round 32px, right).
- **Attachment chips**: `rounded-xl` bordered chip with 36px thumbnail/file
  tile, name and size or status, retry and remove icon buttons. Errors tint
  the border.
- **Attachment menu**: `rounded-xl` popover, elevation 3, 8px item radius.
- **Empty state**: display title, optional muted description, composer, then
  round suggestion pills.

### Navigation: ThreadSidebar

- New thread is a full-width row with a pen glyph; search is a soft bordered field.
- Group label uses the overline style.
- The selected thread is a raised row (`bg-background`, elevation 1, hairline ring);
  others are muted with a hover fill. Running threads show a small spinner.

## Accessibility checklist

- Every interactive element has a visible `focus-visible` ring.
- Icon-only buttons have an `aria-label` (and `title` where useful).
- Live status goes through the chat's single `role="status"` region.
- Errors use `role="alert"`; collapsible regions keep Radix/Base UI
  `aria-expanded`.
- Touch targets: 36px minimum under `pointer: coarse`.
- Contrast: body text uses `foreground`; `muted-foreground` is reserved for
  secondary text of 12px and above.

## Editing guidelines

- Change canonical files in `apps/registry/registry/agentdock-ui`, then run
  `yarn registry:sync` and `yarn registry:build`.
- Keep to the tokens above. If you need a new color, make it a tint of an
  existing semantic token (`/5`, `/25`, `/60`).
- Don't add props for visual variants. Consumers own the source and can edit it.
