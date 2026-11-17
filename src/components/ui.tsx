import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CircleSlash2,
  Info,
  RefreshCw,
  Satellite,
} from "lucide-react";
import { cn } from "../utils/cn";
import { HAZARD_MAP, SEVERITY, type HazardId, type SeverityLevel } from "../lib/hazards";
import type { SourceId } from "../lib/hazards";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#dfe4df] bg-white shadow-[0_1px_2px_rgba(15,23,20,0.06)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <circle cx="12" cy="12" r="6.4" stroke="#c2410c" strokeWidth="1.15" opacity="0.9" />
        <circle cx="12" cy="12" r="2.1" fill="#c2410c" />
        <path d="M12 2.5v4.1M12 17.4v4.1M2.5 12h4.1M17.4 12h4.1" stroke="#78837d" strokeWidth="1" />
        <path d="M12 2.5v4.1M12 17.4v4.1" stroke="#c2410c" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

export function HazardDot({
  hazard,
  size = 7,
  className,
}: {
  hazard: HazardId;
  size?: number;
  className?: string;
}) {
  const definition = HAZARD_MAP[hazard];
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: definition.color,
        boxShadow: `0 0 0 3px ${definition.soft}`,
      }}
      title={definition.label}
    />
  );
}

export function HazardBadge({
  hazard,
  count,
  className,
}: {
  hazard: HazardId;
  count?: number;
  className?: string;
}) {
  const definition = HAZARD_MAP[hazard];
  return (
    <span className={cn("inline-flex items-center gap-2 text-[11px] text-ink-soft", className)}>
      <HazardDot hazard={hazard} size={6} />
      <span>{definition.label}</span>
      {typeof count === "number" && (
        <span className="num text-[10px] text-muted-dim">{count.toLocaleString()}</span>
      )}
    </span>
  );
}

export function SeverityPill({
  severity,
  compact = false,
}: {
  severity: SeverityLevel;
  compact?: boolean;
}) {
  const config = SEVERITY[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-[3px] font-mono text-[8.5px] uppercase leading-none tracking-[0.08em]",
        compact && "px-1.5 py-[2px] text-[8px]",
      )}
      style={{
        color: config.color,
        borderColor: `${config.color}33`,
        backgroundColor: config.soft,
      }}
    >
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-[3px] font-mono text-[8.5px] uppercase leading-none tracking-[0.08em]",
        active
          ? "border-live/25 bg-live/10 text-live"
          : "border-line bg-[#f5f7f4] text-muted",
      )}
    >
      {active ? (
        <span className="live-dot h-[4px] w-[4px]" />
      ) : (
        <span className="h-1 w-1 rounded-full bg-muted-dim" />
      )}
      {active ? "Active" : "Historical"}
    </span>
  );
}

export function SeverityStrip({
  items,
  title = "Disaster state",
}: {
  items: { level: SeverityLevel; count: number; share: number }[];
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="micro-label shrink-0 sm:w-[104px]">{title}</span>
      <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-line bg-line sm:grid-cols-4">
        {items.map((item) => {
          const config = SEVERITY[item.level];
          return (
            <div
              key={item.level}
              className="flex items-center gap-2 bg-white px-2.5 py-2"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-[10.5px] font-medium text-ink-soft">
                {config.label}
              </span>
              <span className="num ml-auto text-[11px] text-ink">
                {item.count.toLocaleString()}
              </span>
              <span className="num w-8 text-right text-[8.5px] text-muted-dim">
                {item.share.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SourcePill({ source }: { source: SourceId }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-line bg-[#f7f9f6] px-1.5 py-[3px] font-mono text-[8.5px] uppercase leading-none tracking-[0.08em] text-muted">
      {source}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="micro-label mb-2">{eyebrow}</div>}
        <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
        {description && (
          <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-raised text-muted">
        {icon ?? <CircleSlash2 size={17} strokeWidth={1.5} />}
      </div>
      <div>
        <p className="text-[13px] font-medium text-ink-soft">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted">{message}</p>
      </div>
      {action}
    </div>
  );
}

export function InlineNotice({
  tone = "info",
  children,
  action,
}: {
  tone?: "info" | "warning" | "error";
  children: ReactNode;
  action?: ReactNode;
}) {
  const toneStyles = {
    info: "border-line bg-[#f8faf7] text-muted",
    warning: "border-amber-300/70 bg-amber-50 text-amber-900",
    error: "border-red-300/70 bg-red-50 text-red-900",
  };
  const Icon = tone === "error" || tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[9px] border px-3 py-2.5 text-[11px] leading-relaxed",
        toneStyles[tone],
      )}
    >
      <Icon size={13} strokeWidth={1.6} className="mt-[1px] shrink-0 opacity-70" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function SourceStatus({
  label,
  ok,
  count,
  error,
  loading,
  showCount = true,
}: {
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  loading?: boolean;
  showCount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-[7px]">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "h-[5px] w-[5px] shrink-0 rounded-full",
            loading ? "animate-pulse bg-muted-dim" : ok ? "bg-live" : "bg-critical",
          )}
        />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted">
          {label}
        </span>
      </div>
      {showCount ? (
        <span className="num shrink-0 text-[9.5px] text-muted-dim" title={error}>
          {loading ? "SYNC" : ok ? count.toLocaleString() : "OFFLINE"}
        </span>
      ) : (
        !ok && (
          <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.06em] text-critical">
            Offline
          </span>
        )
      )}
    </div>
  );
}

export function LoadingBlock({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-3"
          style={{ width: `${100 - ((index * 13) % 35)}%` }}
        />
      ))}
    </div>
  );
}

export function RefreshStatus({
  fetchedAt,
  refreshing,
  onRefresh,
  cached,
}: {
  fetchedAt?: number;
  refreshing?: boolean;
  onRefresh: () => void;
  cached?: boolean;
}) {
  const time = fetchedAt
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date(fetchedAt))
    : "—";
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      className="icon-button h-[32px] px-2.5 text-[10.5px] disabled:opacity-50"
      title="Refresh live feeds"
    >
      {refreshing ? (
        <RefreshCw size={12} strokeWidth={1.7} className="animate-spin" />
      ) : (
        <Satellite size={12} strokeWidth={1.7} />
      )}
      <span className="num hidden text-[9.5px] uppercase tracking-[0.06em] text-muted sm:inline">
        {cached ? "Cached" : "Synced"} {time} UTC
      </span>
      <ArrowUpRight size={11} className="text-muted-dim sm:hidden" />
    </button>
  );
}
