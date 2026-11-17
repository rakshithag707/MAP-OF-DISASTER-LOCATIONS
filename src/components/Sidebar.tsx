import {
  ChartNoAxesCombined,
  ChevronRight,
  Database,
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  Map,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { PAGES, type PageId } from "../lib/navigation";
import { formatDate } from "../lib/format";
import type { FeedMeta } from "../lib/disasters";
import { BrandMark, SourceStatus } from "./ui";

const ICONS: Record<PageId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  map: Map,
  analytics: ChartNoAxesCombined,
  regional: Globe2,
};

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  meta?: FeedMeta;
  loading: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenFeeds: () => void;
}

export function Sidebar({
  page,
  onNavigate,
  meta,
  loading,
  mobileOpen,
  onCloseMobile,
  onOpenFeeds,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-line bg-[#fbfcfa] transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-[20px_0_60px_rgba(15,23,20,0.16)]" : "-translate-x-full",
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-[68px] items-center justify-between border-b border-line px-4">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2.5 text-left"
            onClick={() => onNavigate("overview")}
            aria-label="Disaster Monitor home"
          >
            <BrandMark />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-ink">
                Disaster
              </span>
              <span className="mt-[5px] block font-mono text-[8px] uppercase leading-none tracking-[0.2em] text-muted-dim">
                Monitor
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="icon-button h-7 w-7 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 scrollbar-thin">
          <div className="px-2">
            <div className="micro-label mb-2.5">Workspace</div>
          </div>
          <nav className="space-y-0.5" aria-label="Analytics pages">
            {PAGES.map((item) => {
              const Icon = ICONS[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className="nav-item relative"
                  data-active={page === item.id}
                  aria-current={page === item.id ? "page" : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                >
                  <Icon size={14} strokeWidth={1.7} />
                  <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            data-testid="feeds-heading"
            onClick={() => {
              onOpenFeeds();
              onCloseMobile();
            }}
            aria-haspopup="dialog"
            className="group mt-7 flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors hover:bg-[#eef2ec]"
            title="Open live feed details"
          >
            <span className="micro-label transition-colors group-hover:text-ink">
              Live feeds
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-live/80">
              <span className="live-dot" />
              Live
              <ChevronRight size={10} className="text-muted-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenFeeds();
              onCloseMobile();
            }}
            aria-haspopup="dialog"
            data-testid="feeds-card"
            className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-[9px] border border-line bg-[#f6f8f5] px-2.5 py-1 text-left transition-colors hover:border-line-strong hover:bg-[#eef2ec]"
            title="View feed status, coverage and sources"
          >
            <span className="min-w-0 flex-1">
              <SourceStatus
                label="USGS Earthquakes"
                ok={meta?.usgs.ok ?? false}
                count={meta?.usgs.count ?? 0}
                error={meta?.usgs.error}
                loading={loading && !meta}
                showCount={false}
              />
              <div className="h-px bg-line/70" />
              <SourceStatus
                label="GDACS Multi-hazard"
                ok={meta?.gdacs.ok ?? false}
                count={meta?.gdacs.count ?? 0}
                error={meta?.gdacs.error}
                loading={loading && !meta}
                showCount={false}
              />
            </span>
            <ChevronRight size={11} className="shrink-0 text-muted-dim" />
          </button>

          <div className="mt-3 rounded-[9px] border border-line/80 bg-[#fafbf9] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Database size={10} className="text-muted-dim" strokeWidth={1.8} />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                Coverage
              </span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-dim">
              {meta
                ? `${formatDate(meta.windowStart, { month: "short", day: "numeric" })} – ${formatDate(meta.windowEnd, { month: "short", day: "numeric", year: "numeric" })} · ${
                    meta.minMagnitude
                      ? `USGS M${meta.minMagnitude.toFixed(1)}+`
                      : "USGS quakes"
                  }`
                : "Connecting to official public feeds…"}
            </p>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-[9px] border border-line bg-[#f6f8f5] p-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  size={12}
                  className="mt-[1px] shrink-0 text-muted-dim"
                  strokeWidth={1.6}
                />
                <p className="text-[9px] leading-relaxed text-muted-dim">
                  Derived from official USGS and GDACS public feeds. For situational
                  awareness only; follow local authorities during an emergency.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between px-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-dim/70">
              <span>Disaster Monitor</span>
              <span>v2.4 · UTC</span>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
        />
      )}
    </>
  );
}
