import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "@/components/Brand";
import api from "@/lib/api";
import { Radar, BarChart3, Users, ClipboardList, CalendarCheck, LogOut, Menu, X } from "lucide-react";

const nav = [
  { to: "/admin", icon: Radar, label: "Live Monitor", end: true, testid: "admin-nav-live" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", testid: "admin-nav-analytics" },
  { to: "/admin/employees", icon: Users, label: "Employees", testid: "admin-nav-employees" },
  { to: "/admin/updates", icon: ClipboardList, label: "Updates Feed", testid: "admin-nav-updates" },
  { to: "/admin/attendance", icon: CalendarCheck, label: "Attendance", testid: "admin-nav-attendance" },
];

const ROLE_LABEL = { owner: "Owner", hr: "HR", admin: "Admin" };

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = () => api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex" data-testid="admin-dashboard">
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-[#0d0d0d] border-r border-white/10 flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <BrandMark size="h-9 w-9" />
          <div>
            <p className="font-heading text-sm font-extrabold leading-none">AUXIBLE INDIA</p>
            <p className="text-[10px] text-white/40 tracking-[0.22em] uppercase mt-1">Command Center</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#D4AF37] text-black" : "text-white/55 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-1 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-[11px] text-white/40">{user?.email}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#D4AF37]/15 text-[#D4AF37]" data-testid="role-badge">
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </div>
          <button onClick={logout} data-testid="admin-logout-button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/55 hover:bg-[#FF3B30] hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 h-16 glass border-b border-white/10 flex items-center justify-between px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(!open)} data-testid="sidebar-toggle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden lg:block" />
          {stats && (
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
              <Stat label="Employees" value={stats.total_employees} />
              <Stat label="On Duty" value={stats.checked_in} color="text-emerald-400" />
              <Stat label="Flagged" value={stats.flagged} color="text-[#FF3B30]" />
              <Stat label="Updates" value={stats.updates_today} color="text-[#D4AF37]" />
            </div>
          )}
        </header>
        <main className="p-4 lg:p-8 ambient">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }) {
  return (
    <div className="text-right" data-testid={`stat-${label.toLowerCase()}`}>
      <span className={`font-heading font-extrabold text-lg ${color}`}>{value}</span>
      <span className="text-white/40 ml-1.5 hidden sm:inline">{label}</span>
    </div>
  );
}
