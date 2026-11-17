/**
 * ---------------------------------------------------------------------------
 * DATA SOURCE — change this ONE LINE to read your own CSV instead of live APIs.
 * ---------------------------------------------------------------------------
 * Paste a public CSV URL (https://…) or a path inside /public (e.g. "/events.csv").
 * Leave it empty ("") to use the live USGS + GDACS feeds.
 */
export const CSV_SOURCE = "";

/**
 * If your CSV uses different column names, map them here. Everything is optional:
 * unmatched columns fall back to the live-feed defaults below.
 *
 *   date        event date/time      type      earthquake|flood|wildfire|storm|drought|volcano
 *   country     country name         region    continent / region name (optional)
 *   severity    low|moderate|high|critical or GDACS colours (green|orange|red)
 *   latitude / longitude             magnitude numeric intensity (optional)
 */
export const CSV_FIELDS = {
  id: "id",
  title: "title",
  type: "type",
  date: "date",
  country: "country",
  region: "region",
  latitude: "latitude",
  longitude: "longitude",
  severity: "severity",
  magnitude: "magnitude",
  location: "location",
  status: "status",
  url: "url",
};
