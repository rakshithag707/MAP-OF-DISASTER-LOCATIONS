import type { DisasterEvent } from "./disasters";
import type { HazardId, SeverityLevel } from "./hazards";
import { HAZARDS, HAZARD_MAP, REGIONS, SEVERITY_ORDER } from "./hazards";
import { DAY_MS, formatDate, formatDayShort } from "./format";

export type StatusFilter = "all" | "active" | "historical";

export interface ActiveFilters {
  types: Set<HazardId>;
  status: StatusFilter;
  severity?: "all" | Set<SeverityLevel>;
  continent?: string;
  country?: string;
}

export function filterEvents(
  events: DisasterEvent[],
  filters: ActiveFilters,
): DisasterEvent[] {
  return events.filter((event) => {
    if (!filters.types.has(event.hazard)) return false;
    if (filters.status === "active" && !event.active) return false;
    if (filters.status === "historical" && event.active) return false;
    if (filters.severity && filters.severity !== "all" && !filters.severity.has(event.severity)) {
      return false;
    }
    if (filters.continent && filters.continent !== "all" && event.region !== filters.continent) {
      return false;
    }
    if (filters.country && filters.country !== "all" && event.country !== filters.country) {
      return false;
    }
    return true;
  });
}

export interface HazardCount {
  id: HazardId;
  label: string;
  color: string;
  count: number;
  share: number;
}

export function hazardCounts(events: DisasterEvent[]): HazardCount[] {
  const totals = new Map<HazardId, number>();
  events.forEach((event) => {
    totals.set(event.hazard, (totals.get(event.hazard) ?? 0) + 1);
  });
  const total = events.length || 1;
  return HAZARDS.map((hazard) => ({
    id: hazard.id,
    label: hazard.label,
    color: hazard.color,
    count: totals.get(hazard.id) ?? 0,
    share: ((totals.get(hazard.id) ?? 0) / total) * 100,
  }));
}

export function severityCounts(events: DisasterEvent[]) {
  const totals: Record<SeverityLevel, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
  events.forEach((event) => {
    totals[event.severity] += 1;
  });
  return SEVERITY_ORDER.map((level) => ({
    level,
    count: totals[level],
    share: events.length ? (totals[level] / events.length) * 100 : 0,
  }));
}

export interface Summary {
  total: number;
  active: number;
  historical: number;
  critical: number;
  topHazard?: HazardCount;
  topRegion: string;
  topRegionCount: number;
  topCountry: string;
  topCountryCount: number;
  countryCount: number;
  maxMagnitude?: DisasterEvent;
  latest?: DisasterEvent;
  averagePerDay: number;
  peakDay?: { date: string; count: number };
  activeShare: number;
}

function peakDay(events: DisasterEvent[]): { date: string; count: number } | undefined {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    const day = new Date(event.timestamp).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? { date: top[0], count: top[1] } : undefined;
}

export function summarize(
  events: DisasterEvent[],
  windowDays: number,
): Summary {
  const hazards = hazardCounts(events)
    .filter((hazard) => hazard.count > 0)
    .sort((a, b) => b.count - a.count);
  const regions = regionStats(events).filter(
    (region) => region.region !== "Remote / Oceanic" && region.total > 0,
  );
  const regionLeader =
    regions.sort((a, b) => b.total - a.total)[0] ??
    regionStats(events).sort((a, b) => b.total - a.total)[0];
  const countries = countryStats(events);
  const countryLeader = countries.sort((a, b) => b.total - a.total)[0];
  const quakes = events.filter(
    (event) => event.hazard === "earthquake" && typeof event.magnitude === "number",
  );
  const maxMagnitude = [...quakes].sort(
    (a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0),
  )[0];
  const latest = [...events].sort((a, b) => b.timestamp - a.timestamp)[0];
  const active = events.filter((event) => event.active).length;
  const critical = events.filter((event) => event.severity === "critical").length;

  return {
    total: events.length,
    active,
    historical: events.length - active,
    critical,
    topHazard: hazards[0],
    topRegion: regionLeader?.region ?? "—",
    topRegionCount: regionLeader?.total ?? 0,
    topCountry: countryLeader?.country ?? "—",
    topCountryCount: countryLeader?.total ?? 0,
    countryCount: countries.length,
    maxMagnitude,
    latest,
    averagePerDay: events.length / Math.max(1, windowDays),
    peakDay: peakDay(events),
    activeShare: events.length ? (active / events.length) * 100 : 0,
  };
}

export interface RegionStat {
  region: string;
  total: number;
  share: number;
  active: number;
  critical: number;
  countries: number;
  dominantHazard: HazardId | null;
  hazards: Partial<Record<HazardId, number>>;
  latest?: DisasterEvent;
  color: string;
}

export function regionStats(events: DisasterEvent[]): RegionStat[] {
  const total = events.length || 1;
  return REGIONS.map((region) => {
    const items = events.filter((event) => event.region === region.label);
    const hazardTotals: Partial<Record<HazardId, number>> = {};
    items.forEach((event) => {
      hazardTotals[event.hazard] = (hazardTotals[event.hazard] ?? 0) + 1;
    });
    const dominant = Object.entries(hazardTotals).sort(
      (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
    )[0]?.[0] as HazardId | undefined;
    return {
      region: region.label,
      total: items.length,
      share: (items.length / total) * 100,
      active: items.filter((event) => event.active).length,
      critical: items.filter((event) => event.severity === "critical").length,
      countries: new Set(
        items
          .map((event) => event.country)
          .filter((country) => country && country !== "Unassigned"),
      ).size,
      dominantHazard: dominant ?? null,
      hazards: hazardTotals,
      latest: [...items].sort((a, b) => b.timestamp - a.timestamp)[0],
      color: region.color,
    };
  });
}

export interface CountryStat {
  country: string;
  region: string;
  total: number;
  active: number;
  critical: number;
  dominantHazard: HazardId | null;
  latest?: DisasterEvent;
  share: number;
}

export function countryStats(events: DisasterEvent[]): CountryStat[] {
  const valid = events.filter(
    (event) => event.country && event.country !== "Unassigned",
  );
  const grouped = new Map<string, DisasterEvent[]>();
  valid.forEach((event) => {
    const list = grouped.get(event.country) ?? [];
    list.push(event);
    grouped.set(event.country, list);
  });
  return Array.from(grouped.entries())
    .map(([country, items]) => {
      const totals = new Map<HazardId, number>();
      const regions = new Map<string, number>();
      items.forEach((event) => {
        totals.set(event.hazard, (totals.get(event.hazard) ?? 0) + 1);
        regions.set(event.region, (regions.get(event.region) ?? 0) + 1);
      });
      return {
        country,
        region:
          Array.from(regions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          "Unassigned",
        total: items.length,
        active: items.filter((event) => event.active).length,
        critical: items.filter((event) => event.severity === "critical").length,
        dominantHazard:
          (Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] as
            | HazardId
            | undefined) ?? null,
        latest: [...items].sort((a, b) => b.timestamp - a.timestamp)[0],
        share: events.length ? (items.length / events.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface TimeBucket {
  timestamp: number;
  label: string;
  total: number;
  counts: Record<HazardId, number>;
}

function emptyCounts(): Record<HazardId, number> {
  return HAZARDS.reduce(
    (acc, hazard) => ({ ...acc, [hazard.id]: 0 }),
    {} as Record<HazardId, number>,
  );
}

export function buildTimeSeries(
  events: DisasterEvent[],
  start: string,
  end: string,
): { buckets: TimeBucket[]; granularity: string } {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59Z`);
  const days = Math.max(1, Math.round((endMs - startMs) / DAY_MS));

  if (days <= 1) {
    const buckets: TimeBucket[] = Array.from({ length: 6 }, (_, index) => ({
      timestamp: startMs + index * 4 * 3_600_000,
      label: `${String(index * 4).padStart(2, "0")}:00`,
      total: 0,
      counts: emptyCounts(),
    }));
    events.forEach((event) => {
      const hour = new Date(event.timestamp).getUTCHours();
      const index = Math.min(5, Math.floor(hour / 4));
      buckets[index].counts[event.hazard] += 1;
      buckets[index].total += 1;
    });
    return { buckets, granularity: "4-hour" };
  }

  if (days <= 45) {
    const buckets: TimeBucket[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const timestamp = startMs + offset * DAY_MS;
      buckets.push({
        timestamp,
        label: formatDayShort(timestamp),
        total: 0,
        counts: emptyCounts(),
      });
    }
    events.forEach((event) => {
      const index = Math.floor((event.timestamp - startMs) / DAY_MS);
      if (index >= 0 && index < buckets.length) {
        buckets[index].counts[event.hazard] += 1;
        buckets[index].total += 1;
      }
    });
    return { buckets, granularity: "Daily" };
  }

  if (days <= 180) {
    const interval = 7 * DAY_MS;
    const bucketCount = Math.ceil((endMs - startMs + 1) / interval);
    const buckets: TimeBucket[] = Array.from({ length: bucketCount }, (_, index) => {
      const timestamp = startMs + index * interval;
      return {
        timestamp,
        label: formatDayShort(timestamp),
        total: 0,
        counts: emptyCounts(),
      };
    });
    events.forEach((event) => {
      const index = Math.floor((event.timestamp - startMs) / interval);
      if (index >= 0 && index < buckets.length) {
        buckets[index].counts[event.hazard] += 1;
        buckets[index].total += 1;
      }
    });
    return { buckets, granularity: "Weekly" };
  }

  const monthMap = new Map<string, TimeBucket>();
  const cursor = new Date(startMs);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= endMs) {
    const key = cursor.toISOString().slice(0, 7);
    monthMap.set(key, {
      timestamp: cursor.getTime(),
      label: formatDate(cursor.getTime(), { month: "short", year: "2-digit" }),
      total: 0,
      counts: emptyCounts(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  events.forEach((event) => {
    const key = new Date(event.timestamp).toISOString().slice(0, 7);
    const bucket = monthMap.get(key);
    if (bucket) {
      bucket.counts[event.hazard] += 1;
      bucket.total += 1;
    }
  });
  return {
    buckets: Array.from(monthMap.values()),
    granularity: "Monthly",
  };
}

export function hazardSeverityMatrix(events: DisasterEvent[]) {
  return HAZARDS.map((hazard) => {
    const counts = SEVERITY_ORDER.reduce(
      (acc, level) => ({ ...acc, [level]: 0 }),
      {} as Record<SeverityLevel, number>,
    );
    events
      .filter((event) => event.hazard === hazard.id)
      .forEach((event) => {
        counts[event.severity] += 1;
      });
    return {
      ...hazard,
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    };
  }).filter((row) => row.total > 0);
}

export function significantEvents(
  events: DisasterEvent[],
  limit = 6,
): DisasterEvent[] {
  const severityRank: Record<SeverityLevel, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
  };
  return [...events]
    .sort((a, b) => {
      const severityDiff = severityRank[b.severity] - severityRank[a.severity];
      if (severityDiff !== 0) return severityDiff;
      const magnitudeDiff = (b.magnitude ?? 0) - (a.magnitude ?? 0);
      if (magnitudeDiff !== 0) return magnitudeDiff;
      return b.timestamp - a.timestamp;
    })
    .slice(0, limit);
}

export function eventMomentum(
  events: DisasterEvent[],
  start: string,
  end: string,
): { change: number; firstHalf: number; secondHalf: number } {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59Z`);
  const midpoint = startMs + (endMs - startMs) / 2;
  const firstHalf = events.filter((event) => event.timestamp < midpoint).length;
  const secondHalf = events.filter((event) => event.timestamp >= midpoint).length;
  const change =
    firstHalf === 0
      ? secondHalf > 0
        ? 100
        : 0
      : ((secondHalf - firstHalf) / firstHalf) * 100;
  return { change, firstHalf, secondHalf };
}

export function hazardLabel(id: HazardId | null | undefined): string {
  return id ? HAZARD_MAP[id].label : "—";
}

export function hazardColor(id: HazardId | null | undefined): string {
  return id ? HAZARD_MAP[id].color : "#78837d";
}

export function countryHazardMix(events: DisasterEvent[], country: string) {
  const items = events.filter((event) => event.country === country);
  return hazardCounts(items).filter((hazard) => hazard.count > 0);
}
