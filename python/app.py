"""Entry point: run with `streamlit run app.py`."""
import streamlit as st

overview = st.Page("pages/overview.py", title="Overview", default=True)
map_page = st.Page("pages/disaster_map.py", title="Disaster map")
analytics = st.Page("pages/analytics.py", title="Analytics")
regional = st.Page("pages/regional.py", title="Regional analysis")

navigation = st.navigation([overview, map_page, analytics, regional])
st.markdown(
    "<style>body{background:#f6f7f5;color:#0c1210}"
    "section[data-testid='stSidebar']{background:#ffffff}</style>",
    unsafe_allow_html=True,
)
navigation.run()
