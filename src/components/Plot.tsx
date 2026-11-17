import { useEffect, useRef } from "react";
import Plotly from "plotly.js-basic-dist-min";
import { baseLayout, plotConfig } from "../lib/chartTheme";
import { cn } from "../utils/cn";

const EMPTY_RECORD: Record<string, unknown> = {};

interface PlotProps {
  data: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
  className?: string;
  ariaLabel?: string;
}

export function Plot({
  data,
  layout = EMPTY_RECORD,
  config = EMPTY_RECORD,
  className,
  ariaLabel = "Interactive data visualization",
}: PlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    void Plotly.react(element, data, baseLayout(layout), {
      ...plotConfig,
      ...config,
    }).catch(() => {
      if (!cancelled) {
        // A chart failure should never take down the surrounding dashboard.
      }
    });

    const observer = new ResizeObserver(() => {
      if (!cancelled && element.offsetParent) {
        Plotly.Plots.resize(element);
      }
    });
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      Plotly.purge(element);
    };
    // Layout and data are rebuilt by callers when filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layout, config]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={cn("min-h-[160px] w-full", className)}
    />
  );
}
