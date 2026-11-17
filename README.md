# Disaster Monitor

Interactive map and analytics for recorded natural hazards, using live USGS and GDACS
feeds (earthquakes, floods, wildfires, storms, droughts, volcanic activity).

## Use your own CSV — one line

Open `src/config.ts` (React app) or `python/config.py` (Python app) and paste your
CSV URL/path into the line marked:

```python
CSV_SOURCE = "https://example.com/my-events.csv"
```

Leave it empty (`""`) to use the live feeds. If your column names differ, adjust the
`CSV_COLUMNS` / `CSV_FIELDS` mapping directly below it. Recognised fields: date, type,
country, region, latitude, longitude, severity, magnitude, title, status.

Severity accepts `low`, `moderate`, `high`, `critical` (or GDACS `green`/`orange`/`red`).
Dates may be ISO (`2026-01-31T10:00Z`) or `31/01/2026`.

## Live feed panel

Clicking **Live feeds** in the sidebar, the feed status card, or the status chip in the
top bar opens a detail panel showing: per-source connection state, record counts, coverage
rules, window details, excluded records, applied magnitude floor, source warnings, direct
links to the USGS and GDACS documentation, and a refresh button. Close it with the X,
Escape, or by clicking the backdrop.

## Map and state model

The map is a dark module inside the light interface. Marker fill is the disaster type
(earthquake red, flood blue, wildfire orange, volcano purple, storm gold, drought teal).
The outer ring is the state: red critical, amber high, blue moderate, green low. Selecting
a marker shows the event record plus the four-state profile of that disaster class.

Preset 7D/30D/90D buttons were removed. Date changes apply automatically after a valid
range is entered.

## Interface notes

The interface is intentionally minimal: no per-tab record counts in the sidebar, no feed
record numbers, no "Analysis" breadcrumb, no sync timestamp, no filtered "Export view"
button, and no source-cap warning banners. Feed status and window details live in the
feeds panel, opened from the sidebar or the Feeds button. The single **Download CSV**
button in the top bar saves the full dataset.

## Downloadable dataset

The project ships a ready-to-use snapshot of everything shown in the app:

| File | Purpose |
| --- | --- |
| `public/disasters.csv` | Served at `/disasters.csv`; downloadable directly |
| `src/data/disasters.csv` | Bundled so the in-app **Download CSV** button works when only `dist/index.html` is hosted |
| `python/disasters.csv` | Same snapshot for the Streamlit app |

The **Download CSV** button downloads the full dataset. **Export view** downloads only the
currently filtered rows. Regenerate the snapshot with:

```bash
npx tsx make-csv.mjs          # web app
python python/make_csv.py     # python app
```

## Filtering

Every page shares the same filters: single day or date range, hazard classes, disaster
state, active vs historical, continent and country. Dates apply automatically as soon as
they are valid — there is no apply step.

State colours are fixed across the whole app:

| State | Colour |
| --- | --- |
| Critical | `#b91c1c` red |
| High | `#d97706` amber |
| Moderate | `#2563eb` blue |
| Low | `#15803d` green |

Every disaster keeps its own four-state profile on the map page and in the disaster
dropdown, and a selected marker shows that disaster's full state breakdown.

## Run

React web app (the build served here):

```bash
npm install
npm run dev
npm run build
```

Python / Streamlit version:

```bash
cd python
pip install -r requirements.txt
streamlit run app.py
```

The sandbox this project is delivered in can only execute and serve the React/Vite
build. The `python/` folder contains the equivalent Streamlit implementation, one file
per page, for deployment where Python is available.

Data: USGS Earthquake API (earthquake.usgs.gov/fdsnws/event/1) and GDACS
(gdacs.org/gdacsapi). Official feeds may be delayed; follow local authorities in an
emergency.
