import folium
import pandas as pd
import streamlit as st
from streamlit_folium import st_folium
from config import HAZARDS, SEVERITY
from ui import date_and_location_filters, get_data, page_setup

page_setup("Disaster map",
           "Map of every selected event. Colour identifies the disaster type; click a marker for details.")

filters = date_and_location_filters(pd.DataFrame(columns=["region", "country"]))
_, frame = get_data(filters)
if frame.empty:
    st.info("No events match these filters.")
    st.stop()

legend = " &nbsp; ".join(
    f"<span style='color:{value['color']}'>●</span> {value['label']}"
    for value in HAZARDS.values()
)
st.markdown(legend, unsafe_allow_html=True)

st.subheader("Severity profile by disaster")
states = ["critical", "high", "moderate", "low"]
matrix = (
    frame.groupby(["type", "severity"]).size().unstack(fill_value=0)
    .reindex(columns=states, fill_value=0)
)
matrix["Total"] = matrix[states].sum(axis=1)
show = matrix.rename(index={key: value["label"] for key, value in HAZARDS.items()})
show.columns = [SEVERITY[key]["label"] if key in SEVERITY else key for key in show.columns]
st.dataframe(show, use_container_width=True)

map_object = folium.Map(location=[15, 5], zoom_start=2, min_zoom=2, max_zoom=12,
                        tiles="CartoDB positron", control_scale=True)
for row in frame.itertuples():
    color = HAZARDS.get(row.type, {}).get("color", "#ef4444")
    state = SEVERITY.get(row.severity, SEVERITY["low"])
    popup = folium.Popup(
        f"<b>{HAZARDS.get(row.type, {}).get('label', row.type)}</b><br>"
        f"{row.location}<br>{row.date:%d %b %Y %H:%M} UTC<br>"
        f"<span style='color:{state['color']}'>State: {state['label']}</span><br>"
        f"{row.measure}<br>Source: {row.source}",
        max_width=290)
    folium.CircleMarker(
        location=[row.latitude, row.longitude], radius=4 + state["score"] * 1.3,
        color=state["color"], weight=1.6 if row.active else 1.1,
        dashArray="3 3" if row.active else None,
        fill=True, fill_color=color, fill_opacity=0.9,
        tooltip=f"{HAZARDS.get(row.type, {}).get('label', row.type)} · {row.location}",
        popup=popup).add_to(map_object)
st_folium(map_object, height=560, use_container_width=True)

counts = frame["type"].value_counts()
st.caption(" · ".join(f"{HAZARDS[key]['label']}: {value:,}" for key, value in counts.items()))
