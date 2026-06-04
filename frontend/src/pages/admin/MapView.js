import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function pinIcon(color, label) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative">
      <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #0a0a0a;box-shadow:0 0 12px ${color}99"></div>
      <div style="position:absolute;top:6px;left:0;width:30px;text-align:center;color:#0a0a0a;font-size:11px;font-weight:800;font-family:'Outfit'">${label}</div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

export default function MapView({ items }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const containerRef = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    [200, 500, 1000, 1600].forEach((ms) => setTimeout(() => map.invalidateSize(), ms));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    roRef.current = ro;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts = [];
    items.forEach((it) => {
      const live = it.live;
      if (!live?.lat || !live?.lng) return;
      const flagged = it.user.flagged;
      const color = flagged ? "#FF3B30" : it.status === "checked_in" ? "#10b981" : "#D4AF37";
      const initials = (it.user.name || "?").slice(0, 1).toUpperCase();
      const marker = L.marker([live.lat, live.lng], { icon: pinIcon(color, initials) });
      marker.bindPopup(
        `<b style="color:#D4AF37">${it.user.name}</b><br/>${it.user.designation || "Technician"}<br/>
         Battery: ${live.battery_level ?? "N/A"}% · ${live.network_effective || live.network_type || "N/A"}<br/>
         <span style="color:${color}">${flagged ? "⚠ FLAGGED" : it.status.replace("_", " ")}</span>`
      );
      marker.addTo(layer);
      pts.push([live.lat, live.lng]);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 14 });
  }, [items]);

  return (
    <div
      ref={containerRef}
      data-testid="live-map"
      className="w-full h-[360px] rounded-2xl border border-white/10 overflow-hidden z-0"
    />
  );
}
