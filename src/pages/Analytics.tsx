import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CircleDot,
  ShieldAlert,
} from "lucide-react";
import type { DisasterEvent } from "../lib/disasters";
import {
  buildTimeSeries,
  hazardCounts,
  hazardSeverityMatrix,
  severityCounts,
  summarize,
} from "../lib/analytics";
import {
  HAZARD_MAP,
  SEVERITY,
  SEVERITY_ORDER,
  type SeverityLevel,
} from "../lib/hazards";
import {
  formatDate,
  formatDateTime,
  spanDays,
} from "../lib/format";
import { PageHeading } from "../components/PageHeading";
import { Plot } from "../components/Plot";
import { baseLayout } from "../lib/chartTheme";
import {
  EmptyState,
  HazardDot,
  SectionHeader,
  SeverityPill,
} from "../components/ui";

function Indicator({
  label,
  value,
  suffix,
  caption,
  icon,
  accent = "#78837d",
  detail,
}: {
  label: string;
  value: string;
  suffix?: string;
  caption: string;
  icon: React.ReactNode;
  accent?: string;
  detail?: React.ReactNode;
}) {
  return (
    <div className="panel flex min-h-[104px] flex-col justify-between p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="micro-label">{label}</span>
        <span style={{ color: accent }} className="opacity-80">
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <span className="num text-[23px] font-medium leading-none text-ink">{value}</span>
          {suffix && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.05em] text-muted">
              {suffix}
            </span>
          )}
        </div>
        {detail}
      </div>
      <p className="mt-2 truncate text-[9.5px] text-muted">{caption}</p>
    </div>
  );
}

interface AnalyticsProps {
  events: DisasterEvent[];
  start: string;
  end: string;
}

export function Analytics({ events, start, end }: AnalyticsProps) {
  const days = spanDays(start, end);
  const summary = useMemo(() => summarize(events, days), [events, days]);
  const hazards = useMemo(
    () => hazardCounts(events).filter((hazard) => hazard.count > 0),
    [events],
  );
  const severities = useMemo(() => severityCounts(events), [events]);
  const matrix = useMemo(() => hazardSeverityMatrix(events), [events]);
  const timeSeries = useMemo(() => buildTimeSeries(events, start, end), [events, start, end]);
  const magnitudeBuckets = useMemo(() => {
    const buckets = [
      { label: "M < 4.0", min: -Infinity, max: 4, count: 0, color: "#64748b" },
      { label: "M 4.0–4.9", min: 4, max: 5, count: 0, color: "#ca8a04" },
      { label: "M 5.0–5.9", min: 5, max: 6, count: 0, color: "#ea580c" },
      { label: "M 6.0–6.9", min: 6, max: 7, count: 0, color: "#dc2626" },
      { label: "M 7.0+", min: 7, max: Infinity, count: 0, color: "#7c3aed" },
    ];
    events
      .filter((event) => event.hazard === "earthquake" && typeof event.magnitude === "number")
      .forEach((event) => {
        const magnitude = event.magnitude as number;
        const bucket = buckets.find(
          (item) => magnitude >= item.min && magnitude < item.max,
        );
        if (bucket) bucket.count += 1;
      });
    return buckets;
  }, [events]);

  const trendData = useMemo(
    () =>
      hazards.map((hazard) => {
        const definition = HAZARD_MAP[hazard.id];
        return {
          type: "scatter",
          mode: "lines",
          name: definition.label,
          x: timeSeries.buckets.map((bucket) => bucket.label),
          y: timeSeries.buckets.map((bucket) => bucket.counts[hazard.id] ?? 0),
          stackgroup: "analytics",
          line: { width: 0.8, color: definition.color },
          fillcolor: `${definition.color}30`,
          hovertemplate: `%{y} ${definition.label.toLowerCase()}<extra></extra>`,
        };
      }),
    [hazards, timeSeries],
  );

  const trendLayout = useMemo(
    () =>
      baseLayout({
        height: 258,
        margin: { l: 34, r: 10, t: 34, b: 30 },
        showlegend: true,
        legend: {
          orientation: "h",
          x: 0,
          y: 1.19,
          font: { family: "IBM Plex Mono, monospace", size: 8.5, color: "#3f4a44" },
        },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.032)",
          nticks: 8,
          tickangle: 0,
          fixedrange: true,
        },
        yaxis: {
          rangemode: "tozero",
          gridcolor: "rgba(255,255,255,0.05)",
          fixedrange: true,
        },
        hovermode: "x unified",
      }),
    [],
  );

  const distributionData = useMemo(
    () => [
      {
        type: "pie",
        labels: hazards.map((hazard) => hazard.label),
        values: hazards.map((hazard) => hazard.count),
        hole: 0.76,
        sort: false,
        direction: "clockwise",
        marker: {
          colors: hazards.map((hazard) => hazard.color),
          line: { color: "#ffffff", width: 2 },
        },
        rotation: 0,
        textinfo: "none",
        hovertemplate: "%{label}<br>%{value} events · %{percent}<extra></extra>",
      },
    ],
    [hazards],
  );

  const distributionLayout = useMemo(
    () =>
      baseLayout({
        height: 186,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        hovermode: "closest",
        annotations: [
          {
            text: `<b>${hazards.length}</b><br><span style="font-family:IBM Plex Mono,monospace;font-size:8px;letter-spacing:.1em;color:#6f7a75;">HAZARD CLASSES</span>`,
            showarrow: false,
            font: { family: "IBM Plex Mono, monospace", size: 19, color: "#0c1210" },
            x: 0.5,
            y: 0.5,
          },
        ],
      }),
    [hazards.length],
  );

  const severityData = useMemo(
    () => [
      {
        type: "bar",
        orientation: "h",
        y: [...severities].reverse().map((item) => SEVERITY[item.level].label),
        x: [...severities].reverse().map((item) => item.count),
        marker: {
          color: [...severities].reverse().map((item) => SEVERITY[item.level].color),
          line: { width: 0 },
          opacity: 0.9,
        },
        hovertemplate: "%{y}: %{x} events<extra></extra>",
        width: 0.52,
      },
    ],
    [severities],
  );

  const severityLayout = useMemo(
    () =>
      baseLayout({
        height: 186,
        margin: { l: 64, r: 16, t: 2, b: 22 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.04)",
          fixedrange: true,
          rangemode: "tozero",
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0)",
          tickfont: { family: "IBM Plex Mono, monospace", size: 9, color: "#2a332e" },
          fixedrange: true,
        },
        hovermode: "closest",
        showlegend: false,
      }),
    [],
  );

  const magnitudeData = useMemo(
    () => [
      {
        type: "bar",
        x: magnitudeBuckets.map((bucket) => bucket.label),
        y: magnitudeBuckets.map((bucket) => bucket.count),
        marker: {
          color: magnitudeBuckets.map((bucket) => bucket.color),
          opacity: 0.86,
          line: { width: 0 },
        },
        hovertemplate: "%{x}: %{y} events<extra></extra>",
        width: 0.46,
      },
    ],
    [magnitudeBuckets],
  );

  const magnitudeLayout = useMemo(
    () =>
      baseLayout({
        height: 174,
        margin: { l: 34, r: 10, t: 8, b: 28 },
        xaxis: {
          gridcolor: "rgba(0,0,0,0)",
          tickfont: { size: 8.5, color: "#59635d" },
          fixedrange: true,
        },
        yaxis: {
          rangemode: "tozero",
          gridcolor: "rgba(255,255,255,0.045)",
          fixedrange: true,
        },
        showlegend: false,
        hovermode: "closest",
      }),
    [],
  );

  const strongest = events
    .filter((event) => event.hazard === "earthquake" && typeof event.magnitude === "number")
    .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))[0];
  const maximumSeverity = Math.max(
    1,
    ...matrix.flatMap((row) => SEVERITY_ORDER.map((level) => row.counts[level])),
  );
  const average = summary.averagePerDay;
  const peakLabel = summary.peakDay
    ? formatDate(`${summary.peakDay.date}T12:00:00Z`, {
        month: "short",
        day: "numeric",
      })
    : "—";
  const criticalShare = events.length
    ? ((summary.critical / events.length) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="fade-in space-y-4">
      <PageHeading
        eyebrow="Charts"
        title="Analytics & trends"
        description="Quantitative analysis of event frequency, hazard composition, severity structure and change over time. All charts respond to the shared query controls."
        start={start}
        end={end}
        aside={
          <div className="hidden items-center gap-3 rounded-lg border border-line bg-[#f8faf7] px-3.5 py-2.5 lg:flex">
            <BarChart3 size={15} className="text-muted-dim" strokeWidth={1.6} />
            <div>
              <div className="micro-label mb-1">Granularity</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-soft">
                {timeSeries.granularity} · {timeSeries.buckets.length} bins
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Indicator
          label="Average frequency"
          value={average.toFixed(1)}
          suffix="/ day"
          caption={`Across ${days.toLocaleString()} days in window`}
          icon={<Activity size={13} strokeWidth={1.7} />}
          accent="#c2410c"
          detail={
            <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-muted-dim">
              {events.length.toLocaleString()} total
            </span>
          }
        />
        <Indicator
          label="Peak activity"
          value={summary.peakDay ? summary.peakDay.count.toLocaleString() : "0"}
          suffix="events"
          caption={summary.peakDay ? `Highest day · ${peakLabel}` : "No activity"}
          icon={<CalendarClock size={13} strokeWidth={1.7} />}
          accent="#0e7490"
          detail={
            <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-muted-dim">
              {timeSeries.granularity}
            </span>
          }
        />
        <Indicator
          label="Critical share"
          value={criticalShare}
          suffix="%"
          caption={`${summary.critical.toLocaleString()} critical events`}
          icon={<ShieldAlert size={13} strokeWidth={1.7} />}
          accent={SEVERITY.critical.color}
          detail={
            <span className="rounded border border-critical/20 bg-critical/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-critical/80">
              Severity 4/4
            </span>
          }
        />
        <Indicator
          label="Countries affected"
          value={summary.countryCount.toLocaleString()}
          caption={`${summary.active.toLocaleString()} active alerts in window`}
          icon={<CircleDot size={13} strokeWidth={1.7} />}
          accent="#15803d"
          detail={
            <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.05em] text-live/80">
              <span className="live-dot h-[4px] w-[4px]" /> Live
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="panel xl:col-span-2">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Frequency over time"
              eyebrow="Temporal change"
              description={`${timeSeries.granularity} counts stacked by hazard class across the observation window.`}
              action={
                <span className="hidden rounded border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] text-muted sm:inline">
                  UTC buckets
                </span>
              }
            />
          </div>
          {events.length ? (
            <div className="px-1 py-1.5">
              <Plot
                data={trendData}
                layout={trendLayout}
                ariaLabel="Stacked area chart showing disaster frequency over time"
              />
            </div>
          ) : (
            <EmptyState
              title="No activity to plot"
              message="Adjust the date window or selected hazard classes to restore the timeline."
            />
          )}
        </section>

        <section className="panel flex flex-col">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Distribution by type"
              eyebrow="Composition"
              description="Proportional event count by hazard class."
            />
          </div>
          {hazards.length ? (
            <>
              <div className="px-2 pt-1">
                <Plot
                  data={distributionData}
                  layout={distributionLayout}
                  ariaLabel="Donut chart of events by disaster type"
                />
              </div>
              <div className="mt-auto px-4 pb-3">
                {hazards.map((hazard) => (
                  <div
                    key={hazard.id}
                    className="flex items-center gap-2 border-t border-line/60 py-[6px] first:border-t-0"
                  >
                    <HazardDot hazard={hazard.id} size={5} />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-muted">
                      {hazard.label}
                    </span>
                    <span className="num text-[9px] text-ink-soft">
                      {hazard.count.toLocaleString()}
                    </span>
                    <span className="num w-9 text-right text-[8px] text-muted-dim">
                      {hazard.share.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No hazard records"
              message="No records remain after applying the active filters."
            />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="panel">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Severity distribution"
              eyebrow="Intensity profile"
              description="Normalized severity across all selected hazards."
            />
          </div>
          {events.length ? (
            <>
              <div className="px-2 pt-2">
                <Plot
                  data={severityData}
                  layout={severityLayout}
                  ariaLabel="Bar chart of events by severity level"
                />
              </div>
              <div className="grid grid-cols-4 gap-px border-t border-line bg-line">
                {severities.map((severity) => (
                  <div key={severity.level} className="bg-panel px-2 py-2 text-center">
                    <div
                      className="num text-[12px]"
                      style={{ color: SEVERITY[severity.level].color }}
                    >
                      {severity.count}
                    </div>
                    <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.04em] text-muted-dim">
                      {severity.share.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
              <p className="border-t border-line px-4 py-2.5 text-[9.5px] leading-relaxed text-muted-dim">
                Critical and high correspond to GDACS red and orange alerts. Moderate and low cover green alerts and lower-magnitude seismic records.
              </p>
            </>
          ) : (
            <EmptyState title="No severity data" message="No records in the current selection." />
          )}
        </section>

        <section className="panel overflow-hidden xl:col-span-1">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Hazard × severity"
              eyebrow="Cross analysis"
              description="Event concentration by class and intensity."
            />
          </div>
          {matrix.length ? (
            <div className="overflow-x-auto p-3 scrollbar-thin">
              <table className="w-full min-w-[300px] border-separate border-spacing-[2px]">
                <thead>
                  <tr>
                    <th className="w-[88px] pb-1 text-left font-mono text-[7.5px] uppercase tracking-[0.05em] text-muted-dim">
                      Hazard
                    </th>
                    {SEVERITY_ORDER.map((level) => (
                      <th
                        key={level}
                        className="pb-1 text-center font-mono text-[7.5px] uppercase tracking-[0.04em]"
                        style={{ color: SEVERITY[level].color }}
                      >
                        {SEVERITY[level].label}
                      </th>
                    ))}
                    <th className="pb-1 text-right font-mono text-[7.5px] uppercase tracking-[0.04em] text-muted-dim">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.id}>
                      <td className="py-0.5">
                        <span className="flex items-center gap-1.5">
                          <HazardDot hazard={row.id} size={4} />
                          <span className="truncate text-[9px] text-muted">
                            {row.singular}
                          </span>
                        </span>
                      </td>
                      {SEVERITY_ORDER.map((level: SeverityLevel) => {
                        const count = row.counts[level];
                        const intensity = count / maximumSeverity;
                        return (
                          <td key={level} className="text-center">
                            <span
                              className="flex h-6 items-center justify-center rounded-[4px] border font-mono text-[8.5px] font-medium"
                              style={{
                                backgroundColor:
                                  count === 0
                                    ? "#fafbf9"
                                    : `${SEVERITY[level].color}${Math.round(
                                        0.05 + intensity * 0.14,
                                      )
                                        .toString(16)
                                        .padStart(2, "0")}`,
                                borderColor: count === 0 ? "#eef1ed" : `${SEVERITY[level].color}33`,
                                color: count === 0 ? "#a2ada7" : SEVERITY[level].color,
                              }}
                              title={`${row.label} · ${SEVERITY[level].label}: ${count}`}
                            >
                              {count}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center font-mono text-[9px] text-ink-soft">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No cross-analysis" message="No records in the current selection." />
          )}
        </section>

        <section className="panel">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Earthquake magnitude"
              eyebrow="Seismic profile"
              description="Distribution of recorded quake magnitudes."
            />
          </div>
          {magnitudeBuckets.some((bucket) => bucket.count > 0) ? (
            <>
              <div className="px-2 pt-2">
                <Plot
                  data={magnitudeData}
                  layout={magnitudeLayout}
                  ariaLabel="Bar chart of earthquake magnitude distribution"
                />
              </div>
              <div className="mx-3 mb-3 rounded-md border border-line/70 bg-[#f8faf7] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
                    Strongest event
                  </span>
                  <SeverityPill severity={strongest?.severity ?? "low"} compact />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="num text-[12px] text-ink">
                    {strongest ? `M ${strongest.magnitude?.toFixed(1)}` : "—"}
                  </span>
                  <span className="min-w-0 truncate text-[9px] text-muted">
                    {strongest?.location ?? "No earthquake record"}
                  </span>
                </div>
                {strongest && (
                  <div className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.04em] text-muted-dim">
                    {formatDateTime(strongest.timestamp)} UTC
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title="No earthquake data"
              message="Earthquakes are excluded or no seismic records fall in this window."
            />
          )}
        </section>
      </div>

      <div className="panel grid grid-cols-1 divide-y divide-line px-4 py-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            icon: <Activity size={11} />,
            label: "Counting basis",
            value: "One record per source event",
            note: "GDACS episodes deduplicated; USGS event IDs preserved.",
          },
          {
            icon: <CalendarClock size={11} />,
            label: "Timestamp basis",
            value: "Event occurrence · UTC",
            note: "Date boundaries are inclusive of the full final day.",
          },
          {
            icon: <ShieldAlert size={11} />,
            label: "Severity basis",
            value: "Alert level or magnitude",
            note: "GDACS Red/Orange/Green mapped to Critical/High/Moderate.",
          },
        ].map((item, index) => (
          <div key={item.label} className={index > 0 ? "pt-3 sm:pl-4 sm:pt-0" : "sm:pr-4"}>
            <div className="flex items-center gap-1.5 text-muted-dim">
              {item.icon}
              <span className="font-mono text-[8px] uppercase tracking-[0.08em]">
                {item.label}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-ink-soft">{item.value}</div>
            <div className="mt-0.5 text-[9px] leading-relaxed text-muted-dim">{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
