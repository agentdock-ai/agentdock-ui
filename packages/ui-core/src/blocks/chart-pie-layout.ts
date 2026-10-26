import type { PieChartSpec } from "./chart-types.js";
export function chartSlices(spec: PieChartSpec) {
  const total = spec.slices.reduce((sum, slice) => sum + slice.value, 0);
  let angle = -Math.PI / 2;
  return spec.slices.map((slice, index) => {
    const portion = slice.value / total;
    const end = angle + portion * Math.PI * 2;
    const mid = (angle + end) / 2;
    const point = (a: number) =>
      `${100 + 86 * Math.cos(a)},${100 + 86 * Math.sin(a)}`;
    // Two arcs keep a single-slice pie visible (a full-circle arc collapses in SVG).
    const path = `M100,100 L${point(angle)} A86,86 0 0,1 ${point(mid)} A86,86 0 0,1 ${point(end)} Z`;
    angle = end;
    return {
      ...slice,
      index,
      percent: Math.round(portion * 100),
      path,
      x: 100 + 58 * Math.cos(mid),
      y: 100 + 58 * Math.sin(mid),
    };
  });
}
