import type { DisasterEvent } from "./disasters";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Counts data rows in a CSV document while respecting quoted newlines. */
export function countCsvRows(text: string): number {
  let rows = 0;
  let quoted = false;
  let hasContent = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
      hasContent = true;
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      if (hasContent) rows += 1;
      hasContent = false;
    } else if (char !== " " || quoted) {
      hasContent = true;
    }
  }
  if (hasContent) rows += 1;
  return Math.max(0, rows - 1);
}

/**
 * Starts a browser download from a string.
 * The object URL is revoked on a delay so slow browsers can finish reading it.
 */
export function triggerCsvDownload(content: string, filename: string): void {
  if (!content.trim()) {
    throw new Error("The dataset is empty — nothing to download.");
  }
  const body = content.startsWith("\uFEFF") ? content : `\uFEFF${content}`;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

export const EXPORT_COLUMNS = [
  "id",
  "title",
  "type",
  "date",
  "country",
  "region",
  "latitude",
  "longitude",
  "severity",
  "magnitude",
  "location",
  "status",
  "url",
  "depth_km",
  "measurement",
  "source",
  "alert_level",
  "affected_countries",
] as const;

/** Serializes events using the same columns as the shipped dataset file. */
export function eventsToCsv(events: DisasterEvent[]): string {
  const header = [...EXPORT_COLUMNS];
  const rows = [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((event) => [
      event.id,
      event.title,
      event.hazard,
      new Date(event.timestamp).toISOString(),
      event.country,
      event.region,
      event.lat.toFixed(5),
      event.lon.toFixed(5),
      event.severity,
      event.magnitude ?? "",
      event.location,
      event.active ? "active" : "historical",
      event.sourceUrl ?? "",
      event.depthKm ?? "",
      event.measure,
      event.source,
      event.alertLevel ?? "",
      (event.affectedCountries ?? []).join("; "),
    ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n")
    .concat("\r\n");
}
