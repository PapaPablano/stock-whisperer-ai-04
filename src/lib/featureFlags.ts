export const useFeatureFlags = () => ({
  usePlotlyChart: import.meta.env.VITE_USE_PLOTLY_CHART === "true",
});
