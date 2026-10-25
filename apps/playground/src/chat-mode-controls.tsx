import {
  scenarios,
  isScenario,
  type Scenario,
} from "../../../scripts/fixtures/events.js";
export type PlaygroundMode = "fixtures" | "live";
interface ControlsProps {
  mode: PlaygroundMode;
  scenario: Scenario;
  onMode: (mode: PlaygroundMode) => void;
  onScenario: (scenario: Scenario) => void;
}
export function ChatModeControls({
  mode,
  scenario,
  onMode,
  onScenario,
}: ControlsProps) {
  const style =
    "h-8 max-w-28 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <>
      <select
        aria-label="Connection mode"
        value={mode}
        onChange={(event) =>
          onMode(event.target.value === "live" ? "live" : "fixtures")
        }
        className={style}
      >
        <option value="fixtures">Fixtures</option>
        <option value="live">Live model</option>
      </select>
      {mode === "fixtures" && (
        <select
          aria-label="Fixture scenario"
          value={scenario}
          onChange={(event) => {
            if (isScenario(event.target.value)) onScenario(event.target.value);
          }}
          className={style}
        >
          {Object.keys(scenarios).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
