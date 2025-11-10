import type { Layout, Config } from "plotly.js";

export const DARK_LAYOUT: Partial<Layout> = {
  paper_bgcolor: "#0f1115",
  plot_bgcolor: "#0f1115",
  font: { color: "#e2e8f0", family: "Inter, system-ui, -apple-system, Segoe UI" },
  hovermode: "x unified",
  xaxis: {
    showgrid: true,
    gridcolor: "#1f2430",
    linecolor: "#2a303c",
    zeroline: false,
  },
  yaxis: {
    showgrid: true,
    gridcolor: "#1f2430",
    linecolor: "#2a303c",
    zeroline: false,
  },
};

export const PLOTLY_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: [
    "select2d",
    "lasso2d",
    "autoScale2d",
    "toggleSpikelines",
  ],
};

export const COLORS = {
  candleUp: "#26a69a",
  candleDown: "#ef5350",
  supertrend: "#2b6cb0",
  volumeUp: "rgba(38,166,154,0.45)",
  volumeDown: "rgba(239,83,80,0.45)",
  rsi: "#9f7aea",
  macd: "#2196f3",
  macdSignal: "#ff9800",
  macdHist: "#90a4ae",
};

export const TIME_BUTTONS = [
  { label: "1D", step: "day", count: 1 },
  { label: "5D", step: "day", count: 5 },
  { label: "1M", step: "month", count: 1 },
  { label: "3M", step: "month", count: 3 },
  { label: "6M", step: "month", count: 6 },
  { label: "1Y", step: "year", count: 1 },
  { label: "5Y", step: "year", count: 5 },
  { label: "All", step: "all" as const },
];
