import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  RefreshCw,
  Download,
  X,
} from "lucide-react";
import type { FeedMeta, SourceStatus as SourceStatusType } from "../lib/disasters";
import { formatRange } from "../lib/format";
import { cn } from "../utils/cn";

interface FeedPanelProps {
  open: boolean;
  onClose: () => void;
  meta?: FeedMeta;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  start: string;
  end: string;
  recordCount: number;
  datasetRecords: number;
  onDownloadDataset: () => void;
}

function FeedCard({
  name,
  role,
  coverage,
  status,
  href,
  hrefLabel,
  loading,
  color,
}: {
  name: string;
  role: string;
  coverage: string;
  status: SourceStatusType;
  href: string;
  hrefLabel: string;
  loading: boolean;
  color: string;
}) {
  const state = loading && !status.count ? "loading" : status.ok ? "ok" : "error";
  return (
    <div className="rounded-lg border border-line bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
            style={{ borderColor: `${color}33`, backgroundColor: `${color}0f`, color }}
          >
            <Database size={13} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight text-ink">{name}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted">{role}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded border px-1.5 py-1 font-mono text-[8px] uppercase tracking-[0.06em]",
            state === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : state === "error"
                ? "border-red-200 bg-red-50 text-critical"
                : "border-line bg-[#f7f9f6] text-muted",
          )}
        >
          {state === "loading" ? (
            <Loader2 size={9} className="animate-spin" />
          ) : state === "ok" ? (
            <CheckCircle2 size={9} />
          ) : (
            <AlertTriangle size={9} />
          )}
          {state === "loading" ? "Syncing" : state === "ok" ? "Operational" : "Offline"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-2.5">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted-dim">
            Records in window
          </div>
          <div className="num mt-0.5 text-[15px] leading-none text-ink">
            {state === "loading" ? "—" : status.count.toLocaleString()}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted-dim">
            Coverage
          </div>
          <div className="mt-1 text-[9.5px] leading-snug text-ink-soft">{coverage}</div>
        </div>
      </div>

      {status.error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[9px] leading-relaxed text-red-900">
          {status.error}
        </p>
      )}

      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2.5 inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-signal transition-opacity hover:opacity-75"
      >
        {hrefLabel}
        <ArrowUpRight size={10} />
      </a>
    </div>
  );
}

export function FeedPanel({
  open,
  onClose,
  meta,
  loading,
  refreshing,
  onRefresh,
  start,
  end,
  recordCount,
  datasetRecords,
  onDownloadDataset,
}: FeedPanelProps) {
  const openedAt = useRef(0);

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const operational = [meta?.usgs.ok, meta?.gdacs.ok].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-[#0c1210]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onClick={(event) => {
        // Ignore the tap/click that opened the panel on touch devices.
        if (Date.now() - openedAt.current < 250) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-panel-title"
        className="fade-in flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-xl border border-line-strong bg-[#fbfcfa] shadow-[0_24px_70px_rgba(12,18,16,0.28)] sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-4 py-3.5">
          <div>
            <div className="micro-label mb-1.5">Data sources</div>
            <h2 id="feed-panel-title" className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              Live feeds
            </h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Official public interfaces queried for every date, location and state change.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="icon-button h-8 w-8"
            aria-label="Close live feeds"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
            {[
              ["Feeds online", `${operational}/2`, operational === 2 ? "text-emerald-700" : "text-amber-700"],
              ["Records", recordCount.toLocaleString(), "text-ink"],
              ["Status", meta?.cached ? "Cached" : "Live", "text-ink"],
              [
                "Last sync",
                meta
                  ? new Intl.DateTimeFormat("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "UTC",
                    }).format(meta.fetchedAt)
                  : "—",
                "text-ink",
              ],
            ].map(([label, value, tone]) => (
              <div key={label} className="bg-white px-3 py-2.5">
                <div className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-muted-dim">
                  {label}
                </div>
                <div className={cn("num mt-1 truncate text-[12px]", tone)}>{value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 p-3.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                Connected sources
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-muted-dim">
                {formatRange(start, end)} · UTC
              </span>
            </div>

            <FeedCard
              name="USGS Earthquake API"
              role="Global seismic events with magnitude, depth and location."
              coverage="Adaptive magnitude floor; 5,000-record cap"
              status={meta?.usgs ?? { ok: false, count: 0 }}
              href="https://earthquake.usgs.gov/fdsnws/event/1/"
              hrefLabel="USGS API documentation"
              loading={loading}
              color="#dc2626"
            />
            <FeedCard
              name="GDACS Multi-hazard API"
              role="Floods, wildfires, storms, droughts and volcanic activity with alert levels."
              coverage="All alert levels; active status via iscurrent"
              status={meta?.gdacs ?? { ok: false, count: 0 }}
              href="https://www.gdacs.org/"
              hrefLabel="GDACS portal"
              loading={loading}
              color="#2563eb"
            />

            <div className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center gap-1.5">
                <Clock3 size={10} className="text-muted-dim" />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
                  Window detail
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  ["Observation window", `${formatRange(start, end)} (UTC)`],
                  ["Cached results", "Kept for 15 minutes, then refreshed"],
                  ["Excluded records", (meta?.dropped ?? 0).toLocaleString()],
                  ["Minimum magnitude", meta?.minMagnitude ? `M ${meta.minMagnitude.toFixed(1)}` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <span className="text-[9.5px] text-muted">{label}</span>
                    <span className="text-right font-mono text-[9px] text-ink-soft">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold text-ink">Stored dataset</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-muted">
                    {datasetRecords.toLocaleString()} records · disasters.csv
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDownloadDataset}
                  className="icon-button h-[30px] shrink-0 gap-1.5 px-2.5 text-[10px]"
                >
                  <Download size={11} />
                  Download
                </button>
              </div>
              <a
                href="disasters.csv"
                download="disasters.csv"
                className="mt-2 inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.06em] text-muted transition-colors hover:text-ink"
                title="Direct link to the file stored next to the app"
              >
                Direct file link /disasters.csv
                <ArrowUpRight size={9} />
              </a>
            </div>

            <p className="px-0.5 text-[9px] leading-relaxed text-muted-dim">
              Records are cleaned, de-duplicated and normalised to UTC. Active versus
              historical comes from the GDACS current flag; USGS events are historical once
              recorded. Official feeds may be delayed — follow local authorities in an
              emergency.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line bg-white px-3.5 py-2.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
            Official USGS + GDACS feeds
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="primary-button h-[32px] gap-1.5 px-3 text-[10.5px]"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Refreshing" : "Refresh feeds"}
          </button>
        </div>
      </div>
    </div>
  );
}
