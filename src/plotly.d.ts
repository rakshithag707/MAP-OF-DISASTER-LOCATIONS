declare module "plotly.js-basic-dist-min" {
  interface PlotlyStatic {
    react: (
      element: HTMLElement,
      data: unknown[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<unknown>;
    purge: (element: HTMLElement) => void;
    Plots: {
      resize: (element: HTMLElement) => void;
    };
  }
  const Plotly: PlotlyStatic;
  export default Plotly;
}
