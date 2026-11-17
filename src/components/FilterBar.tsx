import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Globe2,
  Layers3,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { HAZARDS, SEVERITY, SEVERITY_ORDER, type HazardId } from "../lib/hazards";
import type { DisasterEvent } from "../lib/disasters";
import type { SeverityLevel } from "../lib/hazards";
import type { StatusFilter } from "../lib/analytics";
import { spanDays, todayInput } from "../lib/format";

export type DateMode = "range" | "day";

interface FilterBarProps {
  mode: DateMode;
  draftStart: string;
  draftEnd: string;
  appliedStart: string;
  appliedEnd: string;
  types: Set<HazardId>;
  eventsForCounts: DisasterEvent[];
  /** Ignores hazard + state filters so every disaster keeps its full state mix. */
  stateEvents: DisasterEvent[];
  status: StatusFilter;
  continent: string;
  country: string;
  severity: "all" | SeverityLevel;
  continents: string[];
  countries: string[];
  syncing?: boolean;
  validationError?: string;
  onModeChange: (mode: DateMode) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onTypesChange: (types: Set<HazardId>) => void;
  onStatusChange: (status: StatusFilter) => void;
  onContinentChange: (continent: string) => void;
  onCountryChange: (country: string) => void;
  onSeverityChange: (severity: "all" | SeverityLevel) => void;
}

export function FilterBar({
  mode,
  draftStart,
  draftEnd,
  appliedStart,
  appliedEnd,
  types,
  eventsForCounts,
  stateEvents,
  status,
  continent,
  country,
  severity,
  continents,
  countries,
  syncing,
  validationError,
  onModeChange,
  onStartChange,
  onEndChange,
  onTypesChange,
  onStatusChange,
  onContinentChange,
  onCountryChange,
  onSeverityChange,
}: FilterBarProps) {
  const [hazardOpen, setHazardOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const today = todayInput();

  const counts = useMemo(() => {
    const map = new Map<HazardId, number>();
    eventsForCounts.forEach((event) => {
      map.set(event.hazard, (map.get(event.hazard) ?? 0) + 1);
    });
    return map;
  }, [eventsForCounts]);

  const stateMix = useMemo(() => {
    const map = new Map<HazardId, Record<SeverityLevel, number>>();
    HAZARDS.forEach((hazard) => {
      map.set(hazard.id, { critical: 0, high: 0, moderate: 0, low: 0 });
    });
    stateEvents.forEach((event) => {
      const row = map.get(event.hazard);
      if (row) row[event.severity] += 1;
    });
    return map;
  }, [stateEvents]);

  useEffect(() => {
    if (!hazardOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setHazardOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHazardOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hazardOpen]);

  const allSelected = types.size === HAZARDS.length;
  const selectionLabel =
    types.size === 0
      ? "No hazards"
      : allSelected
        ? "All hazards"
        : types.size === 1
          ? HAZARDS.find((hazard) => types.has(hazard.id))?.label ?? "1 hazard"
          : `${types.size} hazards`;

  const toggleType = (id: HazardId) => {
    const next = new Set(types);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onTypesChange(next);
  };

  return (
    <section
      className={cn("panel relative overflow-visible", hazardOpen ? "z-[1000]" : "z-10")}
      aria-label="Global data filters"
    >
      <div className="flex flex-wrap items-center gap-2.5 p-2.5 xl:flex-nowrap xl:gap-3">
        <div className="hidden items-center gap-2 pr-1 2xl:flex">
          <SlidersHorizontal size={12} className="text-muted-dim" strokeWidth={1.7} />
          <span className="micro-label whitespace-nowrap">Filter</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center rounded-lg border border-line bg-[#f3f5f2] p-[3px]"
            role="tablist"
            aria-label="Date filter mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "range"}
              onClick={() => onModeChange("range")}
              className="tab-pill h-[27px] px-2.5 text-[10.5px]"
              data-active={mode === "range"}
            >
              <CalendarRange size={11} strokeWidth={1.8} />
              Date range
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "day"}
              onClick={() => onModeChange("day")}
              className="tab-pill h-[27px] px-2.5 text-[10.5px]"
              data-active={mode === "day"}
            >
              <CalendarDays size={11} strokeWidth={1.8} />
              Single day
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="field h-[34px] w-[136px]">
              <CalendarDays size={12} className="shrink-0 text-muted-dim" strokeWidth={1.7} />
              <input
                type="date"
                value={draftStart}
                max={today}
                min="2000-01-01"
                aria-label={mode === "day" ? "Selected date" : "Start date"}
                onChange={(event) => onStartChange(event.target.value)}
              />
            </label>
            {mode === "range" && (
              <>
                <span className="font-mono text-[10px] text-muted-dim" aria-hidden="true">
                  →
                </span>
                <label className="field h-[34px] w-[136px]">
                  <CalendarDays size={12} className="shrink-0 text-muted-dim" strokeWidth={1.7} />
                  <input
                    type="date"
                    value={draftEnd}
                    min="2000-01-01"
                    max={today}
                    aria-label="End date"
                    onChange={(event) => onEndChange(event.target.value)}
                  />
                </label>
              </>
            )}
          </div>

          <span
            className={cn(
              "inline-flex h-[28px] items-center gap-1.5 rounded-md border px-2 font-mono text-[8.5px] uppercase tracking-[0.06em]",
              validationError
                ? "border-red-200 bg-red-50 text-critical"
                : syncing
                  ? "border-line bg-[#f7f9f6] text-muted"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
            aria-live="polite"
          >
            {syncing ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  validationError ? "bg-critical" : "bg-emerald-600",
                )}
              />
            )}
            {validationError ? "Invalid dates" : syncing ? "Updating" : "Auto-applied"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              className={cn(
                "field h-[36px] w-[178px] justify-between gap-2 pr-2 text-left transition-colors",
                hazardOpen && "border-signal/45",
              )}
              aria-haspopup="listbox"
              aria-expanded={hazardOpen}
              onClick={() => setHazardOpen((open) => !open)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Layers3 size={12} className="shrink-0 text-muted-dim" strokeWidth={1.7} />
                <span className="truncate text-[11.5px] text-ink-soft">{selectionLabel}</span>
              </span>
              <ChevronDown
                size={12}
                className={cn(
                  "shrink-0 text-muted-dim transition-transform",
                  hazardOpen && "rotate-180",
                )}
                strokeWidth={1.8}
              />
            </button>

            {hazardOpen && (
              <div
                className="panel-raised fade-in absolute right-0 z-50 mt-2 w-[338px] overflow-hidden"
                role="listbox"
                aria-label="Hazard classes with state counts"
              >
                <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                  <span className="micro-label">Disaster · states</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="text-[9.5px] text-muted transition-colors hover:text-ink"
                      onClick={() => onTypesChange(new Set(HAZARDS.map((h) => h.id)))}
                    >
                      All
                    </button>
                    <span className="text-line-strong">/</span>
                    <button
                      type="button"
                      className="text-[9.5px] text-muted transition-colors hover:text-ink"
                      onClick={() => onTypesChange(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-b border-line bg-[#fafbf9] px-3 py-1.5">
                  {SEVERITY_ORDER.map((level) => (
                    <span
                      key={level}
                      className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.05em]"
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

                <div className="p-1.5">
                  {HAZARDS.map((hazard) => {
                    const selected = types.has(hazard.id);
                    const mix = stateMix.get(hazard.id) ?? {
                      critical: 0,
                      high: 0,
                      moderate: 0,
                      low: 0,
                    };
                    return (
                      <button
                        key={hazard.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => toggleType(hazard.id)}
                        className={cn(
                          "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                          selected
                            ? "border-transparent hover:bg-[#f7f9f6]"
                            : "border-transparent opacity-60 hover:bg-[#f7f9f6] hover:opacity-100",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                              selected ? "border-transparent" : "border-line-strong",
                            )}
                            style={
                              selected
                                ? { backgroundColor: hazard.color, color: "#ffffff" }
                                : undefined
                            }
                          >
                            {selected && <Check size={9} strokeWidth={3.2} />}
                          </span>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: hazard.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-soft">
                            {hazard.label}
                          </span>
                          <span className="num text-[9.5px] text-muted-dim">
                            {(counts.get(hazard.id) ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-1 pl-[26px]">
                          {SEVERITY_ORDER.map((level) => (
                            <span
                              key={level}
                              className="flex items-center gap-1 rounded-[3px] px-1 py-[2px] font-mono text-[8.5px]"
                              style={{
                                color: SEVERITY[level].color,
                                backgroundColor: SEVERITY[level].soft,
                              }}
                              title={`${hazard.label} · ${SEVERITY[level].label}: ${mix[level]}`}
                            >
                              <span
                                className="h-1 w-1 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: SEVERITY[level].color,
                                  opacity: mix[level] === 0 ? 0.3 : 1,
                                }}
                              />
                              {mix[level]}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-line px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-dim">
                    {types.size} of {HAZARDS.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setHazardOpen(false)}
                    className="text-muted-dim transition-colors hover:text-ink"
                    aria-label="Close hazard filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <select
              className="field h-[36px] w-[138px] appearance-none pr-7 text-[10.5px] text-ink-soft outline-none"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
              aria-label="Event status filter"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="historical">Historical only</option>
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-dim"
              strokeWidth={1.8}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-2.5 py-2">
        <span className="mr-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          <Globe2 size={11} strokeWidth={1.8} /> Location
        </span>
        <div className="relative">
          <select
            className="field h-[32px] w-[158px] appearance-none pr-7 text-[10.5px] text-ink"
            value={continent}
            onChange={(event) => onContinentChange(event.target.value)}
            aria-label="Filter by continent"
          >
            <option value="all">All continents</option>
            {continents.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
        <div className="relative">
          <select
            className="field h-[32px] w-[166px] appearance-none pr-7 text-[10.5px] text-ink"
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
            aria-label="Filter by country"
          >
            <option value="all">All countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
        <span className="mx-1 h-4 w-px bg-line-strong" />
        <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          Disaster state
        </span>
        {(["all", "critical", "high", "moderate", "low"] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onSeverityChange(level)}
            aria-pressed={severity === level}
            className="chip-button h-[27px] px-2"
            data-active={severity === level}
            style={
              severity === level && level !== "all"
                ? {
                    color: SEVERITY[level].color,
                    borderColor: `${SEVERITY[level].color}66`,
                    backgroundColor: SEVERITY[level].soft,
                  }
                : undefined
            }
          >
            {level !== "all" && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: SEVERITY[level].color }}
              />
            )}
            {level === "all" ? "All states" : SEVERITY[level].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.07em] text-muted-dim">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-signal" />
            Applied · {spanDays(appliedStart, appliedEnd)} day{" "}
            {appliedStart === appliedEnd ? "date" : "window"}
          </span>
          <span className="hidden text-line-strong sm:inline">|</span>
          <span className="hidden sm:inline">
            {eventsForCounts.length.toLocaleString()} records
          </span>
          <span className="hidden text-line-strong sm:inline">|</span>
          <span className="hidden sm:inline">Full end day included · UTC</span>
        </div>
        <div
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.07em]",
            validationError ? "text-critical" : "text-muted-dim",
          )}
          aria-live="polite"
        >
          {validationError ?? (syncing ? "Updating data…" : "Changes apply automatically")}
        </div>
      </div>
    </section>
  );
}
