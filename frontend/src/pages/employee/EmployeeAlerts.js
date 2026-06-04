import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { AlertTriangle, Phone, Bell, CheckCircle2 } from "lucide-react";

export default function EmployeeAlerts() {
  const [list, setList] = useState([]);
  const load = () => api.get("/notifications").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => { await api.post(`/notifications/${id}/read`); load(); };

  const meta = (type) =>
    type === "red"
      ? { icon: AlertTriangle, cls: "border-[#FF3B30]/30 bg-[#FF3B30]/10", iconCls: "text-[#FF3B30]" }
      : type === "contact"
      ? { icon: Phone, cls: "border-amber-500/30 bg-amber-500/10", iconCls: "text-amber-400" }
      : { icon: Bell, cls: "border-white/10 surface", iconCls: "text-[#D4AF37]" };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" data-testid="employee-alerts">
      <h3 className="font-heading text-lg font-bold flex items-center gap-2">
        <Bell className="h-5 w-5 text-[#D4AF37]" /> Owner Alerts
      </h3>
      {list.length === 0 && (
        <div className="text-center py-12 surface rounded-xl">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-white/40">No alerts. You're all clear!</p>
        </div>
      )}
      {list.map((n) => {
        const m = meta(n.type);
        return (
          <div key={n.id} className={`rounded-xl border p-4 ${m.cls} ${n.read ? "opacity-50" : ""}`} data-testid="alert-item">
            <div className="flex items-start gap-3">
              <m.icon className={`h-5 w-5 mt-0.5 ${m.iconCls}`} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-sm text-white/70 mt-1">{n.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-white/35">{timeAgo(n.created_at)}</span>
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} data-testid="mark-read-button" className="text-[11px] font-medium text-[#D4AF37] hover:underline">
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
