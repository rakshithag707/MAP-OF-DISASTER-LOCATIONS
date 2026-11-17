import type { ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { formatRange, spanDays } from "../lib/format";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  start: string;
  end: string;
  aside?: ReactNode;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  start,
  end,
  aside,
}: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-signal" />
          <span className="micro-label text-signal/80">{eyebrow}</span>
        </div>
        <h1 className="text-balance text-[24px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[620px] text-[11.5px] leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded border border-line bg-[#f8faf7] px-2 py-[4px] font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
            <Clock3 size={9.5} strokeWidth={1.8} />
            {formatRange(start, end)}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted-dim">
            {spanDays(start, end)} day window · UTC
          </span>
        </div>
      </div>
      {aside && <div className="shrink-0 self-start">{aside}</div>}
    </div>
  );
}
