import { CSV_FIELDS, CSV_SOURCE } from "../config";
import type { DisasterEvent, FeedMeta, FeedResult } from "./disasters";
import type { HazardId, SeverityLevel } from "./hazards";
import { countryFromPlace, isValidCoordinate, normalizeCountry, regionFromCoordinates } from "./geo";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Small RFC-4180-friendly CSV parser: quoted commas, escaped quotes, newlines. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((line) => line.some((cell) => cell.trim() !== ""));
  if (!header) return [];
  const keys = header.map((key) => key.trim());
  return body.map((line) =>
    keys.reduce<Record<string, string>>((record, key, index) => {
      record[key] = (line[index] ?? "").trim();
      return record;
    }, {}),
  );
}

function pick(row: Record<string, string>, key: keyof typeof CSV_FIELDS): string {
  const column = CSV_FIELDS[key];
  if (column && row[column] !== undefined) return row[column];
  // Case-insensitive fallback so exports from other tools still work.
  const match = Object.keys(row).find(
    (name) => name.trim().toLowerCase() === String(column).toLowerCase(),
  );
  return match ? row[match] : "";
}

export function parseCsvDate(value: string): number {
  if (!value) return Number.NaN;
  const iso = Date.parse(value.replace(" ", "T"));
  if (Number.isFinite(iso)) return iso;
  const match = value.match(
    /^(\d{1,2})[\/\- ]([A-Za-z]{3,}|\d{1,2})[\/\- ](\d{2,4})/,
  );
  if (match) {
    const day = Number(match[1]);
    const monthToken = match[2].toLowerCase().slice(0, 3);
    const month = /^\d+$/.test(monthToken) ? Number(monthToken) - 1 : MONTHS.indexOf(monthToken);
    let year = Number(match[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    if (month >= 0) {
      return Date.UTC(year, month, day);
    }
  }
  return Number.NaN;
}

function toHazard(value: string): HazardId {
  const text = value.toLowerCase();
  if (/quake|seism|earth/.test(text)) return "earthquake";
  if (/flood|rain|inundat/.test(text)) return "flood";
  if (/fire|burn/.test(text)) return "wildfire";
  if (/volcan|erupt/.test(text)) return "volcano";
  if (/storm|cyclone|hurricane|typhoon|wind/.test(text)) return "storm";
  if (/drought|dry/.test(text)) return "drought";
  return "earthquake";
}

function toSeverity(value: string, magnitude: number): SeverityLevel {
  const text = value.toLowerCase();
  if (/critical|red|extreme|severe/.test(text)) return "critical";
  if (/high|orange/.test(text)) return "high";
  if (/moderate|medium|yellow|green/.test(text)) return "moderate";
  if (/low|minor/.test(text)) return "low";
  if (Number.isFinite(magnitude)) {
    if (magnitude >= 7) return "critical";
    if (magnitude >= 6) return "high";
    if (magnitude >= 5) return "moderate";
  }
  return "low";
}

export async function fetchCsvDisasterData(
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<FeedResult> {
  const response = await fetch(CSV_SOURCE, { signal, headers: { Accept: "text/csv,text/plain,*/*" } });
  if (!response.ok) throw new Error(`CSV source returned HTTP ${response.status}`);
  const rows = parseCsv(await response.text());
  if (rows.length === 0) throw new Error("The CSV source contains no rows.");

  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59.999Z`);
  const notes: string[] = [];
  let dropped = 0;

  const events: DisasterEvent[] = [];
  rows.forEach((row, index) => {
    const lat = Number(pick(row, "latitude"));
    const lon = Number(pick(row, "longitude"));
    const timestamp = parseCsvDate(pick(row, "date"));
    if (!isValidCoordinate(lat, lon) || !Number.isFinite(timestamp)) {
      dropped += 1;
      return;
    }
    const rawCountry = pick(row, "country");
    const location = pick(row, "location") || rawCountry || "Location not reported";
    const country = rawCountry ? normalizeCountry(rawCountry) : countryFromPlace(location);
    const magnitude = Number(pick(row, "magnitude"));
    const status = pick(row, "status").toLowerCase();

    events.push({
      id: `csv:${pick(row, "id") || index + 1}`,
      hazard: toHazard(pick(row, "type")),
      title: pick(row, "title") || location,
      location,
      country,
      region:
        pick(row, "region") || regionFromCoordinates(lat, lon, country),
      lat,
      lon,
      timestamp,
      severity: toSeverity(pick(row, "severity"), magnitude),
      magnitude: Number.isFinite(magnitude) ? magnitude : undefined,
      measure: Number.isFinite(magnitude)
        ? `M ${magnitude}`
        : pick(row, "severity") || "No measurement",
      source: "CSV",
      sourceUrl: pick(row, "url") || undefined,
      active: /active|ongoing|current/.test(status),
      alertLevel: pick(row, "severity") || undefined,
      description: "Imported from the configured CSV source.",
      affectedCountries: country !== "Unassigned" ? [country] : [],
    });
  });

  const filtered = events.filter(
    (event) => event.timestamp >= startMs && event.timestamp <= endMs,
  );
  if (filtered.length === 0) {
    throw new Error(
      "The CSV loaded but no rows fall inside the selected date window. Check your date column format.",
    );
  }
  if (dropped > 0) {
    notes.push(`${dropped} CSV row${dropped > 1 ? "s were" : " was"} skipped: invalid date or coordinates.`);
  }

  const meta: FeedMeta = {
    fetchedAt: Date.now(),
    cached: false,
    windowStart: start,
    windowEnd: end,
    dropped,
    truncated: false,
    gdacsTruncated: false,
    usgs: { ok: true, count: filtered.length },
    gdacs: { ok: true, count: 0 },
    notes: [`Custom CSV source: ${CSV_SOURCE}`, ...notes],
  };
  return { events: filtered.sort((a, b) => b.timestamp - a.timestamp), meta };
}
