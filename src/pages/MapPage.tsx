import { useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Globe2,
  Layers3,
  MapPin,
  MousePointer2,
  MoveRight,
  Radio,
  X,
} from "lucide-react";
import type { DisasterEvent, FeedMeta } from "../lib/disasters";
import { HAZARDS, HAZARD_MAP, SEVERITY, SEVERITY_ORDER, type HazardId } from "../lib/hazards";
import { hazardSeverityMatrix } from "../lib/analytics";
import { formatDateTime, formatRange, spanDays } from "../lib/format";
import { PageHeading } from "../components/PageHeading";
import { WorldMap } from "../components/WorldMap";
import {
  ActivePill,
  HazardDot,
  SeverityPill,
  SourcePill,
} from "../components/ui";
import { cn } from "../utils/cn";

interface MapPageProps {
  events: DisasterEvent[];
  countsBase: DisasterEvent[];
  stateBase: DisasterEvent[];
  start: string;
  end: string;
  meta?: FeedMeta;
  types: Set<HazardId>;
  onTypesChange: (types: Set<HazardId>) => void;
  selectedId?: string;
  onSelect: (event: DisasterEvent | null) => void;
}

function MapLegend({
  types,
  countsBase,
  onTypesChange,
  compact = false,
}: {
  types: Set<HazardId>;
  countsBase: DisasterEvent[];
  onTypesChange: (types: Set<HazardId>) => void;
  compact?: boolean;
}) {
  const counts = useMemo(() => {
    const map = new Map<HazardId, number>();
    countsBase.forEach((event) => map.set(event.hazard, (map.get(event.hazard) ?? 0) + 1));
    return map;
  }, [countsBase]);

  const toggle = (hazard: HazardId) => {
    const next = new Set(types);
    if (next.has(hazard)) next.delete(hazard);
    else next.add(hazard);
    onTypesChange(next);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#1f2825] bg-[#080b0a] px-3 py-2.5">
        <span className="mr-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#84918b]">
          Legend
        </span>
        {HAZARDS.map((hazard) => {
          const active = types.has(hazard.id);
          return (
            <button
              key={hazard.id}
              type="button"
              onClick={() => toggle(hazard.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded border px-1.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.03em] transition-colors",
                active
                  ? "border-[#35413d] bg-white/[0.07] text-[#eef3ef]"
                  : "border-[#242c2a] text-[#78857f] opacity-70",
              )}
              title={`${active ? "Hide" : "Show"} ${hazard.label}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: hazard.color }}
              />
              {hazard.short}
              <span className="text-[#84918b]">{counts.get(hazard.id) ?? 0}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="absolute left-3 top-3 z-[500] hidden w-[204px] overflow-hidden rounded-lg border border-[#313a38] bg-[#0b0f0e]/95 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur md:block"
      aria-label="Map hazard legend"
    >
      <div className="flex items-center justify-between border-b border-[#242c2a] px-2.5 py-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#9aa6a0]">
          Hazard layers
        </span>
        <Layers3 size={10} className="text-[#84918b]" />
      </div>
      <div className="p-1">
        {HAZARDS.map((hazard) => {
          const active = types.has(hazard.id);
          return (
            <button
              key={hazard.id}
              type="button"
              onClick={() => toggle(hazard.id)}
              aria-pressed={active}
              className="flex w-full items-center gap-2 rounded px-1.5 py-[5px] text-left transition-colors hover:bg-white/[0.05]"
            >
              <span
                className={cn(
                  "flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border transition-opacity",
                  active ? "border-transparent" : "border-muted-dim/50",
                )}
                style={active ? { backgroundColor: hazard.color, color: "#ffffff" } : undefined}
              >
                {active && <Check size={8} strokeWidth={3.5} />}
              </span>
              <HazardDot hazard={hazard.id} size={5} />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[10px]",
                  active ? "text-[#eef3ef]" : "text-[#78857f]",
                )}
              >
                {hazard.label}
              </span>
              <span className="num text-[8.5px] text-[#9aa6a0]">{counts.get(hazard.id) ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-[#242c2a] px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => onTypesChange(new Set(HAZARDS.map((hazard) => hazard.id)))}
          className="font-mono text-[8px] uppercase tracking-[0.06em] text-[#b3bfb9] transition-colors hover:text-white"
        >
          All hazards
        </button>
        <button
          type="button"
          onClick={() => onTypesChange(new Set())}
          className="font-mono text-[8px] uppercase tracking-[0.06em] text-[#78857f] transition-colors hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function MapPage({
  events,
  countsBase,
  stateBase,
  start,
  end,
  meta,
  types,
  onTypesChange,
  selectedId,
  onSelect,
}: MapPageProps) {
  const [legendOpen, setLegendOpen] = useState(true);
  const activeCount = events.filter((event) => event.active).length;
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const priority = useMemo(
    () =>
      [...events]
        .sort(
          (a, b) =>
            SEVERITY[b.severity].score - SEVERITY[a.severity].score ||
            (b.magnitude ?? 0) - (a.magnitude ?? 0) ||
            b.timestamp - a.timestamp,
        )
        .slice(0, 4),
    [events],
  );
  const stateRows = useMemo(() => hazardSeverityMatrix(stateBase), [stateBase]);
  const selectedMix = selected
    ? stateRows.find((row) => row.id === selected.hazard)
    : undefined;

  return (
    <div className="fade-in space-y-4">
      <PageHeading
        eyebrow="Geospatial analysis"
        title="Disaster map"
        description="Marker fill identifies the disaster type; the outer ring identifies its state (red critical, amber high, blue moderate, green low). Select a marker to inspect the record and the full state profile for that disaster."
        start={start}
        end={end}
        aside={
          <div className="hidden items-center gap-5 rounded-lg border border-line bg-[#f8faf7] px-3.5 py-2.5 lg:flex">
            <div>
              <div className="micro-label mb-1">Mapped records</div>
              <div className="num text-[15px] leading-none text-ink">
                {events.length.toLocaleString()}
              </div>
            </div>
            <div className="h-7 w-px bg-line" />
            <div>
              <div className="micro-label mb-1">Active</div>
              <div className="num text-[15px] leading-none text-live">
                {activeCount.toLocaleString()}
              </div>
            </div>
            <div className="h-7 w-px bg-line" />
            <div>
              <div className="micro-label mb-1">Critical</div>
              <div className="num text-[15px] leading-none text-critical">
                {criticalCount.toLocaleString()}
              </div>
            </div>
          </div>
        }
      />

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="micro-label mb-1.5">State breakdown</div>
            <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-ink">
              Severity profile by disaster
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Every disaster keeps its own critical, high, moderate and low counts.
              These counts ignore the state and disaster filters so the full profile stays visible.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 rounded-md border border-line bg-[#fafbf9] px-2.5 py-1.5">
            {SEVERITY_ORDER.map((level) => (
              <span
                key={level}
                className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.05em]"
                style={{ color: SEVERITY[level].color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: SEVERITY[level].color }}
                />
                {SEVERITY[level].label}
              </span>
            ))}
          </div>
        </div>
        {stateRows.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center px-4 text-[11px] text-muted">
            No disaster records in this date and location selection.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="data-table w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <th>Disaster</th>
                  <th className="text-center">Total</th>
                  {SEVERITY_ORDER.map((level) => (
                    <th key={level} className="text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: SEVERITY[level].color }}
                        />
                        <span style={{ color: SEVERITY[level].color }}>
                          {SEVERITY[level].label}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {stateRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        <HazardDot hazard={row.id} size={6} />
                        <span className="font-medium text-ink">{row.label}</span>
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="num text-[11px] text-ink">{row.total.toLocaleString()}</span>
                    </td>
                    {SEVERITY_ORDER.map((level) => {
                      const count = row.counts[level];
                      return (
                        <td key={level} className="text-center">
                          <span
                            className="inline-flex min-w-[44px] items-center justify-center rounded-[4px] border px-1.5 py-1 font-mono text-[10px] font-medium"
                            style={{
                              color: count === 0 ? "#9aa6a0" : SEVERITY[level].color,
                              borderColor: count === 0 ? "#e4e8e4" : `${SEVERITY[level].color}33`,
                              backgroundColor: count === 0 ? "#fafbf9" : SEVERITY[level].soft,
                            }}
                          >
                            {count.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                    <td>
                      <span className="flex h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[#eef1ed]">
                        {SEVERITY_ORDER.map((level) => {
                          const width = row.total ? (row.counts[level] / row.total) * 100 : 0;
                          return width === 0 ? null : (
                            <span
                              key={level}
                              style={{
                                width: `${width}%`,
                                backgroundColor: SEVERITY[level].color,
                              }}
                              title={`${SEVERITY[level].label}: ${row.counts[level]}`}
                            />
                          );
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_316px]">
        <section className="overflow-hidden rounded-xl border border-[#1e2825] bg-[#080b0a] shadow-[0_10px_30px_-18px_rgba(10,20,16,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2825] bg-[#0a0e0d] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Globe2 size={12} className="text-[#84918b]" strokeWidth={1.7} />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#c3cec8]">
                Global hazard plot
              </span>
              <span className="hidden h-3 w-px bg-[#242c2a] sm:block" />
              <span className="hidden font-mono text-[8px] uppercase tracking-[0.06em] text-[#84918b] sm:inline">
                {formatRange(start, end)} · {spanDays(start, end)}D
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[#9aa6a0]">
                <span className="live-dot h-[4px] w-[4px]" />
                Live layers
              </span>
              <button
                type="button"
                className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.06em] text-[#9aa6a0] transition-colors hover:text-white md:hidden"
                onClick={() => setLegendOpen((value) => !value)}
                aria-expanded={legendOpen}
              >
                <Layers3 size={10} />
                Legend
              </button>
            </div>
          </div>

          {legendOpen && (
            <div className="md:hidden">
              <MapLegend
                types={types}
                countsBase={countsBase}
                onTypesChange={onTypesChange}
                compact
              />
            </div>
          )}

          <div className="relative h-[520px] w-full sm:h-[590px]">
            <WorldMap
              events={events}
              selectedId={selectedId}
              onSelect={onSelect}
              selectedMix={selectedMix?.counts}
              className="absolute inset-0"
            />
            <MapLegend
              types={types}
              countsBase={countsBase}
              onTypesChange={onTypesChange}
            />
            <div className="pointer-events-none absolute left-1/2 top-3 z-[450] flex -translate-x-1/2 items-center gap-1.5 rounded border border-white/15 bg-black/55 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] text-white/80 backdrop-blur">
              <Crosshair size={9} />
              Click marker to inspect
            </div>
            {events.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-[480] flex items-center justify-center">
                <div className="rounded-lg border border-[#313a38] bg-[#0b0f0e]/95 px-4 py-3 text-center backdrop-blur">
                  <p className="text-[11.5px] font-medium text-[#eef3ef]">
                    No hazards plotted
                  </p>
                  <p className="mt-1 text-[10px] text-[#9aa6a0]">
                    Adjust hazard classes or the date window.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2825] bg-[#0a0e0d] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {(["critical", "high", "moderate", "low"] as const).map((level) => {
                const count = events.filter((event) => event.severity === level).length;
                return (
                  <span
                    key={level}
                    className="flex items-center gap-1.5 text-[9.5px] text-[#e4ebe6]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: SEVERITY[level].color }}
                    />
                    {SEVERITY[level].label}
                    <span className="num text-[9px] text-[#a9b5af]">
                      {count.toLocaleString()}
                    </span>
                  </span>
                );
              })}
              <span className="hidden items-center gap-1.5 text-[9.5px] text-[#a9b5af] sm:flex">
                <span className="h-2 w-2 rounded-full border border-dashed border-white/50" />
                Active alert
              </span>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim/70">
              USGS · GDACS / Esri dark basemap
            </span>
          </div>
        </section>

        <aside className="panel flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Radio size={11} className="text-muted-dim" strokeWidth={1.8} />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Event inspector
              </span>
            </div>
            {selected && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="icon-button h-6 w-6"
                aria-label="Close event inspector"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {selected ? (
            <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
              <div
                className="border-b border-line px-4 py-4"
                style={{
                  background: `linear-gradient(135deg, ${HAZARD_MAP[selected.hazard].color}0f, transparent 68%)`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em]"
                    style={{ color: HAZARD_MAP[selected.hazard].color }}
                  >
                    <HazardDot hazard={selected.hazard} size={5} />
                    {HAZARD_MAP[selected.hazard].label}
                  </span>
                  <ActivePill active={selected.active} />
                </div>
                <h2 className="mt-3 text-[14px] font-medium leading-snug tracking-[-0.015em] text-ink">
                  {selected.location}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <SeverityPill severity={selected.severity} />
                  <SourcePill source={selected.source} />
                  {selected.alertLevel && (
                    <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-muted-dim">
                      {selected.alertLevel} alert
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-line/70 px-4">
                {[
                  ["Recorded", formatDateTime(selected.timestamp) + " UTC"],
                  ["Measurement", selected.measure],
                  ["Country", selected.country],
                  ["Region", selected.region],
                  [
                    "Coordinates",
                    `${selected.lat.toFixed(3)}°, ${selected.lon.toFixed(3)}°`,
                  ],
                  ...(typeof selected.depthKm === "number"
                    ? [["Depth", `${selected.depthKm.toFixed(1)} km`]]
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.07em] text-muted-dim">
                      {label}
                    </span>
                    <span className="max-w-[190px] text-right text-[10.5px] leading-relaxed text-ink-soft">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {selectedMix && (
                <div className="border-t border-line px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
                      All states · {HAZARD_MAP[selected.hazard].label}
                    </span>
                    <span className="num text-[9px] text-muted-dim">
                      {selectedMix.total.toLocaleString()} events
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {SEVERITY_ORDER.map((level) => (
                      <div
                        key={level}
                        className="rounded-[5px] border px-1.5 py-1.5 text-center"
                        style={{
                          borderColor: `${SEVERITY[level].color}33`,
                          backgroundColor: SEVERITY[level].soft,
                        }}
                        title={`${SEVERITY[level].label}: ${selectedMix.counts[level]}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="h-1 w-1 rounded-full"
                            style={{ backgroundColor: SEVERITY[level].color }}
                          />
                          <span
                            className="font-mono text-[7px] uppercase tracking-[0.03em]"
                            style={{ color: SEVERITY[level].color }}
                          >
                            {SEVERITY[level].label.slice(0, 3)}
                          </span>
                        </div>
                        <div className="num mt-0.5 text-[12px] text-ink">
                          {selectedMix.counts[level].toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.affectedCountries && selected.affectedCountries.length > 1 && (
                <div className="px-4 py-3">
                  <div className="micro-label mb-2">Affected countries</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.affectedCountries.slice(0, 8).map((country) => (
                      <span
                        key={country}
                        className="rounded border border-line bg-[#f8faf7] px-1.5 py-1 text-[9px] text-muted"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.description && (
                <div className="px-4 py-3">
                  <div className="micro-label mb-2">Record note</div>
                  <p className="text-[10.5px] leading-relaxed text-muted">
                    {selected.description}
                  </p>
                </div>
              )}

              <div className="mt-auto border-t border-line p-3">
                {selected.sourceUrl ? (
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="icon-button w-full justify-between px-2.5 text-[10.5px] text-ink-soft"
                  >
                    Open {selected.source} source record
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="block py-1 text-center font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted-dim">
                    No external record available
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-3 border-b border-line/70 px-4 py-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel-raised text-muted">
                  <MousePointer2 size={15} strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-[11.5px] font-medium text-ink-soft">
                    No event selected
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                    Click any marker on the map to inspect its full record.
                  </p>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="micro-label mb-2.5">Most severe</div>
                {priority.length === 0 ? (
                  <p className="py-4 text-[10.5px] text-muted">
                    No events match the current filters.
                  </p>
                ) : (
                  priority.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelect(event)}
                      className="event-row flex w-full items-center gap-2 border-b border-line/60 py-2.5 text-left last:border-b-0"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: HAZARD_MAP[event.hazard].color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10.5px] text-ink-soft">
                          {event.location}
                        </div>
                        <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.04em] text-muted-dim">
                          {HAZARD_MAP[event.hazard].short} · {event.measure}
                        </div>
                      </div>
                      <SeverityPill severity={event.severity} compact />
                      <ChevronRight size={11} className="shrink-0 text-muted-dim" />
                    </button>
                  ))
                )}
              </div>

              <div className="mt-auto border-t border-line p-3">
                <div className="rounded-md border border-line/70 bg-[#f8faf7] p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Activity size={10} className="text-muted-dim" />
                    <span className="font-mono text-[8px] uppercase tracking-[0.07em] text-muted">
                      How to read this map
                    </span>
                  </div>
                  <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted-dim">
                    Ring colour identifies the state. Marker fill identifies the
                    disaster type. Dashed rings mark active alerts; size reflects
                    magnitude or severity. State counts cover the whole disaster class.
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted-dim">
          <MapPin size={10} />
          <span>
            {events.length.toLocaleString()} events plotted across{" "}
            {new Set(events.map((event) => event.country)).size} countries
          </span>
          <MoveRight size={10} className="mx-1 text-line-strong" />
          <span>UTC timestamps</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted-dim">
          <span>Coverage:</span>
          <span className="text-muted">
            {meta?.minMagnitude ? `USGS M${meta.minMagnitude.toFixed(1)}+` : "USGS quakes"}
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="text-muted">GDACS all alert levels</span>
        </div>
      </div>
    </div>
  );
}
