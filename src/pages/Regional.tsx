import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Globe2,
  Lightbulb,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import type { DisasterEvent } from "../lib/disasters";
import {
  countryStats,
  hazardCounts,
  regionStats,
  summarize,
  type CountryStat,
} from "../lib/analytics";
import { HAZARD_MAP, REGIONS, SEVERITY } from "../lib/hazards";
import { formatDateTime, formatRange, spanDays } from "../lib/format";
import { PageHeading } from "../components/PageHeading";
import { Plot } from "../components/Plot";
import { baseLayout } from "../lib/chartTheme";
import {
  EmptyState,
  HazardDot,
  SectionHeader,
} from "../components/ui";
import { cn } from "../utils/cn";

type SortKey = "total" | "country" | "active" | "critical" | "share";
type SortDirection = "asc" | "desc";

function RegionMetric({
  label,
  value,
  caption,
  footer,
  accent,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  footer: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel relative overflow-hidden p-3.5">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-[0.09] blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between">
        <span className="micro-label">{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="mt-3 truncate text-[19px] font-medium leading-tight tracking-[-0.03em] text-ink">
        {value}
      </div>
      <p className="mt-1 line-clamp-1 text-[10px] text-muted">{caption}</p>
      <div className="mt-2.5 border-t border-line/60 pt-2 font-mono text-[8px] uppercase tracking-[0.05em] text-muted-dim">
        {footer}
      </div>
    </div>
  );
}

interface RegionalProps {
  events: DisasterEvent[];
  start: string;
  end: string;
}

export function Regional({ events, start, end }: RegionalProps) {
  const days = spanDays(start, end);
  const summary = useMemo(() => summarize(events, days), [events, days]);
  const regions = useMemo(
    () => regionStats(events).filter((region) => region.total > 0).sort((a, b) => b.total - a.total),
    [events],
  );
  const countries = useMemo(() => countryStats(events), [events]);
  const hazardMix = useMemo(
    () => hazardCounts(events).filter((hazard) => hazard.count > 0),
    [events],
  );
  const [search, setSearch] = useState("");
  const [focusRegion, setFocusRegion] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAll, setShowAll] = useState(false);

  const regionLabels = useMemo(
    () => regions.map((region) => region.region),
    [regions],
  );

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = countries.filter((country) => {
      if (focusRegion !== "all" && country.region !== focusRegion) return false;
      if (!query) return true;
      return (
        country.country.toLowerCase().includes(query) ||
        country.region.toLowerCase().includes(query)
      );
    });
    return [...list].sort((a, b) => {
      const direction = sortDirection === "desc" ? -1 : 1;
      if (sortKey === "country") {
        return a.country.localeCompare(b.country) * direction;
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * direction;
    });
  }, [countries, focusRegion, search, sortKey, sortDirection]);

  const visibleCountries = showAll ? filteredCountries : filteredCountries.slice(0, 12);
  const topThreeShare = regions.slice(0, 3).reduce((sum, region) => sum + region.share, 0);
  const topCountry = countries[0];
  const secondCountry = countries[1];
  const leadingCountryGap = topCountry
    ? topCountry.total - (secondCountry?.total ?? 0)
    : 0;
  const topDominated = topCountry?.dominantHazard
    ? HAZARD_MAP[topCountry.dominantHazard]
    : null;

  const regionBarData = useMemo(
    () => [
      {
        type: "bar",
        orientation: "h",
        y: [...regions].reverse().map((region) => region.region),
        x: [...regions].reverse().map((region) => region.total),
        marker: {
          color: [...regions].reverse().map((region) => region.color),
          opacity: 0.78,
          line: { width: 0 },
        },
        width: 0.48,
        hovertemplate: "%{y}<br>%{x} events<extra></extra>",
      },
    ],
    [regions],
  );

  const regionBarLayout = useMemo(
    () =>
      baseLayout({
        height: 244,
        margin: { l: 98, r: 22, t: 4, b: 26 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.045)",
          rangemode: "tozero",
          fixedrange: true,
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0)",
          tickfont: { family: "IBM Plex Mono, monospace", size: 9, color: "#2a332e" },
          fixedrange: true,
        },
        showlegend: false,
        hovermode: "closest",
      }),
    [],
  );

  const regionMixData = useMemo(
    () =>
      hazardMix.map((hazard) => {
        const definition = HAZARD_MAP[hazard.id];
        return {
          type: "bar",
          orientation: "h",
          name: definition.label,
          y: [...regions].reverse().map((region) => region.region),
          x: [...regions].reverse().map((region) => region.hazards[hazard.id] ?? 0),
          marker: { color: definition.color, line: { width: 0 }, opacity: 0.8 },
          hovertemplate: `%{y} · ${definition.label}<br>%{x} events<extra></extra>`,
        };
      }),
    [hazardMix, regions],
  );

  const regionMixLayout = useMemo(
    () =>
      baseLayout({
        height: 244,
        barmode: "stack",
        margin: { l: 98, r: 20, t: 34, b: 26 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.045)",
          rangemode: "tozero",
          fixedrange: true,
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0)",
          tickfont: { family: "IBM Plex Mono, monospace", size: 9, color: "#2a332e" },
          fixedrange: true,
        },
        showlegend: true,
        legend: {
          orientation: "h",
          x: 0,
          y: 1.22,
          font: { family: "IBM Plex Mono, monospace", size: 8.5, color: "#3f4a44" },
        },
        hovermode: "closest",
      }),
    [],
  );

  const countryBarData = useMemo(
    () => {
      const leaders = countries.slice(0, 9);
      return [
        {
          type: "bar",
          orientation: "h",
          y: [...leaders].reverse().map((country) => country.country),
          x: [...leaders].reverse().map((country) => country.total),
          marker: {
            color: [...leaders]
              .reverse()
              .map((country) =>
                country.dominantHazard ? HAZARD_MAP[country.dominantHazard].color : "#78837d",
              ),
            opacity: 0.76,
            line: { width: 0 },
          },
          width: 0.48,
          hovertemplate: "%{y}<br>%{x} events<extra></extra>",
        },
      ];
    },
    [countries],
  );

  const countryBarLayout = useMemo(
    () =>
      baseLayout({
        height: 306,
        margin: { l: 98, r: 20, t: 4, b: 24 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.045)",
          rangemode: "tozero",
          fixedrange: true,
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0)",
          tickfont: { family: "IBM Plex Mono, monospace", size: 9, color: "#2a332e" },
          fixedrange: true,
        },
        showlegend: false,
        hovermode: "closest",
      }),
    [],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? (
      <ChevronsUpDown size={9} className="opacity-50" />
    ) : sortDirection === "desc" ? (
      <ArrowDown size={9} />
    ) : (
      <ArrowUp size={9} />
    );

  const readout = useMemo(() => {
    if (!regions.length) return "No regional activity is present in the current window.";
    const leader = regions[0];
    const leadingHazard = hazardMix[0];
    const countryText = topCountry
      ? `${topCountry.country} leads country exposure with ${topCountry.total.toLocaleString()} records${
          leadingCountryGap > 0 ? `, ${leadingCountryGap.toLocaleString()} ahead of ${secondCountry?.country}` : ""
        }.`
      : "";
    return `${leader.region} accounts for ${leader.share.toFixed(1)}% of all recorded events (${leader.total.toLocaleString()}). ${
      leadingHazard ? `${leadingHazard.label} are the dominant hazard overall at ${leadingHazard.share.toFixed(1)}%.` : ""
    } ${countryText}`;
  }, [regions, hazardMix, topCountry, secondCountry, leadingCountryGap]);

  const regionOptions = REGIONS.filter((region) => regionLabels.includes(region.label));

  return (
    <div className="fade-in space-y-4">
      <PageHeading
        eyebrow="Regional analysis"
        title="Regional analysis"
        description="Compare disaster burden across geographic regions, identify the most affected countries and examine the hazard mix behind each regional profile."
        start={start}
        end={end}
        aside={
          <div className="hidden items-center gap-5 rounded-lg border border-line bg-[#f8faf7] px-3.5 py-2.5 lg:flex">
            <div>
              <div className="micro-label mb-1">Regions active</div>
              <div className="num text-[15px] leading-none text-ink">
                {regions.length}/{REGIONS.length}
              </div>
            </div>
            <div className="h-7 w-px bg-line" />
            <div>
              <div className="micro-label mb-1">Countries</div>
              <div className="num text-[15px] leading-none text-ink">
                {countries.length.toLocaleString()}
              </div>
            </div>
            <div className="h-7 w-px bg-line" />
            <div>
              <div className="micro-label mb-1">Concentration</div>
              <div className="num text-[15px] leading-none text-signal">
                {topThreeShare.toFixed(0)}%
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RegionMetric
          label="Most affected country"
          value={summary.topCountry}
          caption={
            topCountry
              ? `${topCountry.total.toLocaleString()} events · ${
                  topDominated?.label ?? "mixed hazards"
                }`
              : "No country attribution"
          }
          footer={`${topCountry?.share.toFixed(1) ?? "0.0"}% of recorded events`}
          accent={topDominated?.color ?? "#c2410c"}
          icon={<MapPin size={13} strokeWidth={1.8} />}
        />
        <RegionMetric
          label="Most affected region"
          value={summary.topRegion}
          caption={`${summary.topRegionCount.toLocaleString()} events recorded`}
          footer={`${
            regions.find((region) => region.region === summary.topRegion)?.share.toFixed(1) ?? "0.0"
          }% regional share`}
          accent={
            regions.find((region) => region.region === summary.topRegion)?.color ?? "#0e7490"
          }
          icon={<Globe2 size={13} strokeWidth={1.8} />}
        />
        <RegionMetric
          label="Countries affected"
          value={summary.countryCount.toLocaleString()}
          caption={`Across ${regions.length} geographic regions`}
          footer={`${summary.active} active alerts in window`}
          accent="#15803d"
          icon={<Users size={13} strokeWidth={1.8} />}
        />
        <RegionMetric
          label="Regional concentration"
          value={`${topThreeShare.toFixed(1)}%`}
          caption="Share held by the three leading regions"
          footer={`${regions.slice(0, 3).reduce((sum, region) => sum + region.total, 0).toLocaleString()} events in top 3`}
          accent="#6d28d9"
          icon={<Lightbulb size={13} strokeWidth={1.8} />}
        />
      </div>

      <div className="panel flex items-start gap-3 px-4 py-3">
        <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-signal/20 bg-signal/[0.08] text-signal">
          <Lightbulb size={12} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="micro-label mb-1">Regional summary</div>
          <p className="text-[10.5px] leading-relaxed text-muted">{readout}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <section className="panel">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Occurrence by region"
              eyebrow="Comparison"
              description="Total recorded events across geographic regions."
              action={
                <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
                  Top 3 · {topThreeShare.toFixed(0)}%
                </span>
              }
            />
          </div>
          {regions.length ? (
            <div className="px-1 py-1.5">
              <Plot
                data={regionBarData}
                layout={regionBarLayout}
                ariaLabel="Horizontal bar chart comparing disaster events across regions"
              />
            </div>
          ) : (
            <EmptyState title="No regional data" message="No records match the current filters." />
          )}
        </section>

        <section className="panel xl:col-span-2">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Hazard mix by region"
              eyebrow="Composition"
              description="Stacked event counts reveal how hazard profiles differ between regions."
            />
          </div>
          {regions.length && hazardMix.length ? (
            <div className="px-1 py-1.5">
              <Plot
                data={regionMixData}
                layout={regionMixLayout}
                ariaLabel="Stacked bar chart of hazard composition by region"
              />
            </div>
          ) : (
            <EmptyState title="No hazard mix" message="No records match the current filters." />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_342px]">
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 pb-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeader
              title="Country ranking"
              eyebrow="Affected countries"
              description={`${filteredCountries.length.toLocaleString()} countries with attributable records. Click a column to sort.`}
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="field h-[32px] w-[154px]">
                <Search size={11} className="shrink-0 text-muted-dim" />
                <input
                  type="search"
                  placeholder="Search country…"
                  aria-label="Search countries"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="placeholder:text-muted-dim/70"
                />
              </div>
              <div className="relative">
                <select
                  className="field h-[32px] w-[136px] appearance-none pr-6 text-[10px] text-ink-soft"
                  value={focusRegion}
                  onChange={(event) => setFocusRegion(event.target.value)}
                  aria-label="Filter country ranking by region"
                >
                  <option value="all">All regions</option>
                  {regionOptions.map((region) => (
                    <option key={region.id} value={region.label}>
                      {region.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-dim"
                />
              </div>
            </div>
          </div>

          {visibleCountries.length === 0 ? (
            <EmptyState
              title="No countries found"
              message="No attributable country records match the search or region filter."
              action={
                (search || focusRegion !== "all") && (
                  <button
                    type="button"
                    className="text-[10.5px] text-signal transition-opacity hover:opacity-80"
                    onClick={() => {
                      setSearch("");
                      setFocusRegion("all");
                    }}
                  >
                    Reset filters
                  </button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="data-table w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-8 text-center">#</th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-[0.1em]"
                        onClick={() => toggleSort("country")}
                      >
                        Country {sortIcon("country")}
                      </button>
                    </th>
                    <th>Region</th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-[0.1em]"
                        onClick={() => toggleSort("total")}
                      >
                        Events {sortIcon("total")}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-[0.1em]"
                        onClick={() => toggleSort("share")}
                      >
                        Share {sortIcon("share")}
                      </button>
                    </th>
                    <th>Dominant hazard</th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-[0.1em]"
                        onClick={() => toggleSort("active")}
                      >
                        Active {sortIcon("active")}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-[0.1em]"
                        onClick={() => toggleSort("critical")}
                      >
                        Critical {sortIcon("critical")}
                      </button>
                    </th>
                    <th>Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCountries.map((country: CountryStat, index) => (
                    <tr key={country.country}>
                      <td className="text-center font-mono text-[8px] text-muted-dim">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <span className="flex items-center gap-2 font-medium text-ink-soft">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                REGIONS.find((region) => region.label === country.region)?.color ??
                                "#94a3b8",
                            }}
                          />
                          {country.country}
                        </span>
                      </td>
                      <td className="text-[10px] text-muted">{country.region}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="num text-[10.5px] text-ink-soft">
                            {country.total.toLocaleString()}
                          </span>
                          <span className="h-[3px] w-12 overflow-hidden rounded-full bg-line">
                            <span
                              className="block h-full rounded-full bg-info/60"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (country.total / (countries[0]?.total || 1)) * 100,
                                )}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="num text-[10px] text-muted">
                        {country.share.toFixed(1)}%
                      </td>
                      <td>
                        {country.dominantHazard ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-muted">
                            <HazardDot hazard={country.dominantHazard} size={4} />
                            {HAZARD_MAP[country.dominantHazard].short}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {country.active > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-live">
                            <span className="live-dot h-[3px] w-[3px]" />
                            {country.active}
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] text-muted-dim">0</span>
                        )}
                      </td>
                      <td>
                        {country.critical > 0 ? (
                          <span
                            className="num text-[10px]"
                            style={{ color: SEVERITY.critical.color }}
                          >
                            {country.critical}
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] text-muted-dim">0</span>
                        )}
                      </td>
                      <td>
                        {country.latest ? (
                          <span
                            className="font-mono text-[8.5px] text-muted"
                            title={formatDateTime(country.latest.timestamp)}
                          >
                            {new Intl.DateTimeFormat("en-GB", {
                              month: "short",
                              day: "2-digit",
                              timeZone: "UTC",
                            }).format(country.latest.timestamp)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredCountries.length > 12 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
                Showing {visibleCountries.length} of {filteredCountries.length} countries
              </span>
              <button
                type="button"
                className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted transition-colors hover:text-ink"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Show top 12" : `Show all ${filteredCountries.length}`}
                <ChevronRight
                  size={10}
                  className={cn("transition-transform", showAll && "rotate-90")}
                />
              </button>
            </div>
          )}
        </section>

        <section className="panel flex flex-col">
          <div className="border-b border-line p-4 pb-3">
            <SectionHeader
              title="Country hotspots"
              eyebrow="Top ranked"
              description="Leading countries, coloured by dominant hazard."
            />
          </div>
          {countries.length ? (
            <div className="px-1 pt-1">
              <Plot
                data={countryBarData}
                layout={countryBarLayout}
                ariaLabel="Horizontal bar chart of the most affected countries"
              />
            </div>
          ) : (
            <EmptyState title="No country data" message="No attributable country records." />
          )}
          <div className="mt-auto border-t border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
                Leading country
              </span>
              <span className="flex items-center gap-1.5 text-[9.5px] text-ink-soft">
                {topCountry?.dominantHazard && (
                  <HazardDot hazard={topCountry.dominantHazard} size={5} />
                )}
                {topCountry?.country ?? "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="panel px-4 py-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-dim" />
            <p className="text-[9.5px] leading-relaxed text-muted-dim">
              Country attribution for USGS records is derived from the reported place
              descriptor. Unattributed records remain visible on the map but are excluded
              from country rankings. Region boundaries are analytical groupings, not
              political borders.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.06em] text-muted-dim">
            <span>{formatRange(start, end)}</span>
            <span className="h-3 w-px bg-line" />
            <span>UTC · USGS + GDACS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
