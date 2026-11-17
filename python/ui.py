"""Shared dark interface and filter controls."""
from datetime import date, timedelta
import pandas as pd
import streamlit as st
from config import CONTINENTS, HAZARDS, SEVERITY
from data import apply_filters, load_events

CSS = """
<style>
.stApp { background: #f6f7f5; color: #0c1210; }
section[data-testid="stSidebar"] { background: #ffffff; border-right: 1px solid #e4e8e4; }
div[data-testid="stMetric"] { background: #ffffff; border: 1px solid #e4e8e4;
  border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(15,23,20,.04); }
div[data-testid="stMetricLabel"] { color: #55605a !important; }
div[data-testid="stMetricValue"] { color: #0c1210 !important; }
h1, h2, h3 { letter-spacing: -0.02em; color: #0c1210; }
[data-testid="stCaptionContainer"], .stCaption { color: #55605a !important; }
div[data-baseweb="select"] > div { background: #ffffff; border-color: #cdd4ce; }
</style>
"""


def page_setup(title: str, description: str) -> None:
    st.set_page_config(page_title=f"{title} · Disaster Monitor", layout="wide")
    st.markdown(CSS, unsafe_allow_html=True)
    st.title(title)
    st.caption(description)


def date_and_location_filters(frame: pd.DataFrame):
    with st.sidebar:
        st.subheader("Filters")
        single = st.toggle("Single day", value=False)
        if single:
            start = st.date_input("Date", value=date.today() - timedelta(days=1),
                                  max_value=date.today())
            end = start
        else:
            start, end = st.date_input(
                "Date range", value=(date.today() - timedelta(days=29), date.today()),
                max_value=date.today())
        continent = st.selectbox("Continent / region",
                                  ["All continents", *CONTINENTS])
        pool = frame if frame.empty else frame[
            frame["region"].isin(CONTINENTS if continent == "All continents" else [continent])]
        countries = sorted(pool["country"].dropna().unique().tolist()) if not pool.empty else []
        country = st.selectbox("Country", ["All countries", *countries])
        states = st.multiselect("Disaster state", list(SEVERITY),
                                default=list(SEVERITY),
                                format_func=lambda key: SEVERITY[key]["label"])
        types = st.multiselect("Disaster type", list(HAZARDS),
                                default=list(HAZARDS),
                                format_func=lambda key: HAZARDS[key]["label"])
        status = st.radio("Status", ["All", "Active", "Historical"], horizontal=True)
    return dict(start=start, end=end, types=types or list(HAZARDS),
                states=states or list(SEVERITY), continent=continent,
                country=country, status=status)


def get_data(filters: dict):
    raw, notes = load_events(str(filters["start"]), str(filters["end"]))
    for note in notes:
        st.warning(note)
    filtered = apply_filters(raw, **filters)
    st.caption(
        f"{len(filtered):,} events · {filters['start']} → {filters['end']} · UTC"
        f" · {filters['country']} · {filters['continent']} · source: "
        f"{'CSV' if raw.attrs.get('csv') else 'USGS + GDACS'}"
    )
    return raw, filtered


def state_color(state: str) -> str:
    return SEVERITY.get(state, SEVERITY["low"])["color"]
