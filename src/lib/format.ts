export const DAY_MS = 86_400_000;

export function cnNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function addDays(date: Date | string, amount: number): Date {
  const base =
    typeof date === "string" ? new Date(`${date}T12:00:00Z`) : new Date(date);
  base.setUTCDate(base.getUTCDate() + amount);
  return base;
}

export function startOfUtcDay(input: string | Date): Date {
  const date = typeof input === "string" ? new Date(`${input}T00:00:00Z`) : input;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function spanDays(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 1;
  return Math.max(1, Math.round((endMs - startMs) / DAY_MS) + 1);
}

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}

export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export function formatDayShort(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatDate(`${start}T12:00:00Z`);
  const startLabel = formatDate(`${start}T12:00:00Z`, {
    month: "short",
    day: "numeric",
  });
  const endLabel = formatDate(`${end}T12:00:00Z`, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatRelative(date: string | number | Date, now = Date.now()): string {
  const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(time)) return "Unknown";
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(time, { month: "short", day: "numeric" });
}

export function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
