import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
} from "recharts";
import { BarChart3, Users, UserCheck, Activity, AlertTriangle, ClipboardList, Clock } from "lucide-react";

const GOLD = "#D4AF37";
const PIE_COLORS = ["#10b981", "#3b82f6", "#D4AF37", "#FF3B30", "#a855f7"];
const STATUS_LABEL = { working: "Working", visiting: "Site Visit", break: "On Break" };

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then((r) => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className="text-white/40 py-20 text-center">Loading analytics…</div>;

  const kpis = [
    { label: "Total Employees", value: data.total_employees, icon: Users, color: GOLD },
    { label: "Active", value: data.active_employees, icon: UserCheck, color: "#10b981" },
    { label: "On Duty Today", value: data.active_today, icon: Activity, color: "#3b82f6" },
    { label: "Flagged", value: data.flagged, icon: AlertTriangle, color: "#FF3B30" },
    { label: "Total Updates", value: data.total_updates, icon: ClipboardList, color: GOLD },
    { label: "Total Hours", value: `${data.total_hours}h`, icon: Clock, color: "#10b981" },
  ];

  const statusData = data.updates_by_status.map((d) => ({ name: STATUS_LABEL[d.name] || d.name, value: d.value }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="analytics-page">
      <div>
        <p className="overline text-[#D4AF37]">Insights</p>
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-[#D4AF37]" /> Analytics
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="surface rounded-2xl p-5" data-testid={`kpi-${k.label.toLowerCase().replace(/ /g, "-")}`}>
            <k.icon className="h-5 w-5 mb-3" style={{ color: k.color }} />
            <p className="font-heading text-3xl font-extrabold">{k.value}</p>
            <p className="text-[11px] text-white/40 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface rounded-2xl p-6">
          <h3 className="font-heading font-bold mb-4">Updates by Status</h3>
          {statusData.length === 0 ? (
            <p className="text-white/30 text-sm py-16 text-center">No update data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} label={(e) => e.name}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#0A0A0A" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface rounded-2xl p-6">
          <h3 className="font-heading font-bold mb-4">Field Updates · Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.updates_last_7_days}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "#888", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }} />
              <Area type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
