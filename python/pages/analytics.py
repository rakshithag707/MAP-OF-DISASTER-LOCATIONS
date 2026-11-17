import pandas as pd
import plotly.express as px
import streamlit as st
from config import HAZARDS, SEVERITY
from ui import date_and_location_filters, get_data, page_setup

page_setup("Analytics", "Frequency, type, severity and change over time.")
filters = date_and_location_filters(pd.DataFrame(columns=["region", "country"]))
_, frame = get_data(filters)
if frame.empty:
    st.info("No events match these filters.")
    st.stop()

layout = dict(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
              font_color="#2a332e", legend_title_text="")

st.subheader("Frequency over time")
grouped = frame.groupby(["day", "type"], as_index=False).size()
chart = px.area(grouped, x="day", y="size", color="type",
                color_discrete_map={key: value["color"] for key, value in HAZARDS.items()},
                labels={"day": "Date", "size": "Events", "type": "Hazard"})
chart.update_layout(**layout)
st.plotly_chart(chart, use_container_width=True)

left, right = st.columns(2)
with left:
    st.subheader("Distribution by disaster type")
    counts = frame["type"].value_counts().reset_index()
    pie = px.pie(counts, names="type", values="count", hole=0.76,
                 color="type",
                 color_discrete_map={key: value["color"] for key, value in HAZARDS.items()})
    pie.update_layout(**layout)
    st.plotly_chart(pie, use_container_width=True)
with right:
    st.subheader("Disaster states")
    states = frame["severity"].value_counts().reindex(list(SEVERITY)).fillna(0).reset_index()
    states.columns = ["severity", "count"]
    bars = px.bar(states, x="severity", y="count", color="severity",
                  color_discrete_map={key: value["color"] for key, value in SEVERITY.items()},
                  labels={"severity": "State", "count": "Events"})
    bars.update_layout(**layout, showlegend=False)
    st.plotly_chart(bars, use_container_width=True)

st.subheader("Earthquake magnitude profile")
quakes = frame[frame["type"] == "earthquake"].dropna(subset=["magnitude"])
if quakes.empty:
    st.caption("No earthquake records in this selection.")
else:
    histogram = px.histogram(quakes, x="magnitude", nbins=18,
                             labels={"magnitude": "Magnitude"})
    histogram.update_traces(marker_color="#dc2626")
    histogram.update_layout(**layout)
    st.plotly_chart(histogram, use_container_width=True)
