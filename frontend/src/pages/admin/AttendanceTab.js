import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { fmtTime, fmtDate, fmtDuration } from "@/lib/format";
import { CalendarCheck, MapPin, Smartphone } from "lucide-react";

export default function AttendanceTab() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/attendance").then((r) => setRows(r.data)).catch(() => {}); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="attendance-page">
      <div>
        <p className="overline text-[#D4AF37]">Records</p>
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <CalendarCheck className="h-7 w-7 text-[#D4AF37]" /> Attendance
        </h1>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="attendance-table">
            <thead>
              <tr className="text-left overline text-white/40 border-b border-white/10">
                <th className="px-5 py-3">Employee</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Check In</th>
                <th className="px-3 py-3">Check Out</th><th className="px-3 py-3">Worked</th><th className="px-3 py-3">Device</th><th className="px-3 py-3">In Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-white/40">No attendance records yet.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 font-medium">{r.name}{r.employee_code && <span className="text-[11px] text-white/40 ml-1">· {r.employee_code}</span>}</td>
                  <td className="px-3 py-3">{fmtDate(r.date)}</td>
                  <td className="px-3 py-3 font-mono text-emerald-300">{fmtTime(r.check_in)}</td>
                  <td className="px-3 py-3 font-mono text-[#FF3B30]">{fmtTime(r.check_out)}</td>
                  <td className="px-3 py-3 font-mono">{r.check_out ? fmtDuration(r.worked_seconds) : "In progress"}</td>
                  <td className="px-3 py-3">
                    {r.check_in_device ? (
                      <span className="flex items-center gap-1.5 text-white/70" title={r.check_in_device.user_agent || ""}>
                        <Smartphone className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[150px] truncate">{[r.check_in_device.device_name, r.check_in_device.os].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") || r.check_in_device.device_type}</span>
                      </span>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.check_in_location?.lat ? (
                      <a href={`https://maps.google.com/maps?q=${r.check_in_location.lat},${r.check_in_location.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#D4AF37] hover:underline">
                        <MapPin className="h-3.5 w-3.5" /> Map
                      </a>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
