export const chartColors = [
  "fill-blue-600 stroke-blue-600 dark:fill-blue-400 dark:stroke-blue-400",
  "fill-emerald-700 stroke-emerald-700 dark:fill-emerald-400 dark:stroke-emerald-400",
  "fill-amber-500 stroke-amber-500 dark:fill-amber-300 dark:stroke-amber-300",
  "fill-violet-700 stroke-violet-700 dark:fill-violet-400 dark:stroke-violet-400",
  "fill-rose-600 stroke-rose-600 dark:fill-rose-300 dark:stroke-rose-300",
  "fill-cyan-700 stroke-cyan-700 dark:fill-cyan-300 dark:stroke-cyan-300",
  "fill-orange-700 stroke-orange-700 dark:fill-orange-400 dark:stroke-orange-400",
  "fill-fuchsia-500 stroke-fuchsia-500 dark:fill-fuchsia-300 dark:stroke-fuchsia-300",
];
export const chartColor = (index: number) =>
  chartColors[index % chartColors.length];
