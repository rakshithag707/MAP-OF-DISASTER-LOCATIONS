export type PageId = "overview" | "map" | "analytics" | "regional";

export interface PageDefinition {
  id: PageId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
}

export const PAGES: PageDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    eyebrow: "Situation report",
    description:
      "A consolidated view of global hazard activity, exposure and recent significant events.",
  },
  {
    id: "map",
    label: "Disaster map",
    shortLabel: "Map",
    eyebrow: "Geospatial intelligence",
    description:
      "Plot every recorded hazard by location and intensity. Select a marker to inspect the event record.",
  },
  {
    id: "analytics",
    label: "Analytics",
    shortLabel: "Analytics",
    eyebrow: "Event analytics",
    description:
      "Examine frequency, hazard composition, severity and temporal patterns across the selected window.",
  },
  {
    id: "regional",
    label: "Regional analysis",
    shortLabel: "Regions",
    eyebrow: "Regional intelligence",
    description:
      "Compare disaster burden across geographic regions and identify the most affected countries.",
  },
];

export function pageById(id: PageId): PageDefinition {
  return PAGES.find((page) => page.id === id) ?? PAGES[0];
}
