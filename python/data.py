"""Live data loading, CSV import, cleaning and filtering."""
from __future__ import annotations

import re
import pandas as pd
import requests
import streamlit as st
from datetime import date, timedelta

from config import CSV_SOURCE, CSV_COLUMNS, GDACS_TYPES, HAZARDS

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"

EXAMPLE_CSV = "https://raw.githubusercontent.com/plotly/datasets/master/earthquakes.csv"


def _severity_from_magnitude(mag: float) -> str:
    if mag >= 7:
        return "critical"
    if mag >= 6:
        return "high"
    if mag >= 5:
        return "moderate"
    return "low"


def _region(lat: float, lon: float, country: str = "") -> str:
    if country in {"Fiji", "Vanuatu", "Solomon Islands", "Tonga", "Samoa", "Kiribati",
                   "Australia", "New Zealand", "Papua New Guinea", "Cook Islands"}:
        return "Oceania"
    if 33 <= lat <= 72 and -25 <= lon <= 45:
        return "Middle East" if lat <= 38 and lon >= 27 else "Europe"
    if 10 <= lat <= 45 and 34 <= lon <= 65:
        return "Middle East"
    if lon >= 110 and -55 < lat < -8:
        return "Oceania"
    if -25 <= lon <= 55 and -40 <= lat <= 37:
        return "Africa"
    if 25 <= lon <= 180 and -12 <= lat <= 82:
        return "Asia-Pacific"
    if -170 <= lon <= -25 and -60 <= lat <= 80:
        return "Americas"
    if (lon <= -140 or lon >= 170) and -55 < lat < -8:
        return "Oceania"
    return "Remote / Oceanic"


def _normalise_type(value: str) -> str:
    text = str(value).lower()
    for key, words in {
        "earthquake": ("earth", "quake", "seism"),
        "flood": ("flood", "rain", "inund"),
        "wildfire": ("fire", "burn"),
        "volcano": ("volcan", "erupt"),
        "storm": ("storm", "cyclone", "hurricane", "typhoon"),
        "drought": ("drought", "dry"),
    }.items():
        if any(word in text for word in words):
            return key
    return text if text in HAZARDS else "earthquake"


def _frames(events: list[dict]) -> pd.DataFrame:
    cols = ["id", "type", "title", "location", "country", "region", "latitude",
            "longitude", "date", "severity", "magnitude", "depth_km", "measure",
            "source", "active", "url"]
    df = pd.DataFrame(events, columns=cols)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
    df = df.dropna(subset=["date", "latitude", "longitude"])
    df = df.drop_duplicates(subset=["id"])
    df["active"] = df["active"].fillna(False).astype(bool)
    df["month"] = df["date"].dt.to_period("M").dt.to_timestamp()
    df["day"] = df["date"].dt.floor("D")
    return df.sort_values("date", ascending=False).reset_index(drop=True)


@st.cache_data(ttl=900, show_spinner=False)
def _usgs(start: str, end: str, min_magnitude: float) -> list[dict]:
    params = {"format": "geojson", "starttime": start, "endtime": end,
              "minmagnitude": min_magnitude, "orderby": "time", "limit": 5000}
    payload = requests.get(USGS_URL, params=params, timeout=30).json()
    events = []
    for feature in payload.get("features", []):
        props, geom = feature.get("properties", {}), feature.get("geometry", {})
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            continue
        place = props.get("place") or "Location not reported"
        mag = props.get("mag")
        events.append({
            "id": f"usgs:{feature.get('id')}", "type": "earthquake",
            "title": props.get("title") or "Earthquake", "location": place,
            "country": place.split(",")[-1].strip() if "," in place else "Unassigned",
            "region": _region(coords[1], coords[0]),
            "latitude": coords[1], "longitude": coords[0],
            "date": pd.to_datetime(props.get("time"), unit="ms", utc=True),
            "severity": _severity_from_magnitude(mag or 0),
            "magnitude": mag, "depth_km": coords[2] if len(coords) > 2 else None,
            "measure": f"M {mag}" if mag is not None else "No measurement",
            "source": "USGS", "active": False, "url": props.get("url"),
        })
    return events


@st.cache_data(ttl=900, show_spinner=False)
def _gdacs(start: str, end: str) -> list[dict]:
    events = []
    for gdacs_type in GDACS_TYPES:
        params = {"fromDate": start, "toDate": end, "eventlist": gdacs_type,
                  "alertlevel": "Green;Orange;Red", "pagenumber": 1}
        try:
            payload = requests.get(GDACS_URL, params=params, timeout=30).json()
        except requests.RequestException:
            continue
        for feature in payload.get("features", []):
            props = feature.get("properties", {})
            coords = (feature.get("geometry") or {}).get("coordinates") or []
            if len(coords) < 2:
                continue
            alert = (props.get("alertlevel") or "").lower()
            country = props.get("country") or "Unassigned"
            severity_data = props.get("severitydata") or {}
            events.append({
                "id": f"gdacs:{props.get('eventtype')}:{props.get('eventid')}",
                "type": GDACS_TYPES.get(props.get("eventtype"), "flood"),
                "title": props.get("name") or "Hazard event",
                "location": props.get("name") or country, "country": country,
                "region": _region(coords[1], coords[0], country),
                "latitude": coords[1], "longitude": coords[0],
                "date": pd.to_datetime(props.get("fromdate"), utc=True, errors="coerce"),
                "severity": {"red": "critical", "orange": "high"}.get(alert, "moderate"),
                "magnitude": severity_data.get("severity"),
                "measure": severity_data.get("severitytext") or f"{alert.title()} alert",
                "source": "GDACS", "active": str(props.get("iscurrent")).lower() == "true",
                "url": (props.get("url") or {}).get("report"),
            })
    return events


@st.cache_data(ttl=900, show_spinner=False)
def _csv(source: str) -> list[dict]:
    frame = pd.read_csv(source)
    frame.columns = [str(column).strip() for column in frame.columns]

    def col(name: str, fallback: str = "") -> str:
        return CSV_COLUMNS.get(name, fallback)

    events = []
    for index, row in frame.iterrows():
        lat = pd.to_numeric(row.get(col("latitude")), errors="coerce")
        lon = pd.to_numeric(row.get(col("longitude")), errors="coerce")
        if pd.isna(lat) or pd.isna(lon):
            continue
        timestamp = pd.to_datetime(row.get(col("date")), errors="coerce", utc=True)
        if pd.isna(timestamp):
            continue
        magnitude = pd.to_numeric(row.get(col("magnitude")), errors="coerce")
        country = str(row.get(col("country")) or "Unassigned")
        severity = str(row.get(col("severity")) or "").lower()
        severity = severity if severity in {"low", "moderate", "high", "critical"} \
            else _severity_from_magnitude(magnitude if pd.notna(magnitude) else 0)
        events.append({
            "id": f"csv:{index}", "type": _normalise_type(row.get(col("type"), "")),
            "title": str(row.get(col("title")) or "Hazard event"),
            "location": country, "country": country,
            "region": str(row.get(col("region")) or _region(lat, lon, country)),
            "latitude": lat, "longitude": lon, "date": timestamp,
            "severity": severity, "magnitude": magnitude,
            "measure": f"M {magnitude}" if pd.notna(magnitude) else severity,
            "source": "CSV",
            "active": str(row.get(col("status")) or "").lower() in {"active", "ongoing"},
            "url": None,
        })
    return events


@st.cache_data(ttl=900, show_spinner=False)
def load_events(start: str, end: str) -> tuple[pd.DataFrame, list[str]]:
    notes: list[str] = []
    if CSV_SOURCE:
        rows = _csv(CSV_SOURCE)
        notes.append(f"Custom CSV source: {CSV_SOURCE}")
    else:
        years = (pd.Timestamp(end) - pd.Timestamp(start)).days / 365
        min_magnitude = 2.5 if years <= 1 else 4.0
        rows = []
        try:
            rows += _usgs(start, end, min_magnitude)
        except requests.RequestException as exc:
            notes.append(f"USGS unavailable: {exc}")
        try:
            rows += _gdacs(start, end)
        except requests.RequestException as exc:
            notes.append(f"GDACS unavailable: {exc}")
    frame = _frames(rows)
    if not frame.empty:
        window = frame[(frame["date"] >= pd.Timestamp(start, tz="UTC")) &
                       (frame["date"] <= pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1))]
        frame = window.reset_index(drop=True)
    return frame, notes


def apply_filters(frame: pd.DataFrame, *, start: date, end: date, types: list[str],
                  states: list[str], continent: str, country: str, status: str) -> pd.DataFrame:
    if frame.empty:
        return frame
    mask = (frame["date"] >= pd.Timestamp(start, tz="UTC")) & \
           (frame["date"] <= pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1))
    mask &= frame["type"].isin(types)
    mask &= frame["severity"].isin(states)
    if continent != "All continents":
        mask &= frame["region"] == continent
    if country != "All countries":
        mask &= frame["country"] == country
    if status == "Active":
        mask &= frame["active"]
    elif status == "Historical":
        mask &= ~frame["active"]
    return frame[mask].copy()
