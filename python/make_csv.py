"""Write the current dataset to python/disasters.csv (and public/disasters.csv).

Run:  python python/make_csv.py
"""
from datetime import date, timedelta
from pathlib import Path
import pandas as pd
from data import load_events

OUT = Path(__file__).resolve().parent / "disasters.csv"
PUBLIC = OUT.parent.parent / "public" / "disasters.csv"
end = date.today()
start = end - timedelta(days=29)
frame, notes = load_events(str(start), str(end))
if frame.empty:
    raise SystemExit("No records returned; CSV not written. " + " ".join(notes))
columns = ["id", "title", "type", "date", "country", "region", "latitude",
           "longitude", "severity", "magnitude", "location", "status", "url",
           "depth_km", "measure", "source", "active"]
frame = frame[[column for column in columns if column in frame.columns]]
frame.to_csv(OUT, index=False)
try:
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(PUBLIC, index=False)
except OSError:
    pass
print(f"{len(frame):,} records written to {OUT} ({start} to {end})")
