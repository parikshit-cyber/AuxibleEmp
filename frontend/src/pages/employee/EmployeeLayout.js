import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import { BrandMark } from "@/components/Brand";
import api from "@/lib/api";
import { Home, ClipboardList, Bell, LogOut, Satellite, AlertTriangle } from "lucide-react";

const tabs = [
  { to: "/app", icon: Home, label: "Home", end: true, testid: "emp-nav-home" },
  { to: "/app/updates", icon: ClipboardList, label: "Updates", testid: "emp-nav-updates" },
  { to: "/app/alerts", icon: Bell, label: "Alerts", testid: "emp-nav-alerts" },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const tracker = useLocationTracker(true);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    api.get("/notifications").then((r) => setUnread(r.data.filter((n) => !n.read).length)).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24 ambient" data-testid="employee-app">
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size="h-9 w-9" />
            <div>
              <p className="font-heading text-sm font-bold leading-none">{user?.name}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{user?.designation || "Field Employee"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                tracker.tracking ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}
              data-testid="gps-status-badge"
            >
              {tracker.tracking ? (
                <><Satellite className="h-3 w-3" /> <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> GPS Live</>
              ) : (
                <><AlertTriangle className="h-3 w-3" /> GPS Off</>
              )}
            </span>
            <button onClick={logout} data-testid="emp-logout-button" className="text-white/40 hover:text-[#FF3B30] transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative">
        <Outlet context={{ tracker }} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-white/10">
        <div className="max-w-2xl mx-auto grid grid-cols-3">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              data-testid={t.testid}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                  isActive ? "text-[#D4AF37]" : "text-white/35 hover:text-white/70"
                }`
              }
            >
              <t.icon className="h-5 w-5" />
              {t.label}
              {t.label === "Alerts" && unread > 0 && (
                <span className="absolute top-1.5 right-1/4 h-4 min-w-4 px-1 rounded-full bg-[#FF3B30] text-white text-[10px] grid place-items-center">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
