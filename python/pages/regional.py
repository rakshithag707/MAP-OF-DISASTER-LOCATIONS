import pandas as pd
import plotly.express as px
import streamlit as st
from config import HAZARDS
from ui import date_and_location_filters, get_data, page_setup

page_setup("Regional analysis",
           "Compare regions and countries; filter by continent and country in the sidebar.")
filters = date_and_location_filters(pd.DataFrame(columns=["region", "country"]))
_, frame = get_data(filters)
if frame.empty:
    st.info("No events match these filters.")
    st.stop()

regions = frame.groupby("region").agg(events=("id", "count"),
                                      active=("active", "sum"),
                                      countries=("country", "nunique")).reset_index()
regions = regions.sort_values("events", ascending=False)
countries = frame.groupby(["country", "region"]).agg(
    events=("id", "count"), active=("active", "sum"),
    critical=("severity", lambda values: (values == "critical").sum()),
).reset_index().sort_values("events", ascending=False)

cols = st.columns(3)
cols[0].metric("Most affected country", countries.iloc[0]["country"])
cols[1].metric("Most affected region", regions.iloc[0]["region"])
cols[2].metric("Countries affected", f"{countries.shape[0]:,}")

layout = dict(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
              font_color="#2a332e", showlegend=False)
st.subheader("Events by region")
bar = px.bar(regions, x="events", y="region", orientation="h",
             color="region", labels={"events": "Events", "region": ""})
bar.update_layout(**layout)
st.plotly_chart(bar, use_container_width=True)

st.subheader("Country ranking")
st.dataframe(countries, use_container_width=True, hide_index=True)

st.subheader("Disaster mix by region")
mix = frame.groupby(["region", "type"], as_index=False).size()
stack = px.bar(mix, x="size", y="region", color="type", orientation="h",
               color_discrete_map={key: value["color"] for key, value in HAZARDS.items()},
               labels={"size": "Events", "region": "", "type": "Hazard"})
stack.update_layout(**layout, showlegend=True)
st.plotly_chart(stack, use_container_width=True)
