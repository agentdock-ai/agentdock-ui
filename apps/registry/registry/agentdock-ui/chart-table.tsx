import { formatValue, type ChartSpec } from "@agentdock-ai/ui-core";
export function ChartTable({ spec }: { spec: ChartSpec }) {
  return (
    <div className="max-h-[220px] overflow-auto px-4 pb-4">
      <table className="w-full text-left text-xs [&_td]:border-b [&_td]:border-border [&_td]:p-2 [&_th]:p-2">
        <caption className="sr-only">{spec.title || "Chart data"}</caption>
        <thead>
          <tr>
            <th scope="col">{spec.type === "pie" ? "Label" : "X"}</th>
            {spec.type === "pie" ? (
              <th scope="col">Value</th>
            ) : (
              spec.series.map((s, i) => (
                <th scope="col" key={i}>
                  {s.name}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {spec.type === "pie"
            ? spec.slices.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{s.label}</th>
                  <td>{formatValue(s.value, spec.unit)}</td>
                </tr>
              ))
            : spec.x.map((x, i) => (
                <tr key={i}>
                  <th scope="row">{x}</th>
                  {spec.series.map((s, si) => (
                    <td key={si}>
                      {s.data[i] === null
                        ? "—"
                        : formatValue(s.data[i], spec.unit)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
