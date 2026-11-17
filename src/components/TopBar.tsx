import { Download, Menu } from "lucide-react";
import type { PageDefinition } from "../lib/navigation";
import { formatDate } from "../lib/format";

interface TopBarProps {
  page: PageDefinition;
  loading: boolean;
  onOpenMenu: () => void;
  onOpenFeeds: () => void;
  onDownloadDataset: () => void;
  datasetRecords: number;
  start: string;
  end: string;
}

export function TopBar({
  page,
  loading,
  onOpenMenu,
  onOpenFeeds,
  onDownloadDataset,
  datasetRecords,
  start,
  end,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-3 border-b border-line bg-white/90 px-3 backdrop-blur-md sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="icon-button h-8 w-8 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={15} />
        </button>
        <span className="truncate text-[11.5px] font-medium text-ink-soft">
          {page.label}
        </span>
        <span className="hidden rounded border border-line bg-[#f7f9f6] px-1.5 py-[2px] font-mono text-[8px] uppercase tracking-[0.08em] text-muted-dim md:inline-flex">
          {formatDate(`${start}T12:00:00Z`, { month: "short", day: "numeric" })} –{" "}
          {formatDate(`${end}T12:00:00Z`, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFeeds}
          aria-haspopup="dialog"
          className="hidden h-[32px] items-center gap-1.5 rounded-md border border-line px-2.5 transition-colors hover:border-line-strong hover:bg-[#f6f8f5] sm:flex"
          title="Open live feed details"
        >
          <span className={loading ? "live-dot h-[5px] w-[5px] opacity-40" : "live-dot h-[5px] w-[5px]"} />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
            Feeds
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenFeeds}
          aria-haspopup="dialog"
          aria-label="Open live feed details"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md border border-line transition-colors hover:border-line-strong hover:bg-[#f6f8f5] sm:hidden"
        >
          <span className={loading ? "live-dot h-[5px] w-[5px] opacity-40" : "live-dot h-[5px] w-[5px]"} />
        </button>
        <button
          type="button"
          onClick={onDownloadDataset}
          className="primary-button h-[32px] gap-1.5 px-2.5 text-[10.5px]"
          title={`Download the full dataset (${datasetRecords.toLocaleString()} records) as CSV`}
        >
          <Download size={12} strokeWidth={1.9} />
          <span className="hidden sm:inline">Download CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>
    </header>
  );
}
