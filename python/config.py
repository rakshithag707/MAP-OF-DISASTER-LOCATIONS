"""Single place to configure data and colours."""

# ── CHANGE THIS ONE LINE to use your own CSV ────────────────────────────────
# Paste a public CSV URL or a local path. Leave empty to use USGS + GDACS.
CSV_SOURCE = ""
# ────────────────────────────────────────────────────────────────────────────

# Column names in your CSV (change here if yours differ).
CSV_COLUMNS = {
    "date": "date", "type": "type", "country": "country", "region": "region",
    "latitude": "latitude", "longitude": "longitude", "severity": "severity",
    "magnitude": "magnitude", "title": "title", "status": "status",
}

HAZARDS = {
    "earthquake": {"label": "Earthquakes", "color": "#dc2626"},
    "flood":      {"label": "Floods", "color": "#2563eb"},
    "wildfire":   {"label": "Wildfires", "color": "#ea580c"},
    "volcano":    {"label": "Volcanic activity", "color": "#9333ea"},
    "storm":      {"label": "Storms & cyclones", "color": "#ca8a04"},
    "drought":    {"label": "Droughts", "color": "#0d9488"},
}
GDACS_TYPES = {"FL": "flood", "WF": "wildfire", "VO": "volcano",
               "TC": "storm", "DR": "drought"}

SEVERITY = {
    "critical": {"label": "Critical", "color": "#b91c1c", "score": 4},
    "high":     {"label": "High",     "color": "#d97706", "score": 3},
    "moderate": {"label": "Moderate", "color": "#2563eb", "score": 2},
    "low":      {"label": "Low",      "color": "#15803d", "score": 1},
}

CONTINENTS = ["Africa", "Asia-Pacific", "Europe", "Middle East",
              "Americas", "Oceania", "Remote / Oceanic"]
