import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import type { DisasterEvent } from "../lib/disasters";
import { HAZARD_MAP, SEVERITY, SEVERITY_ORDER } from "../lib/hazards";
import { formatDateTime } from "../lib/format";

const MAX_MARKERS = 1400;

const DARK_BASE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const BASEMAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> · HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

interface WorldMapProps {
  events: DisasterEvent[];
  selectedId?: string;
  onSelect: (event: DisasterEvent | null) => void;
  /** Full state profile of the selected marker's disaster class. */
  selectedMix?: Partial<Record<string, number>> & { total?: number };
  className?: string;
}

function escapeHtml(value?: string | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markerRadius(event: DisasterEvent): number {
  if (event.hazard === "earthquake" && typeof event.magnitude === "number") {
    return Math.max(3.4, Math.min(12, 2.4 + event.magnitude * 1.05));
  }
  const score = SEVERITY[event.severity].score;
  return Math.max(3.6, Math.min(10, 3 + score * 1.3));
}

function severityRank(event: DisasterEvent): number {
  return SEVERITY[event.severity].score * 1000 + (event.magnitude ?? 0) * 10;
}

function popupHtml(
  event: DisasterEvent,
  mix?: Partial<Record<string, number>> & { total?: number },
): string {
  const hazard = HAZARD_MAP[event.hazard];
  const severity = SEVERITY[event.severity];
  return `
    <div style="min-width:210px;font-family:'Instrument Sans',system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:${hazard.color};">
          <span style="width:5px;height:5px;border-radius:99px;background:${hazard.color};"></span>${escapeHtml(hazard.singular)}
        </span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:7.5px;text-transform:uppercase;letter-spacing:.07em;color:${event.active ? "#15803d" : "#78837d"};">
          ${event.active ? "● Active" : "Historical"}
        </span>
      </div>
      <div style="font-size:12px;font-weight:600;line-height:1.35;color:#0c1210;">${escapeHtml(event.location)}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#78837d;margin-top:5px;">${escapeHtml(formatDateTime(event.timestamp))} UTC</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #e4e8e4;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:8px;padding:3px 5px;border:1px solid ${severity.color}55;border-radius:4px;color:${severity.color};background:${severity.soft};">${escapeHtml(severity.label)}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#2a332e;">${escapeHtml(event.measure)}</span>
      </div>
      ${
        mix
          ? `<div style="margin-top:8px;border-top:1px solid #e4e8e4;padding-top:7px;">
              <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.08em;color:#78837d;text-transform:uppercase;margin-bottom:4px;">States in ${escapeHtml(hazard.label)}</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
                ${SEVERITY_ORDER.map(
                  (level) =>
                    `<div style="border-radius:4px;padding:3px 4px;background:${SEVERITY[level].soft};border:1px solid ${SEVERITY[level].color}33;text-align:center;">
                       <div style="font-family:'IBM Plex Mono',monospace;font-size:6.5px;letter-spacing:.03em;color:${SEVERITY[level].color};text-transform:uppercase;">${SEVERITY[level].label}</div>
                       <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#0c1210;">${mix[level] ?? 0}</div>
                     </div>`,
                ).join("")}
              </div>
            </div>`
          : ""
      }
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:7.5px;letter-spacing:.05em;color:#78837d;">${escapeHtml(event.source)} · ${escapeHtml(event.country)}</span>
        ${
          event.sourceUrl
            ? `<a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noreferrer noopener" style="color:#c2410c;font-family:'IBM Plex Mono',monospace;font-size:8px;text-decoration:none;">SOURCE ↗</a>`
            : ""
        }
      </div>
    </div>`;
}

export function WorldMap({
  events,
  selectedId,
  onSelect,
  selectedMix,
  className,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const selectRef = useRef(onSelect);
  const [rendered, setRendered] = useState(0);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [18, 8],
      zoom: 2,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      worldCopyJump: true,
      attributionControl: true,
      preferCanvas: true,
    });
    map.zoomControl.setPosition("topright");
    L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 90 }).addTo(map);
    tileRef.current = L.tileLayer(DARK_BASE_TILES, {
      attribution: BASEMAP_ATTRIBUTION,
      maxZoom: 16,
      maxNativeZoom: 16,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", () => selectRef.current(null));

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);
    window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
    };
  }, []);


  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const ordered = [...events].sort((a, b) => severityRank(b) - severityRank(a));
    const selectedEvent = selectedId
      ? ordered.find((event) => event.id === selectedId)
      : undefined;
    const plotted = (
      selectedEvent ? [selectedEvent, ...ordered.filter((e) => e.id !== selectedId)] : ordered
    ).slice(0, MAX_MARKERS);
    setRendered(plotted.length);

    const drawOrder = [
      ...plotted.filter((event) => event.id !== selectedId),
      ...plotted.filter((event) => event.id === selectedId),
    ];
    drawOrder.forEach((event) => {
      const definition = HAZARD_MAP[event.hazard];
      const selected = event.id === selectedId;
      const active = event.active;

      // Thin outer ring encodes disaster state; marker fill encodes hazard type.
      L.circleMarker([event.lat, event.lon], {
        radius: markerRadius(event) + (active ? 3.6 : 2.6),
        color: SEVERITY[event.severity].color,
        weight: active ? 1.6 : 1.1,
        opacity: active ? 0.95 : 0.7,
        fillOpacity: 0,
        dashArray: active ? "2 3" : undefined,
        interactive: false,
      }).addTo(layer);

      const marker = L.circleMarker([event.lat, event.lon], {
        radius: markerRadius(event) + (selected ? 3 : 0),
        fillColor: definition.color,
        color: selected ? "#ffffff" : "#101615",
        weight: selected ? 2.6 : 1,
        opacity: 1,
        fillOpacity: selected ? 1 : active ? 0.94 : 0.82,
        bubblingMouseEvents: false,
      });

      marker.on("click", (domEvent) => {
        L.DomEvent.stopPropagation(domEvent);
        selectRef.current(event);
      });

      marker.bindTooltip(
        `<span style="color:${definition.color};font-weight:600;">${escapeHtml(definition.label)}</span> · ${escapeHtml(event.location)}`,
        {
          direction: "top",
          offset: [0, -3],
          opacity: 1,
          className: "disaster-tooltip",
        },
      );
      marker.bindPopup(popupHtml(event, selectedMix), {
        maxWidth: 290,
        minWidth: 230,
        closeButton: true,
        autoPanPadding: [28, 28],
        className: "disaster-popup",
      });
      marker.addTo(layer);
      if (selected) {
        marker.openPopup();
      }
    });
  }, [events, selectedId, selectedMix]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    window.setTimeout(() => map.invalidateSize(), 60);
  }, [className]);

  const resetView = () => {
    mapRef.current?.flyTo([18, 8], 2, { duration: 0.55 });
  };

  const fitResults = () => {
    const map = mapRef.current;
    if (!map || events.length === 0) return;
    const bounds = L.latLngBounds(events.map((event) => [event.lat, event.lon]));
    map.fitBounds(bounds.pad(0.16), { maxZoom: 5, animate: true, duration: 0.5 });
  };

  return (
    <div className={className}>
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />

      <div className="absolute right-3 top-[82px] z-[500] flex flex-col overflow-hidden rounded-lg border border-[#313a38] bg-[#0c100f]/95 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur">
        <button
          type="button"
          onClick={fitResults}
          title="Fit map to filtered events"
          aria-label="Fit map to filtered events"
          className="flex h-8 w-8 items-center justify-center text-[#a8b3ae] transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <LocateFixed size={13} strokeWidth={1.7} />
        </button>
      </div>

      <button
        type="button"
        onClick={resetView}
        className="absolute bottom-6 right-3 z-[500] rounded-md border border-[#313a38] bg-[#0c100f]/92 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#a8b3ae] backdrop-blur transition-colors hover:text-white"
      >
        World view
      </button>

      {events.length > MAX_MARKERS && (
        <div className="pointer-events-none absolute bottom-6 left-3 z-[500] max-w-[220px] rounded-md border border-[#313a38] bg-[#0c100f]/92 px-2 py-1 font-mono text-[8px] leading-relaxed tracking-[0.04em] text-[#93a09a] backdrop-blur">
          {rendered.toLocaleString()} of {events.length.toLocaleString()} plotted · highest
          severity prioritised
        </div>
      )}
    </div>
  );
}
