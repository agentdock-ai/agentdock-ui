import { ChartBlock } from "../components/agentdock-ui/chart-block";
import { TaggedContent } from "../components/agentdock-ui/tagged-content";
import { ComponentPreview } from "./component-preview";
import { chartFixtures } from "./fixtures";
export function ChartPreviews() {
  return (
    <section
      id="charts"
      className="gallery-category"
      aria-labelledby="charts-heading"
    >
      <h2 id="charts-heading">Charts</h2>
      <div className="gallery-grid">
        {chartFixtures.map((block, i) => (
          <ComponentPreview key={i} name={`Chart · ${block.attributes.title}`}>
            <ChartBlock block={block} />
          </ComponentPreview>
        ))}
        <ComponentPreview name="Assistant answer · Chart" wide>
          <TaggedContent
            text={
              'Here is your revenue.\n\n<chart type="bar" title="Monthly sales">\n{"x":["Jan","Feb","Mar"],"series":[{"name":"Sales","data":[12,18,15]}]}\n</chart>\n\nFebruary performed best.'
            }
          />
        </ComponentPreview>
      </div>
    </section>
  );
}
