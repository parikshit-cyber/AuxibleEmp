import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { fmtTime, fmtDate, timeAgo } from "@/lib/format";
import { UPDATE_STATUS } from "@/lib/constants";
import { toast } from "sonner";
import { ClipboardList, MapPin, User, Trash2 } from "lucide-react";

export default function UpdatesFeed() {
  const [list, setList] = useState([]);

  const load = () => api.get("/admin/updates").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, []);

  const del = async (id) => {
    if (!window.confirm("Delete this update?")) return;
    try {
      await api.delete(`/updates/${id}`);
      toast.success("Update deleted");
      load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="updates-feed">
      <div>
        <p className="overline text-[#D4AF37]">Field Reports</p>
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-[#D4AF37]" /> Updates Feed
        </h1>
      </div>

      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-white/40 py-10 text-center surface rounded-2xl">No updates submitted yet.</p>}
        {list.map((u) => (
          <div key={u.id} className="surface rounded-2xl p-5 hover:bg-white/[0.02] transition-colors" data-testid="feed-item">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#D4AF37] text-black grid place-items-center text-xs font-bold">
                  {(u.name || "?").slice(0, 1)}
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-white/40" /> {u.name}
                    {u.employee_code && <span className="text-[11px] text-white/40 font-normal">· {u.employee_code}</span>}
                  </p>
                  <p className="text-[11px] text-white/40">{fmtDate(u.timestamp)} · {fmtTime(u.timestamp)} · {timeAgo(u.timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${UPDATE_STATUS[u.status]?.cls}`}>
                  {UPDATE_STATUS[u.status]?.label || u.status}
                </span>
                <button onClick={() => del(u.id)} data-testid={`delete-feed-${u.id}`} className="text-white/30 hover:text-[#FF3B30] transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 pl-12">
              <p className="font-medium text-sm">{u.project_name}</p>
              <p className="text-sm text-white/55 mt-1">{u.note}</p>
              {(u.client_name || u.site_details) && (
                <p className="text-xs text-white/40 mt-1.5">
                  {u.client_name && <span className="font-medium">Client: {u.client_name}</span>}
                  {u.client_name && u.site_details && " · "}{u.site_details && `Site: ${u.site_details}`}
                </p>
              )}
              {u.lat && (
                <a href={`https://maps.google.com/maps?q=${u.lat},${u.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#D4AF37] hover:underline mt-2">
                  <MapPin className="h-3 w-3" /> View location on map
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
