/**
 * Regenerate the downloadable dataset snapshot.
 *   npx tsx make-csv.mjs
 * Writes public/disasters.csv (served) and src/data/disasters.csv (bundled).
 */
const store = new Map();
globalThis.window = Object.assign(globalThis, {
  setTimeout, clearTimeout,
  localStorage: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
  },
});
Object.defineProperty(globalThis, "localStorage", { value: globalThis.window.localStorage });
const { fetchDisasterData } = await import("./src/lib/disasters.ts");
const fs = await import("node:fs/promises");

const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
const { events, meta } = await fetchDisasterData(start, end, { force: true });

const esc = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const header = ["id","title","type","date","country","region","latitude","longitude",
  "severity","magnitude","location","status","url","depth_km","measurement","source",
  "alert_level","affected_countries"];
const rows = [...events]
  .sort((a, b) => b.timestamp - a.timestamp)
  .map((event) => [
    event.id, event.title, event.hazard, new Date(event.timestamp).toISOString(),
    event.country, event.region, event.lat.toFixed(5), event.lon.toFixed(5),
    event.severity, event.magnitude ?? "", event.location,
    event.active ? "active" : "historical", event.sourceUrl ?? "",
    event.depthKm ?? "", event.measure, event.source, event.alertLevel ?? "",
    (event.affectedCountries ?? []).join("; "),
  ]);
const csv = [header, ...rows].map((row) => row.map(esc).join(",")).join("\r\n") + "\r\n";
await fs.mkdir("public", { recursive: true });
await fs.mkdir("src/data", { recursive: true });
await fs.writeFile("public/disasters.csv", csv, "utf8");
await fs.writeFile("src/data/disasters.csv", csv, "utf8");
const severity = events.reduce((acc, event) => {
  acc[event.severity] = (acc[event.severity] ?? 0) + 1;
  return acc;
}, {});
await fs.writeFile("public/disasters-meta.json", JSON.stringify({
  generatedAt: new Date().toISOString(), windowStart: start, windowEnd: end,
  records: events.length,
  sources: { usgs: meta.usgs.count, gdacs: meta.gdacs.count }, severity,
}, null, 2), "utf8");
console.log(`${events.length.toLocaleString()} records written (${start} to ${end})`);
