import type { HazardId, SeverityLevel, SourceId } from "./hazards";
import { HAZARDS, hazardForGdacs } from "./hazards";
import { CSV_SOURCE } from "../config";
import { fetchCsvDisasterData } from "./csvSource";
import { countryFromPlace, isValidCoordinate, normalizeCountry, regionFromCoordinates } from "./geo";
import { spanDays } from "./format";

export interface DisasterEvent {
  id: string;
  hazard: HazardId;
  title: string;
  location: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  timestamp: number;
  endTimestamp?: number;
  severity: SeverityLevel;
  magnitude?: number;
  depthKm?: number;
  measure: string;
  source: SourceId;
  sourceUrl?: string;
  active: boolean;
  alertLevel?: string;
  description?: string;
  affectedCountries?: string[];
}

export interface SourceStatus {
  ok: boolean;
  count: number;
  error?: string;
}

export interface FeedMeta {
  fetchedAt: number;
  cached: boolean;
  windowStart: string;
  windowEnd: string;
  minMagnitude?: number;
  dropped: number;
  truncated: boolean;
  gdacsTruncated: boolean;
  usgs: SourceStatus;
  gdacs: SourceStatus;
  notes: string[];
}

export interface FeedResult {
  events: DisasterEvent[];
  meta: FeedMeta;
}

interface FetchOptions {
  signal?: AbortSignal;
  force?: boolean;
}

const CACHE_PREFIX = "sentinel.disaster.feed.v5";
const CACHE_TTL = 15 * 60 * 1000;

const SEVERITY_BY_ALERT: Record<string, SeverityLevel> = {
  red: "critical",
  orange: "high",
  yellow: "moderate",
  green: "low",
};

const GDACS_SEVERITY: Record<string, SeverityLevel> = {
  red: "critical",
  orange: "high",
  green: "moderate",
};

function magnitudeSeverity(magnitude: number): SeverityLevel {
  if (magnitude >= 7) return "critical";
  if (magnitude >= 6) return "high";
  if (magnitude >= 5) return "moderate";
  return "low";
}

function usgsMagnitudeFloor(days: number): number {
  if (days <= 2) return 1.5;
  if (days <= 7) return 2.0;
  if (days <= 45) return 2.5;
  if (days <= 75) return 3.0;
  if (days <= 180) return 3.8;
  if (days <= 365) return 4.3;
  return 4.8;
}

function gdacsPageCount(days: number): number {
  if (days <= 45) return 1;
  if (days <= 180) return 2;
  return 3;
}

function stripHtml(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return String(value ?? "").toLowerCase() === "true";
}

function cleanMeasure(value?: string | null): string {
  if (!value) return "No intensity measure reported";
  return value
    .replace(/\s*\|\s*/g, " · ")
    .replace(/,?\s*Depth:\s*/i, " · ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(
  url: string,
  signal?: AbortSignal,
  timeoutMs = 28_000,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeoutId = window.setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    // GDACS answers 204 with no body when a page has no records.
    if (response.status === 204) {
      return { type: "FeatureCollection", features: [] };
    }
    const text = await response.text();
    if (!text.trim()) {
      return { type: "FeatureCollection", features: [] };
    }
    return JSON.parse(text);
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
}

function usgsUrl(start: string, end: string, minMagnitude: number): string {
  const params = new URLSearchParams({
    format: "geojson",
    starttime: start,
    endtime: `${end} 23:59:59`,
    minmagnitude: minMagnitude.toFixed(1),
    orderby: "time",
    limit: "5000",
  });
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;
}

function gdacsUrl(type: string, start: string, end: string, page: number): string {
  return (
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" +
    `?fromDate=${start}&toDate=${end}` +
    `&eventlist=${type}&alertlevel=Green;Orange;Red&pagenumber=${page}`
  );
}

interface UsgsFeature {
  id?: string;
  geometry?: { coordinates?: number[] };
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    updated?: number | null;
    url?: string;
    title?: string | null;
    alert?: string | null;
    tsunami?: number | null;
    magType?: string | null;
    status?: string | null;
    type?: string | null;
  };
}

function normalizeUsgs(
  payload: unknown,
  windowStartMs: number,
  windowEndMs: number,
): { events: DisasterEvent[]; dropped: number } {
  const features =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { features?: unknown[] }).features)
      ? ((payload as { features: UsgsFeature[] }).features)
      : [];
  let dropped = 0;
  const events: DisasterEvent[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates ?? [];
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const depth = Number(coords[2]);
    const magnitude = Number(props.mag);
    const timestamp = Number(props.time);

    if (
      !Number.isFinite(timestamp) ||
      !isValidCoordinate(lat, lon) ||
      !Number.isFinite(magnitude) ||
      timestamp < windowStartMs ||
      timestamp > windowEndMs
    ) {
      dropped += 1;
      continue;
    }

    const pagerAlert = (props.alert ?? "").toLowerCase();
    const severity =
      SEVERITY_BY_ALERT[pagerAlert] ?? magnitudeSeverity(magnitude);
    const place = props.place?.trim() || "Location not reported";
    const country = countryFromPlace(place);
    const tsunamiFlag = Number(props.tsunami) === 1;
    const descriptionParts = [
      props.type ? `${props.type[0]?.toUpperCase()}${props.type.slice(1)}` : null,
      Number.isFinite(depth) ? `${depth.toFixed(0)} km depth` : null,
      props.magType ? `Magnitude scale: ${props.magType}` : null,
      props.status ? `Review status: ${props.status}` : null,
      tsunamiFlag ? "Tsunami flag was raised for this event." : null,
    ].filter(Boolean);

    events.push({
      id: `usgs:${feature.id ?? `${lat}:${lon}:${timestamp}`}`,
      hazard: "earthquake",
      title: props.title?.trim() || `M ${magnitude.toFixed(1)} earthquake`,
      location: place,
      country,
      region: regionFromCoordinates(lat, lon, country),
      lat,
      lon,
      timestamp,
      severity,
      magnitude,
      depthKm: Number.isFinite(depth) ? depth : undefined,
      measure: `M ${magnitude.toFixed(1)}${
        Number.isFinite(depth) ? ` · ${depth.toFixed(0)} km depth` : ""
      }`,
      source: "USGS",
      sourceUrl: props.url,
      active: false,
      alertLevel: props.alert ?? undefined,
      description: descriptionParts.join(" · "),
      affectedCountries: country !== "Unassigned" ? [country] : [],
    });
  }

  return { events, dropped };
}

interface GdacsFeature {
  geometry?: { coordinates?: number[] } | null;
  properties?: {
    eventtype?: string;
    eventid?: number | string;
    episodeid?: number | string;
    name?: string | null;
    description?: string | null;
    htmldescription?: string | null;
    country?: string | null;
    fromdate?: string | null;
    todate?: string | null;
    alertlevel?: string | null;
    iscurrent?: boolean | string | null;
    url?: { report?: string; details?: string; geometry?: string } | null;
    affectedcountries?: Array<{ countryname?: string }>;
    severitydata?: {
      severity?: number | null;
      severitytext?: string | null;
      severityunit?: string | null;
    } | null;
  };
}

export function normalizeGdacs(
  payload: unknown,
  minTimestamp: number,
  maxTimestamp: number,
): { events: DisasterEvent[]; dropped: number; types: HazardId[] } {
  const features =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { features?: unknown[] }).features)
      ? ((payload as { features: GdacsFeature[] }).features)
      : [];
  let dropped = 0;
  const events: DisasterEvent[] = [];
  const types = new Set<HazardId>();

  for (const feature of features) {
    const props = feature.properties ?? {};
    const hazard = hazardForGdacs(props.eventtype ?? "");
    const coords = feature.geometry?.coordinates ?? [];
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const timestamp = props.fromdate
      ? Date.parse(`${props.fromdate}Z`)
      : Number.NaN;
    if (
      !hazard ||
      !isValidCoordinate(lat, lon) ||
      !Number.isFinite(timestamp) ||
      timestamp < minTimestamp ||
      timestamp > maxTimestamp
    ) {
      dropped += 1;
      continue;
    }

    const country = normalizeCountry(props.country);
    const alert = (props.alertlevel ?? "").toLowerCase();
    const active = asBoolean(props.iscurrent);
    const rawMeasure = props.severitydata?.severitytext ?? "";
    const usableMeasure =
      /^magnitude\s*0(?:\.0+)?\s*$/i.test(rawMeasure.trim()) ||
      /^\s*$/.test(rawMeasure)
        ? alert
          ? `${alert[0].toUpperCase()}${alert.slice(1)} GDACS alert`
          : undefined
        : rawMeasure;
    const measure = cleanMeasure(usableMeasure);
    const affected = (props.affectedcountries ?? [])
      .map((entry) => normalizeCountry(entry.countryname))
      .filter((name) => name && name !== "Unassigned");
    types.add(hazard.id);

    events.push({
      id: `gdacs:${props.eventtype}:${props.eventid ?? `${lat}:${lon}:${timestamp}`}`,
      hazard: hazard.id,
      title:
        props.name?.trim() ||
        props.description?.trim() ||
        `${hazard.singular} in ${country}`,
      location:
        props.name?.trim() ||
        props.description?.trim() ||
        `${hazard.singular} — ${country}`,
      country,
      region: regionFromCoordinates(lat, lon, country),
      lat,
      lon,
      timestamp,
      endTimestamp: props.todate ? Date.parse(`${props.todate}Z`) : undefined,
      severity: GDACS_SEVERITY[alert] ?? "moderate",
      measure,
      source: "GDACS",
      sourceUrl: props.url?.report ?? props.url?.details,
      active,
      alertLevel: props.alertlevel ?? undefined,
      description:
        stripHtml(props.htmldescription) ||
        `${hazard.label} monitoring record from GDACS.`,
      affectedCountries: Array.from(
        new Set([...(country !== "Unassigned" ? [country] : []), ...affected]),
      ),
    });
  }

  return { events, dropped, types: Array.from(types) };
}

async function fetchUsgs(
  start: string,
  end: string,
  days: number,
  signal?: AbortSignal,
): Promise<{ events: DisasterEvent[]; dropped: number; truncated: boolean; minMagnitude: number }> {
  const minMagnitude = usgsMagnitudeFloor(days);
  const payload = await fetchJson(usgsUrl(start, end, minMagnitude), signal);
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59.999Z`);
  const normalized = normalizeUsgs(payload, startMs, endMs);
  const rawCount = Array.isArray((payload as { features?: unknown[] })?.features)
    ? ((payload as { features: unknown[] }).features.length)
    : 0;
  return {
    ...normalized,
    truncated: rawCount >= 5000,
    minMagnitude,
  };
}

async function fetchGdacsHazard(
  hazardType: string,
  start: string,
  end: string,
  pages: number,
  signal?: AbortSignal,
): Promise<{ events: DisasterEvent[]; dropped: number; capped: boolean }> {
  const requests = await Promise.allSettled(
    Array.from({ length: pages }, (_, index) =>
      fetchJson(gdacsUrl(hazardType, start, end, index + 1), signal, 32_000),
    ),
  );
  const fulfilled = requests.filter(
    (result): result is PromiseFulfilledResult<unknown> =>
      result.status === "fulfilled",
  );
  if (fulfilled.length === 0) {
    const reason =
      requests[0]?.status === "rejected"
        ? (requests[0].reason as Error)?.message
        : undefined;
    throw new Error(reason || "GDACS feed unavailable");
  }
  const minMs = Date.parse(`${start}T00:00:00Z`);
  const maxMs = Date.parse(`${end}T23:59:59.999Z`);
  const normalized = fulfilled.flatMap((result) =>
    normalizeGdacs(result.value, minMs, maxMs).events,
  );
  const rawTotal = fulfilled.reduce((total, result) => {
    const features = (result.value as { features?: unknown[] })?.features;
    return total + (Array.isArray(features) ? features.length : 0);
  }, 0);
  return {
    events: normalized,
    dropped: 0,
    capped: rawTotal >= pages * 100,
  };
}

function cacheKey(start: string, end: string): string {
  return `${CACHE_PREFIX}:${start}:${end}`;
}

function readCache(start: string, end: string): FeedResult | undefined {
  try {
    const raw = window.localStorage.getItem(cacheKey(start, end));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as FeedResult;
    if (
      !parsed?.meta?.fetchedAt ||
      Date.now() - parsed.meta.fetchedAt > CACHE_TTL ||
      !Array.isArray(parsed.events)
    ) {
      window.localStorage.removeItem(cacheKey(start, end));
      return undefined;
    }
    return { ...parsed, meta: { ...parsed.meta, cached: true } };
  } catch {
    return undefined;
  }
}

function writeCache(start: string, end: string, result: FeedResult): void {
  try {
    window.localStorage.setItem(cacheKey(start, end), JSON.stringify(result));
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith(CACHE_PREFIX),
    );
    if (keys.length > 12) {
      keys
        .sort()
        .slice(0, keys.length - 12)
        .forEach((key) => window.localStorage.removeItem(key));
    }
  } catch {
    // A full or restricted storage must never break the live feed.
  }
}

export async function fetchDisasterData(
  start: string,
  end: string,
  options: FetchOptions = {},
): Promise<FeedResult> {
  const { signal, force = false } = options;
  if (CSV_SOURCE.trim()) {
    return fetchCsvDisasterData(start, end, signal);
  }
  if (!force) {
    const cached = readCache(start, end);
    if (cached) return cached;
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const days = spanDays(start, end);
  const usgsTask = fetchUsgs(start, end, days, signal);
  const pages = gdacsPageCount(days);
  const gdacsTypes = HAZARDS.filter((hazard) => hazard.gdacsType);

  const gdacsTasks = gdacsTypes.map(async (hazard) => {
    try {
      const result = await fetchGdacsHazard(
        hazard.gdacsType as string,
        start,
        end,
        pages,
        signal,
      );
      return { type: hazard, ok: true as const, ...result };
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || signal?.aborted) {
        throw error;
      }
      return {
        type: hazard,
        ok: false as const,
        events: [] as DisasterEvent[],
        dropped: 0,
        capped: false,
        error: (error as Error)?.message ?? "Unavailable",
      };
    }
  });

  const [usgsSettled, ...gdacsSettled] = await Promise.allSettled([
    usgsTask,
    ...gdacsTasks,
  ]);

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  let usgsStatus: SourceStatus;
  let usgsEvents: DisasterEvent[] = [];
  let usgsDropped = 0;
  let truncated = false;
  let minMagnitude: number | undefined;
  const notes: string[] = [];

  if (usgsSettled.status === "fulfilled") {
    usgsEvents = usgsSettled.value.events;
    usgsDropped = usgsSettled.value.dropped;
    truncated = usgsSettled.value.truncated;
    minMagnitude = usgsSettled.value.minMagnitude;
    usgsStatus = { ok: true, count: usgsEvents.length };
  } else {
    const reason = usgsSettled.reason as Error;
    if (reason?.name === "AbortError") throw reason;
    usgsStatus = {
      ok: false,
      count: 0,
      error: reason?.message || "USGS feed unavailable",
    };
    notes.push("USGS earthquake feed could not be reached.");
  }

  const gdacsEvents: DisasterEvent[] = [];
  let gdacsDropped = 0;
  let gdacsTruncated = false;
  let gdacsErrorCount = 0;
  const gdacsReturnedTypes = new Set<HazardId>();

  for (const settled of gdacsSettled) {
    if (settled.status === "fulfilled") {
      const value = settled.value;
      if (value.ok) {
        gdacsEvents.push(...value.events);
        gdacsDropped += value.dropped;
        gdacsTruncated = gdacsTruncated || value.capped;
        value.events.forEach((event) => gdacsReturnedTypes.add(event.hazard));
      } else {
        gdacsErrorCount += 1;
      }
    } else {
      gdacsErrorCount += 1;
    }
  }

  const gdacsStatus: SourceStatus = {
    ok: gdacsErrorCount < gdacsTypes.length,
    count: gdacsEvents.length,
    error:
      gdacsErrorCount === 0
        ? undefined
        : `${gdacsErrorCount} of ${gdacsTypes.length} GDACS hazard feeds unavailable`,
  };
  if (gdacsErrorCount > 0) {
    notes.push(
      `${gdacsErrorCount} GDACS hazard feed${gdacsErrorCount > 1 ? "s" : ""} did not respond. Other hazards remain available.`,
    );
  }

  // GDACS episodes are deduplicated to one record per event, preserving the newest episode.
  const dedupedGdacs = Array.from(
    gdacsEvents.reduce((map, event) => {
      const existing = map.get(event.id);
      if (!existing || (event.timestamp ?? 0) >= (existing.timestamp ?? 0)) {
        map.set(event.id, event);
      }
      return map;
    }, new Map<string, DisasterEvent>()).values(),
  );

  const events = [...usgsEvents, ...dedupedGdacs].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  if (events.length === 0) {
    throw new Error(
      notes.join(" ") ||
        "No disaster records were returned for this window. Try a wider date range.",
    );
  }

  if (truncated) {
    notes.push(
      "USGS query cap reached.",
    );
  }
  if (gdacsTruncated) {
    notes.push(
      "GDACS result page limit reached.",
    );
  }
  if (gdacsReturnedTypes.size === 0 && gdacsStatus.ok) {
    notes.push("No current GDACS multi-hazard records fell inside this window.");
  }

  const meta: FeedMeta = {
    fetchedAt: Date.now(),
    cached: false,
    windowStart: start,
    windowEnd: end,
    minMagnitude,
    dropped: usgsDropped + gdacsDropped,
    truncated,
    gdacsTruncated,
    usgs: usgsStatus,
    gdacs: { ...gdacsStatus, count: dedupedGdacs.length },
    notes,
  };

  const result: FeedResult = { events, meta };
  writeCache(start, end, result);
  return result;
}
