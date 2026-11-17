export const CHART_FONT = "IBM Plex Mono, ui-monospace, monospace";
export const UI_FONT = "Instrument Sans, ui-sans-serif, system-ui, sans-serif";

export const plotConfig = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
  doubleClick: "reset+autosize",
};

export function baseLayout(
  layout: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    autosize: true,
    margin: { l: 42, r: 14, t: 10, b: 34 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family: CHART_FONT,
      size: 10,
      color: "#3f4a44",
    },
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: "#cdd4ce",
      font: { family: CHART_FONT, size: 10, color: "#0c1210" },
      align: "left",
    },
    xaxis: {
      gridcolor: "#e8ece8",
      zeroline: false,
      tickfont: { family: CHART_FONT, size: 9.5, color: "#59635d" },
      linecolor: "#d9dfda",
      fixedrange: true,
    },
    yaxis: {
      gridcolor: "#e8ece8",
      zeroline: false,
      tickfont: { family: CHART_FONT, size: 9.5, color: "#59635d" },
      linecolor: "#d9dfda",
      fixedrange: true,
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.16,
      font: { family: CHART_FONT, size: 9.5, color: "#3f4a44" },
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 0,
    },
    hovermode: "x unified",
    barcornerradius: 3,
    ...layout,
  };
}
