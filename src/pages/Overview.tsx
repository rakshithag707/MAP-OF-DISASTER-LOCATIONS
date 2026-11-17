import { useMemo, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Flame,
  Globe2,
  MapPin,
  Mountain,
  Radar,
  Sun,
  Waves,
  Wind,
} from "lucide-react";
import type { DisasterEvent, FeedMeta } from "../lib/disasters";
import {
  buildTimeSeries,
  hazardCounts,
  regionStats,
  significantEvents,
  summarize,
  severityCounts,
} from "../lib/analytics";
import { HAZARD_MAP, SEVERITY, type HazardId } from "../lib/hazards";
import { formatDate, formatDateTime, formatRange, spanDays } from "../lib/format";
import { PageHeading } from "../components/PageHeading";
import { Plot } from "../components/Plot";
import { baseLayout } from "../lib/chartTheme";
import {
  ActivePill,
  HazardDot,
  SectionHeader,
  SeverityPill,
  SeverityStrip,
  SourcePill,
} from "../components/ui";

const HAZARD_ICONS: Record<HazardId, typeof Activity> = {
  earthquake: Activity,
  flood: Waves,
  wildfire: Flame,
  volcano: Mountain,
  storm: Wind,
  drought: Sun,
};

function MetricCard({
  label,
  value,
  caption,
  accent,
  icon,
  footer,
  detail,
}: {
  label: string;
  value: ReactNode;
  caption: string;
  accent: string;
  icon: ReactNode;
  footer?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <article className="panel group relative min-h-[148px] overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="micro-label">{label}</span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md border"
          style={{
            color: accent,
            borderColor: `${accent}26`,
            backgroundColor: `${accent}0f`,
          }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 flex min-h-[32px] items-end gap-2">
        <div className="text-[26px] font-semibold leading-none tracking-[-0.045em] text-ink">
          {value}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[10.5px] text-muted">{caption}</p>
      <div className="mt-2.5 flex min-h-[16px] items-center justify-between gap-2 border-t border-line/60 pt-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[8.5px] uppercase tracking-[0.05em] text-muted-dim">
          {footer}
        </span>
        <span className="flex shrink-0 items-center">{detail}</span>
      </div>
    </article>
  );
}

interface OverviewProps {
  events: DisasterEvent[];
  start: string;
  end: string;
  meta?: FeedMeta;
  onNavigate: (page: "map" | "regional" | "analytics") => void;
  onInspect: (event: DisasterEvent) => void;
}

export function Overview({
  events,
  start,
  end,
  meta,
  onNavigate,
  onInspect,
}: OverviewProps) {
  const days = spanDays(start, end);
  const summary = useMemo(() => summarize(events, days), [events, days]);
  const hazards = useMemo(() => hazardCounts(events).filter((h) => h.count > 0), [events]);
  const severities = useMemo(() => severityCounts(events), [events]);
  const timeSeries = useMemo(() => buildTimeSeries(events, start, end), [events, start, end]);
  const regions = useMemo(
    () =>
      regionStats(events)
        .filter((region) => region.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 4),
    [events],
  );
  const significant = useMemo(() => significantEvents(events, 5), [events]);
  const topHazard = summary.topHazard ? HAZARD_MAP[summary.topHazard.id] : undefined;
  const TopHazardIcon = topHazard ? HAZARD_ICONS[topHazard.id] : Activity;
  const criticalShare = events.length
    ? ((summary.critical / events.length) * 100).toFixed(1)
    : "0.0";
  const maxBar = Math.max(1, ...timeSeries.buckets.map((bucket) => bucket.total));

  const trendData = useMemo(() => {
    const activeHazards = hazards.map((hazard) => HAZARD_MAP[hazard.id]);
    return activeHazards.map((hazard) => ({
      type: "scatter",
      mode: "lines",
      name: hazard.label,
      x: timeSeries.buckets.map((bucket) => bucket.label),
      y: timeSeries.buckets.map((bucket) => bucket.counts[hazard.id] ?? 0),
      stackgroup: "hazards",
      line: { width: 0.8, color: hazard.color },
      fillcolor: `${hazard.color}2e`,
      hovertemplate: `%{y} ${hazard.label.toLowerCase()}<extra></extra>`,
    }));
  }, [hazards, timeSeries]);

  const trendLayout = useMemo(
    () =>
      baseLayout({
        height: 258,
        margin: { l: 32, r: 10, t: 32, b: 26 },
        showlegend: hazards.length <= 4,
        legend: {
          orientation: "h",
          x: 0,
          y: 1.18,
          font: { family: "IBM Plex Mono, monospace", size: 8.5, color: "#3f4a44" },
        },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.032)",
          tickfont: { size: 9, color: "#59635d" },
          nticks: 7,
          tickangle: 0,
          fixedrange: true,
        },
        yaxis: {
          gridcolor: "rgba(255,255,255,0.045)",
          tickfont: { size: 9, color: "#59635d" },
          rangemode: "tozero",
          fixedrange: true,
        },
        hovermode: "x unified",
      }),
    [hazards.length],
  );

  const donutData = useMemo(
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
        textinfo: "none",
        hovertemplate: "%{label}<br>%{value} events · %{percent}<extra></extra>",
      },
    ],
    [hazards],
  );

  const donutLayout = useMemo(
    () =>
      baseLayout({
        height: 176,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        hovermode: "closest",
        annotations: [
          {
            text: `<b>${events.length.toLocaleString()}</b><br><span style="font-family:IBM Plex Mono,monospace;font-size:8px;letter-spacing:.12em;color:#6f7a75;">EVENTS</span>`,
            showarrow: false,
            font: {
              family: "IBM Plex Mono, monospace",
              size: 23,
              color: "#0c1210",
            },
            x: 0.5,
            y: 0.5,
          },
        ],
      }),
    [events.length],
  );

  return (
    <div className="fade-in space-y-4">
      <PageHeading
        eyebrow="Summary"
        title="Disaster overview"
        description="A summary of recorded natural hazards, active alerts and geographic exposure across the selected reporting window."
        start={start}
        end={end}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total recorded events"
          value={summary.total.toLocaleString()}
          caption={`${summary.averagePerDay.toFixed(1)} events per day in window`}
          accent="#c2410c"
          icon={<Activity size={12} strokeWidth={1.9} />}
          footer="Observation window"
          detail={
            <div className="flex h-[16px] items-end gap-[2px]" aria-hidden="true">
              {timeSeries.buckets.slice(-18).map((bucket, index) => (
                <span
                  key={index}
                  className="w-[2px] rounded-sm bg-signal/55"
                  style={{ height: `${Math.max(2, (bucket.total / maxBar) * 14)}px` }}
                />
              ))}
            </div>
          }
        />
        <MetricCard
          label="Active events"
          value={summary.active.toLocaleString()}
          caption="Ongoing GDACS alerts; historical events remain queryable"
          accent="#15803d"
          icon={<Radar size={12} strokeWidth={1.9} />}
          footer={`${summary.activeShare.toFixed(1)}% of all records`}
          detail={
            <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-live/80">
              <span className="live-dot h-[4px] w-[4px]" />
              Monitoring
            </span>
          }
        />
        <MetricCard
          label="Most frequent disaster"
          value={
            topHazard ? (
              <span className="flex items-center gap-2 text-[21px]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: topHazard.color,
                    boxShadow: `0 0 0 4px ${topHazard.soft}`,
                  }}
                />
                {topHazard.label}
              </span>
            ) : (
              "—"
            )
          }
          caption={
            summary.topHazard
              ? `${(summary.topHazard.count ?? 0).toLocaleString()} events · ${summary.topHazard.share.toFixed(1)}% of activity`
              : "No hazard records in this window"
          }
          accent={topHazard?.color ?? "#c2410c"}
          icon={<TopHazardIcon size={12} strokeWidth={1.9} />}
          footer="Ranked by event frequency"
          detail={
            <span className="num text-[9px] text-muted">
              {summary.topHazard ? `${summary.topHazard.count.toLocaleString()}` : "0"}
            </span>
          }
        />
        <MetricCard
          label="Most affected region"
          value={summary.topRegion}
          caption={`Leading country: ${summary.topCountry}${summary.topCountryCount ? ` (${summary.topCountryCount.toLocaleString()})` : ""}`}
          accent="#0e7490"
          icon={<Globe2 size={12} strokeWidth={1.9} />}
          footer={`${summary.topRegionCount.toLocaleString()} recorded events`}
          detail={
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
              {summary.countryCount} countries
            </span>
          }
        />
      </div>

      <section className="panel px-4 py-3">
        <SeverityStrip items={severities} />
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="panel overflow-hidden xl:col-span-2">
          <div className="p-4 pb-0">
            <SectionHeader
              title="Activity over time"
              description={`${timeSeries.granularity} event count, stacked by hazard class. Hover to inspect the composition.`}
              eyebrow="Activity"
              action={
                <span className="hidden items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.07em] text-muted sm:flex">
                  <Activity size={9} />
                  {summary.peakDay
                    ? `Peak ${formatDate(`${summary.peakDay.date}T12:00:00Z`, { month: "short", day: "numeric" })} · ${summary.peakDay.count}`
                    : "No activity"}
                </span>
              }
            />
          </div>
          <div className="px-1 pb-1 pt-1">
            {events.length ? (
              <Plot
                data={trendData}
                layout={trendLayout}
                ariaLabel="Stacked area chart of disaster activity over time by hazard class"
              />
            ) : (
              <div className="flex h-[246px] items-center justify-center text-[11px] text-muted">
                No events match the current filters.
              </div>
            )}
          </div>
        </section>

        <section className="panel flex flex-col overflow-hidden">
          <div className="p-4 pb-0">
            <SectionHeader
              title="Hazard composition"
              eyebrow="Distribution"
              description="Share of recorded events by disaster class."
            />
          </div>
          {events.length ? (
            <div className="px-3 pt-1">
              <Plot
                data={donutData}
                layout={donutLayout}
                ariaLabel="Donut chart of disaster types"
                className="min-h-[140px]"
              />
              <div className="space-y-0 px-1 pb-2">
                {hazards.slice(0, 5).map((hazard) => (
                  <div
                    key={hazard.id}
                    className="flex items-center gap-2 border-t border-line/60 py-[6px] first:border-t-0"
                  >
                    <HazardDot hazard={hazard.id} size={5} />
                    <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted">
                      {hazard.label}
                    </span>
                    <span className="num text-[9.5px] text-ink-soft">
                      {hazard.count.toLocaleString()}
                    </span>
                    <span className="num w-8 text-right text-[8.5px] text-muted-dim">
                      {hazard.share.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-[11px] text-muted">
              No hazard composition available.
            </div>
          )}
          <div className="mt-auto border-t border-line px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.07em] text-muted-dim">
                Critical events
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-1 w-20 overflow-hidden rounded-full bg-line">
                  <span
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Number(criticalShare))}%`,
                      backgroundColor: SEVERITY.critical.color,
                    }}
                  />
                </div>
                <span className="num text-[9px] text-ink-soft">
                  {summary.critical} · {criticalShare}%
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="panel overflow-hidden xl:col-span-2">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <SectionHeader
              title="Significant events"
              eyebrow="Most severe events"
              description="Ranked by severity, then magnitude or intensity."
            />
            <button
              type="button"
              onClick={() => onNavigate("map")}
              className="shrink-0 pt-0.5 font-mono text-[9px] uppercase tracking-[0.07em] text-muted transition-colors hover:text-ink"
            >
              Open map →
            </button>
          </div>
          <div>
            {significant.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-[11px] text-muted">
                No significant events for this filter set.
              </div>
            ) : (
              significant.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => onInspect(event)}
                  className="event-row flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left last:border-b-0"
                >
                  <span
                    className="mt-0.5 h-7 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: HAZARD_MAP[event.hazard].color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[11.5px] font-medium text-ink-soft">
                        {HAZARD_MAP[event.hazard].singular}
                      </span>
                      <span className="text-muted-dim">·</span>
                      <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted">
                        <MapPin size={9} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.05em] text-muted-dim">
                        {formatDateTime(event.timestamp)} UTC
                      </span>
                      <span className="h-2 w-px bg-line" />
                      <span className="num text-[8.5px] text-muted">{event.measure}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                    <SeverityPill severity={event.severity} />
                    <span className="flex items-center gap-1.5">
                      <ActivePill active={event.active} />
                      <SourcePill source={event.source} />
                    </span>
                  </div>
                  <ChevronRight size={13} className="shrink-0 text-muted-dim" />
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel flex flex-col overflow-hidden">
          <div className="border-b border-line p-4">
            <SectionHeader
              title="Regional exposure"
              eyebrow="By region"
              description="Regions ranked by recorded events in the window."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate("regional")}
                  className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted transition-colors hover:text-ink"
                >
                  Full view <ArrowUpRight size={10} />
                </button>
              }
            />
          </div>
          <div className="flex-1 px-4 py-1.5">
            {regions.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-[11px] text-muted">
                No region records.
              </div>
            ) : (
              regions.map((region) => {
                const max = regions[0].total || 1;
                return (
                  <button
                    type="button"
                    key={region.region}
                    onClick={() => onNavigate("regional")}
                    className="group w-full border-b border-line/60 py-2.5 text-left last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: region.color }}
                        />
                        <span className="truncate text-[10.5px] text-ink-soft">
                          {region.region}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[9.5px] text-muted">
                        {region.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full opacity-80 transition-all group-hover:opacity-100"
                          style={{
                            width: `${Math.max(3, (region.total / max) * 100)}%`,
                            backgroundColor: region.color,
                          }}
                        />
                      </div>
                      <span className="num w-9 text-right text-[8px] text-muted-dim">
                        {region.share.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-line p-3">
            <div className="grid grid-cols-2 gap-2">
              {severities.slice(0, 2).map((severity) => (
                <div
                  key={severity.level}
                  className="rounded-md border border-line/70 bg-[#f8faf7] px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: SEVERITY[severity.level].color }}
                    />
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                      {SEVERITY[severity.level].label}
                    </span>
                  </div>
                  <div className="num mt-1 text-[15px] text-ink">
                    {severity.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="panel flex flex-col justify-between gap-3 px-4 py-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted-dim">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="live-dot h-[4px] w-[4px]" /> Official public feeds
          </span>
          <span className="hidden h-3 w-px bg-line md:block" />
          <span>
            USGS <span className="text-ink-soft">{meta?.usgs.count.toLocaleString() ?? "—"}</span>
          </span>
          <span>
            GDACS <span className="text-ink-soft">{meta?.gdacs.count.toLocaleString() ?? "—"}</span>
          </span>
          <span>
            Excluded <span className="text-ink-soft">{meta?.dropped ?? 0}</span>
          </span>
          <span className="hidden sm:inline">
            Window {formatRange(start, end)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
            Normalized to UTC · no fabricated records
          </span>
        </div>
      </div>
    </div>
  );
}
