export type HazardId =
  | "earthquake"
  | "storm"
  | "flood"
  | "wildfire"
  | "volcano"
  | "drought";

export type SeverityLevel = "critical" | "high" | "moderate" | "low";
export type SourceId = "USGS" | "GDACS" | "CSV";

export interface HazardDefinition {
  id: HazardId;
  label: string;
  singular: string;
  short: string;
  color: string;
  soft: string;
  gdacsType?: string;
  source: SourceId;
  icon: string;
}

export const HAZARDS: HazardDefinition[] = [
  {
    id: "earthquake",
    label: "Earthquakes",
    singular: "Earthquake",
    short: "EQ",
    color: "#dc2626",
    soft: "rgba(220, 38, 38, 0.10)",
    source: "USGS",
    icon: "activity",
  },
  {
    id: "flood",
    label: "Floods",
    singular: "Flood",
    short: "FL",
    color: "#2563eb",
    soft: "rgba(37, 99, 235, 0.10)",
    gdacsType: "FL",
    source: "GDACS",
    icon: "waves",
  },
  {
    id: "wildfire",
    label: "Wildfires",
    singular: "Wildfire",
    short: "WF",
    color: "#ea580c",
    soft: "rgba(234, 88, 12, 0.10)",
    gdacsType: "WF",
    source: "GDACS",
    icon: "flame",
  },
  {
    id: "volcano",
    label: "Volcanic activity",
    singular: "Volcanic activity",
    short: "VO",
    color: "#9333ea",
    soft: "rgba(147, 51, 234, 0.10)",
    gdacsType: "VO",
    source: "GDACS",
    icon: "mountain",
  },
  {
    id: "storm",
    label: "Storms & cyclones",
    singular: "Storm",
    short: "TC",
    color: "#ca8a04",
    soft: "rgba(202, 138, 4, 0.11)",
    gdacsType: "TC",
    source: "GDACS",
    icon: "wind",
  },
  {
    id: "drought",
    label: "Droughts",
    singular: "Drought",
    short: "DR",
    color: "#0d9488",
    soft: "rgba(13, 148, 136, 0.10)",
    gdacsType: "DR",
    source: "GDACS",
    icon: "sun",
  },
];

export const HAZARD_MAP: Record<HazardId, HazardDefinition> = HAZARDS.reduce(
  (acc, hazard) => ({ ...acc, [hazard.id]: hazard }),
  {} as Record<HazardId, HazardDefinition>,
);

export const ALL_HAZARD_IDS = HAZARDS.map((hazard) => hazard.id);

export const SEVERITY: Record<
  SeverityLevel,
  { label: string; color: string; soft: string; score: number }
> = {
  critical: {
    label: "Critical",
    color: "#b91c1c",
    soft: "rgba(185, 28, 28, 0.09)",
    score: 4,
  },
  high: {
    label: "High",
    color: "#d97706",
    soft: "rgba(217, 119, 6, 0.10)",
    score: 3,
  },
  moderate: {
    label: "Moderate",
    color: "#2563eb",
    soft: "rgba(37, 99, 235, 0.09)",
    score: 2,
  },
  low: {
    label: "Low",
    color: "#15803d",
    soft: "rgba(21, 128, 61, 0.09)",
    score: 1,
  },
};

export const SEVERITY_ORDER: SeverityLevel[] = [
  "critical",
  "high",
  "moderate",
  "low",
];

export const REGIONS = [
  {
    id: "asia-pacific",
    label: "Asia-Pacific",
    color: "#0e7490",
    description: "East, South and Southeast Asia",
  },
  {
    id: "americas",
    label: "Americas",
    color: "#1d4ed8",
    description: "North, Central and South America",
  },
  {
    id: "oceania",
    label: "Oceania",
    color: "#4d7c0f",
    description: "Australasia and the Pacific islands",
  },
  {
    id: "europe",
    label: "Europe",
    color: "#6d28d9",
    description: "Europe and the Mediterranean",
  },
  {
    id: "africa",
    label: "Africa",
    color: "#a16207",
    description: "The African continent",
  },
  {
    id: "middle-east",
    label: "Middle East",
    color: "#be185d",
    description: "Western Asia and the Gulf",
  },
  {
    id: "remote",
    label: "Remote / Oceanic",
    color: "#64748b",
    description: "Areas without a regional assignment",
  },
] as const;

export type RegionLabel = (typeof REGIONS)[number]["label"];

export const REGION_COLORS: Record<string, string> = REGIONS.reduce(
  (acc, region) => ({ ...acc, [region.label]: region.color }),
  {},
);

export function hazardForGdacs(type: string): HazardDefinition | undefined {
  return HAZARDS.find((hazard) => hazard.gdacsType === type.toUpperCase());
}

export function isHazardId(value: string): value is HazardId {
  return HAZARDS.some((hazard) => hazard.id === value);
}
