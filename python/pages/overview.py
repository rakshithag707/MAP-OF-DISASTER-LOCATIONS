import pandas as pd
import plotly.express as px
import streamlit as st
from config import HAZARDS, SEVERITY
from ui import date_and_location_filters, get_data, page_setup

page_setup("Disaster overview",
           "Recorded natural hazards for the selected dates, locations and states.")

seed_frame = pd.DataFrame(columns=["region", "country"])
filters = date_and_location_filters(seed_frame)
raw, frame = get_data(filters)

if frame.empty:
    st.info("No events match these filters. Widen the date range or select more types/states.")
    st.stop()

active = int(frame["active"].sum())
top_type = frame["type"].value_counts().idxmax()
top_region = frame["region"].value_counts().idxmax()
critical = int((frame["severity"] == "critical").sum())
countries = frame["country"].nunique()

cols = st.columns(4)
cols[0].metric("Recorded events", f"{len(frame):,}")
cols[1].metric("Active events", f"{active:,}")
cols[2].metric("Most frequent type", HAZARDS[top_type]["label"])
cols[3].metric("Most affected region", top_region)
cols = st.columns(4)
cols[0].metric("Critical", f"{critical:,}")
cols[1].metric("Moderate", f"{int((frame['severity'] == 'moderate').sum()):,}")
cols[2].metric("Countries", f"{countries:,}")
cols[3].metric("Average per day", f"{len(frame) / max(1, (filters['end'] - filters['start']).days + 1):.1f}")

st.subheader("Activity over time")
grouped = frame.groupby(["day", "type"], as_index=False).size()
figure = px.area(grouped, x="day", y="size", color="type",
                 color_discrete_map={key: value["color"] for key, value in HAZARDS.items()},
                 labels={"day": "Date", "size": "Events", "type": "Hazard"})
figure.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                     font_color="#2a332e", legend_title_text="")
st.plotly_chart(figure, use_container_width=True)

left, right = st.columns([2, 1])
with left:
    st.subheader("Most severe events")
    severe = frame.sort_values(["severity", "magnitude"], ascending=False).head(8)
    st.dataframe(severe[["date", "type", "location", "country", "severity", "measure"]],
                 use_container_width=True, hide_index=True)
with right:
    st.subheader("Disaster states")
    counts = frame["severity"].value_counts().reindex(list(SEVERITY)).fillna(0)
    bar = px.bar(x=counts.values, y=[SEVERITY[key]["label"] for key in counts.index],
                 orientation="h", color=counts.index,
                 color_discrete_map={key: value["color"] for key, value in SEVERITY.items()})
    bar.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      showlegend=False, font_color="#2a332e",
                      xaxis_title="Events", yaxis_title="")
    st.plotly_chart(bar, use_container_width=True)
