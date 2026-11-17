import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarRange, Check, RotateCcw, WifiOff, X } from "lucide-react";
import { useDisasterData } from "./hooks/useDisasterData";
import {
  filterEvents,
  type StatusFilter,
} from "./lib/analytics";
import { ALL_HAZARD_IDS, HAZARDS, type HazardId, type SeverityLevel } from "./lib/hazards";
import { REGIONS } from "./lib/hazards";
import type { DisasterEvent } from "./lib/disasters";
import { addDays, spanDays, toDateInput, todayInput } from "./lib/format";
import { pageById, PAGES, type PageId } from "./lib/navigation";
import { cn } from "./utils/cn";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { FeedPanel } from "./components/FeedPanel";
import { FilterBar, type DateMode } from "./components/FilterBar";
import { InlineNotice } from "./components/ui";
import datasetCsv from "./data/disasters.csv?raw";
import { countCsvRows, eventsToCsv, triggerCsvDownload } from "./lib/exportCsv";
import { Overview } from "./pages/Overview";
import { MapPage } from "./pages/MapPage";
import { Analytics } from "./pages/Analytics";
import { Regional } from "./pages/Regional";

function defaultWindow() {
  const today = new Date();
  return {
    start: toDateInput(addDays(today, -29)),
    end: toDateInput(today),
  };
}

function pageFromHash(): PageId {
  const hash = window.location.hash.replace("#", "");
  return PAGES.some((page) => page.id === hash) ? (hash as PageId) : "overview";
}

function AppSkeleton() {
  return (
    <div className="fade-in space-y-4" aria-busy="true" aria-label="Loading disaster analysis">
      <div className="space-y-3 pt-1">
        <div className="skeleton h-2.5 w-24" />
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-3 w-full max-w-[460px]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="panel h-[148px] p-4">
            <div className="flex justify-between">
              <div className="skeleton h-2 w-24" />
              <div className="skeleton h-6 w-6" />
            </div>
            <div className="skeleton mt-5 h-7 w-20" />
            <div className="skeleton mt-3 h-2.5 w-full" />
            <div className="skeleton mt-4 h-2 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="panel h-[320px] p-4 xl:col-span-2">
          <div className="skeleton h-2.5 w-28" />
          <div className="skeleton mt-3 h-3 w-2/3" />
          <div className="mt-8 flex h-[220px] items-end gap-2">
            {[42, 65, 38, 74, 54, 83, 46, 67, 58, 90, 48, 72, 36, 62, 79, 44].map(
              (height, index) => (
                <div
                  key={index}
                  className="skeleton flex-1 rounded-sm"
                  style={{ height: `${height}%` }}
                />
              ),
            )}
          </div>
        </div>
        <div className="panel flex h-[320px] items-center justify-center p-4">
          <div className="skeleton h-36 w-36 rounded-full" />
        </div>
      </div>
      <div className="panel p-4">
        <div className="skeleton h-2.5 w-32" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-9 w-full" />
          ))}
        </div>
      </div>
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-dim">
        Querying USGS FDSN · GDACS multi-hazard feeds
      </p>
    </div>
  );
}

export default function App() {
  const initial = defaultWindow();
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<{
    tone: "success" | "error";
    text: string;
  }>();
  const [mode, setMode] = useState<DateMode>("range");
  const [appliedStart, setAppliedStart] = useState(initial.start);
  const [appliedEnd, setAppliedEnd] = useState(initial.end);
  const [draftStart, setDraftStart] = useState(initial.start);
  const [draftEnd, setDraftEnd] = useState(initial.end);
  const [types, setTypes] = useState<Set<HazardId>>(new Set(ALL_HAZARD_IDS));
  const [status, setStatus] = useState<StatusFilter>("all");
  const [continent, setContinent] = useState("all");
  const [country, setCountry] = useState("all");
  const [severity, setSeverity] = useState<"all" | SeverityLevel>("all");
  const [selectedId, setSelectedId] = useState<string>();
  const today = todayInput();
  const datasetRecords = useMemo(() => countCsvRows(datasetCsv), []);

  const { status: loadStatus, data, events, meta, error, refreshing, refresh } =
    useDisasterData(appliedStart, appliedEnd);

  const effectiveDraftEnd = mode === "day" ? draftStart : draftEnd;
  const draftSpan = spanDays(draftStart, effectiveDraftEnd);
  const validationError =
    !draftStart || !effectiveDraftEnd
      ? "Select a valid date"
      : draftEnd < draftStart
        ? "End date must follow start date"
        : draftEnd > today
          ? "Future dates are unavailable"
          : draftSpan > 730
            ? "Maximum window is 730 days"
            : undefined;
  const continents = useMemo(() => {
    const found = Array.from(new Set(events.map((event) => event.region))).filter(
      (region) => region && region !== "Remote / Oceanic",
    );
    const ordered = REGIONS.map((region) => region.label).filter((label) => found.includes(label));
    return [...ordered, ...(found.includes("Remote / Oceanic") ? ["Remote / Oceanic"] : [])];
  }, [events]);

  const countries = useMemo(() => {
    const pool = events.filter(
      (event) =>
        (continent === "all" || event.region === continent) &&
        event.country &&
        event.country !== "Unassigned",
    );
    return Array.from(new Set(pool.map((event) => event.country))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [events, continent]);

  useEffect(() => {
    if (country !== "all" && !countries.includes(country)) {
      setCountry("all");
    }
  }, [countries, country]);

  const activeFilters = useMemo(
    () => ({
      types,
      status,
      severity: severity === "all" ? ("all" as const) : new Set([severity]),
      continent,
      country,
    }),
    [types, status, severity, continent, country],
  );

  const filteredEvents = useMemo(
    () => filterEvents(events, activeFilters),
    [events, activeFilters],
  );
  const countsBase = useMemo(
    () =>
      filterEvents(events, {
        ...activeFilters,
        types: new Set(HAZARDS.map((hazard) => hazard.id)),
      }),
    [events, activeFilters],
  );

  const stateBase = useMemo(
    () =>
      filterEvents(events, {
        types: new Set(HAZARDS.map((hazard) => hazard.id)),
        status,
        severity: "all" as const,
        continent,
        country,
      }),
    [events, status, continent, country],
  );
  const selectedEvent = filteredEvents.find((event) => event.id === selectedId);

  useEffect(() => {
    if (selectedId && !filteredEvents.some((event) => event.id === selectedId)) {
      setSelectedId(undefined);
    }
  }, [filteredEvents, selectedId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page, appliedStart, appliedEnd]);

  useEffect(() => {
    if (!downloadNotice) return;
    const timer = window.setTimeout(() => setDownloadNotice(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [downloadNotice]);

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  const resetWindow = useCallback(() => {
    const now = new Date();
    const start = toDateInput(addDays(now, -29));
    const end = toDateInput(now);
    setMode("range");
    setDraftStart(start);
    setDraftEnd(end);
    setAppliedStart(start);
    setAppliedEnd(end);
    setSelectedId(undefined);
  }, []);

  // Date changes apply on their own so the range always stays in sync.
  useEffect(() => {
    if (validationError) return;
    const nextEnd = mode === "day" ? draftStart : draftEnd;
    if (draftStart === appliedStart && nextEnd === appliedEnd) return;
    const timer = window.setTimeout(() => {
      setAppliedStart(draftStart);
      setAppliedEnd(nextEnd);
      setSelectedId(undefined);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [draftStart, draftEnd, mode, validationError, appliedStart, appliedEnd]);

  const handleModeChange = (nextMode: DateMode) => {
    setMode(nextMode);
    if (nextMode === "day") {
      setDraftEnd(draftStart);
      setAppliedStart(draftStart);
      setAppliedEnd(draftStart);
    } else {
      const nextEnd = draftEnd < draftStart ? draftStart : draftEnd;
      setDraftEnd(nextEnd);
    }
    setSelectedId(undefined);
  };

  const handleStartChange = (value: string) => {
    if (!value) return;
    const clamped = value > today ? today : value;
    setDraftStart(clamped);
    if (mode === "day") {
      setDraftEnd(clamped);
    } else if (draftEnd && clamped > draftEnd) {
      setDraftEnd(clamped);
    }
  };

  const handleEndChange = (value: string) => {
    if (!value) return;
    const clamped = value > today ? today : value;
    setDraftEnd(clamped);
    if (clamped < draftStart) {
      setDraftStart(clamped);
    }
  };

  const handleTypesChange = (nextTypes: Set<HazardId>) => {
    setTypes(nextTypes);
    if (nextTypes.size === 0) setSelectedId(undefined);
  };

  const downloadDataset = () => {
    try {
      // Prefer the stored snapshot; fall back to the records currently loaded.
      const content = datasetCsv.trim() ? datasetCsv : eventsToCsv(events);
      const records = datasetCsv.trim() ? datasetRecords : events.length;
      if (!content.trim()) {
        throw new Error("No dataset is available yet. Wait for the feeds to load and retry.");
      }
      triggerCsvDownload(content, "disasters.csv");
      setDownloadNotice({
        tone: "success",
        text: `disasters.csv downloaded · ${records.toLocaleString()} records`,
      });
    } catch (error) {
      setDownloadNotice({
        tone: "error",
        text:
          (error as Error)?.message ||
          "The download was blocked. Open /disasters.csv directly instead.",
      });
    }
  };

  const inspectEvent = (event: DisasterEvent) => {
    setSelectedId(event.id);
    navigate("map");
  };


  const showSkeleton = loadStatus === "loading" && !data;
  const showFatal = loadStatus === "error" && !data;

  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar
        page={page}
        onNavigate={navigate}
        meta={meta}
        loading={loadStatus === "loading"}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenFeeds={() => setFeedsOpen(true)}
      />

      <div className="min-w-0 flex-1">
        <TopBar
          page={pageById(page)}
          loading={loadStatus === "loading"}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenFeeds={() => setFeedsOpen(true)}
          onDownloadDataset={downloadDataset}
          datasetRecords={datasetRecords}
          start={appliedStart}
          end={appliedEnd}
        />

        <main className="mx-auto w-full max-w-[1560px] px-3.5 pb-10 pt-4 sm:px-5 lg:px-6">
          <FilterBar
            mode={mode}
            draftStart={draftStart}
            draftEnd={mode === "day" ? draftStart : draftEnd}
            appliedStart={appliedStart}
            appliedEnd={appliedEnd}
            types={types}
            eventsForCounts={countsBase}
            stateEvents={stateBase}
            status={status}
            syncing={refreshing || loadStatus === "loading"}
            validationError={validationError}
            onModeChange={handleModeChange}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            onTypesChange={handleTypesChange}
            onStatusChange={setStatus}
            continent={continent}
            country={country}
            severity={severity}
            continents={continents}
            countries={countries}
            onContinentChange={(next) => {
              setContinent(next);
              setCountry("all");
            }}
            onCountryChange={setCountry}
            onSeverityChange={setSeverity}
          />

          <div className="mt-4">
            {loadStatus === "ready" && data && filteredEvents.length === 0 && (
              <div className="mb-4">
                <InlineNotice
                  action={
                    <button
                      type="button"
                      className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-signal transition-opacity hover:opacity-80"
                      onClick={() => {
                        setTypes(new Set(ALL_HAZARD_IDS));
                        setContinent("all");
                        setCountry("all");
                        setSeverity("all");
                        setStatus("all");
                      }}
                    >
                      Reset filters
                    </button>
                  }
                >
                  No events match the current hazard and status selection for{" "}
                  {appliedStart === appliedEnd ? appliedStart : `${appliedStart} to ${appliedEnd}`}.
                  {types.size === 0 ? " No hazard classes are selected." : " Try selecting more hazard classes or a wider date window."}
                </InlineNotice>
              </div>
            )}

            {error && data && (
              <div className="mb-4">
                <InlineNotice
                  tone="error"
                  action={
                    <button
                      type="button"
                      className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-critical/90 hover:text-critical"
                      onClick={refresh}
                    >
                      Retry
                    </button>
                  }
                >
                  Refresh failed. Showing the last synchronized records. {error}
                </InlineNotice>
              </div>
            )}

            {showSkeleton && <AppSkeleton />}

            {showFatal && (
              <div className="panel mx-auto max-w-[720px] overflow-hidden">
                <div className="grid-lines relative border-b border-line px-6 py-9">
                  <div className="relative flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-critical/25 bg-critical/[0.08] text-critical">
                      {error?.toLowerCase().includes("no disaster") ? (
                        <CalendarRange size={17} strokeWidth={1.6} />
                      ) : (
                        <WifiOff size={17} strokeWidth={1.6} />
                      )}
                    </span>
                    <div>
                      <div className="micro-label mb-2 text-critical/70">
                        Feed exception
                      </div>
                      <h2 className="text-[19px] font-medium tracking-[-0.02em] text-ink">
                        {error?.toLowerCase().includes("no disaster")
                          ? "No records in this window"
                          : "Live disaster feeds unavailable"}
                      </h2>
                      <p className="mt-2 max-w-lg text-[11.5px] leading-relaxed text-muted">
                        {error ??
                          "The official disaster feeds could not be reached. Check your network connection and retry."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={refresh}
                      className="primary-button h-[36px]"
                    >
                      <RotateCcw size={13} /> Retry live feeds
                    </button>
                    <button
                      type="button"
                      onClick={resetWindow}
                      className="icon-button h-[36px] justify-center text-[11px]"
                    >
                      Reset to last 30 days <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="rounded-lg border border-line bg-[#f8faf7] p-3">
                    <p className="micro-label mb-2">Troubleshooting</p>
                    <ul className="space-y-1.5 text-[10px] leading-relaxed text-muted">
                      <li>• USGS events below the adaptive magnitude floor are excluded to keep the query fast.</li>
                      <li>• GDACS historical coverage may lag for some hazard classes.</li>
                      <li>• Browser extensions or private networks can block public API requests.</li>
                      <li>• Public APIs occasionally rate-limit bursts; retry after a short pause.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {loadStatus === "ready" && data && (
              <>
                {page === "overview" && (
                  <Overview
                    events={filteredEvents}
                    start={appliedStart}
                    end={appliedEnd}
                    meta={meta}
                    onNavigate={navigate}
                    onInspect={inspectEvent}
                  />
                )}
                {page === "map" && (
                  <MapPage
                    events={filteredEvents}
                    countsBase={countsBase}
                    stateBase={stateBase}
                    start={appliedStart}
                    end={appliedEnd}
                    meta={meta}
                    types={types}
                    onTypesChange={handleTypesChange}
                    selectedId={selectedEvent?.id}
                    onSelect={(event) => setSelectedId(event?.id)}
                  />
                )}
                {page === "analytics" && (
                  <Analytics
                    events={filteredEvents}
                    start={appliedStart}
                    end={appliedEnd}
                  />
                )}
                {page === "regional" && (
                  <Regional
                    events={filteredEvents}
                    start={appliedStart}
                    end={appliedEnd}
                  />
                )}
              </>
            )}
          </div>

          <FeedPanel
            open={feedsOpen}
            onClose={() => setFeedsOpen(false)}
            meta={meta}
            loading={loadStatus === "loading"}
            refreshing={refreshing}
            onRefresh={refresh}
            start={appliedStart}
            end={appliedEnd}
            recordCount={events.length}
            datasetRecords={datasetRecords}
            onDownloadDataset={downloadDataset}
          />

          {downloadNotice && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "fixed bottom-4 right-4 z-[3000] flex max-w-[min(92vw,380px)] items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-[0_18px_50px_-18px_rgba(12,18,16,0.45)]",
                downloadNotice.tone === "success"
                  ? "border-emerald-200 bg-white text-ink"
                  : "border-red-200 bg-white text-ink",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  downloadNotice.tone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-critical",
                )}
              >
                {downloadNotice.tone === "success" ? (
                  <Check size={11} strokeWidth={2.6} />
                ) : (
                  <AlertTriangle size={11} strokeWidth={2.2} />
                )}
              </span>
              <p className="min-w-0 flex-1 text-[10.5px] leading-relaxed">
                {downloadNotice.text}
              </p>
              <button
                type="button"
                onClick={() => setDownloadNotice(undefined)}
                className="shrink-0 text-muted-dim transition-colors hover:text-ink"
                aria-label="Dismiss download message"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.07em] text-muted-dim">
              <AlertTriangle size={9} className="opacity-60" />
              Disaster Monitor · situational awareness only · not an official warning service
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[8px] uppercase tracking-[0.07em] text-muted-dim">
              <a
                href="https://earthquake.usgs.gov/fdsnws/event/1/"
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-ink"
              >
                USGS API ↗
              </a>
              <span className="text-line-strong">/</span>
              <a
                href="https://www.gdacs.org/"
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-ink"
              >
                GDACS ↗
              </a>
              <span className="text-line-strong">/</span>
              <span>{spanDays(appliedStart, appliedEnd)}D window</span>
              <span className="text-line-strong">/</span>
              <span>UTC</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
