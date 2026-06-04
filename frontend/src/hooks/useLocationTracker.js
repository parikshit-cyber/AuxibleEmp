import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

function detectOS(ua, platform, osVer) {
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android\s([\d.]+)/);
    return `Android ${m ? m[1] : (osVer || "")}`.trim();
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS\s([\d_]+)/);
    return `iOS ${m ? m[1].replace(/_/g, ".") : ""}`.trim();
  }
  if (/Windows/i.test(ua)) return osVer ? `Windows ${osVer}` : "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return platform || "Unknown OS";
}

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return `Chrome ${(ua.match(/Chrome\/(\d+)/) || [])[1] || ""}`.trim();
  if (/Firefox\//.test(ua)) return `Firefox ${(ua.match(/Firefox\/(\d+)/) || [])[1] || ""}`.trim();
  if (/Safari\//.test(ua)) return "Safari";
  return "Unknown browser";
}

function guessModel(ua) {
  // Android UA often: "... ; SM-G991B Build/..."
  const m = ua.match(/;\s?([A-Za-z0-9 _-]+)\sBuild\//);
  if (m) return m[1].trim();
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  return null;
}

export async function getDeviceInfo() {
  const ua = navigator.userAgent;
  let model = null;
  let platform = navigator.platform || "";
  let osVer = null;
  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      const hi = await navigator.userAgentData.getHighEntropyValues(["model", "platform", "platformVersion"]);
      model = hi.model || null;
      platform = hi.platform || platform;
      osVer = hi.platformVersion || null;
    }
  } catch {
    /* ignore */
  }
  const device_type = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobi|Android|iPhone/i.test(ua)
    ? "Mobile"
    : "Desktop";
  return {
    device_name: model || guessModel(ua) || platform || "Unknown device",
    device_type,
    os: detectOS(ua, platform, osVer),
    browser: detectBrowser(ua),
    platform,
    vendor: navigator.vendor || "",
    language: navigator.language || "",
    screen: `${window.screen.width}x${window.screen.height}`,
    user_agent: ua,
  };
}

// Collects GPS + battery + network + device telemetry and pings periodically.
export function useLocationTracker(enabled) {
  const lastPos = useRef(null);
  const deviceRef = useRef(null);
  const [state, setState] = useState({ tracking: false, error: null, last: null });

  useEffect(() => {
    if (!enabled) return;
    let watchId = null;
    let interval = null;
    let cancelled = false;

    getDeviceInfo().then((d) => { deviceRef.current = d; });

    async function getTelemetry() {
      let battery_level = null;
      let battery_charging = null;
      try {
        if (navigator.getBattery) {
          const b = await navigator.getBattery();
          battery_level = Math.round(b.level * 100);
          battery_charging = b.charging;
        }
      } catch {
        /* ignore */
      }
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        battery_level,
        battery_charging,
        network_type: conn?.type || (navigator.onLine ? "online" : "offline"),
        network_effective: conn?.effectiveType || null,
      };
    }

    async function sendPing() {
      if (!lastPos.current) return;
      const tele = await getTelemetry();
      try {
        await api.post("/location/ping", { ...lastPos.current, ...tele, device: deviceRef.current });
        if (!cancelled) setState((s) => ({ ...s, last: new Date().toISOString(), error: null }));
      } catch {
        /* ignore */
      }
    }

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          lastPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setState((s) => ({ ...s, tracking: true, error: null }));
        },
        (err) => setState((s) => ({ ...s, error: err.message })),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
      interval = setInterval(sendPing, 30000);
      setTimeout(sendPing, 4000);
    } else {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
    }

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  return state;
}

export async function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: "" }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}
