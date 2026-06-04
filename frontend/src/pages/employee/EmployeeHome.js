import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { getCurrentPosition, getDeviceInfo } from "@/hooks/useLocationTracker";
import { fmtTime, fmtDuration, fmtDate } from "@/lib/format";
import { Equalizer } from "@/components/Brand";
import { toast } from "sonner";
import { LogIn, LogOut, Clock, CalendarDays, Loader2, Repeat } from "lucide-react";

export default function EmployeeHome() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const load = async () => {
    const [t, h] = await Promise.all([api.get("/attendance/today"), api.get("/attendance/history")]);
    setToday(t.data);
    setHistory(h.data);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (today?.active && today?.current_check_in) {
      const tick = () => setElapsed(Math.floor((Date.now() - new Date(today.current_check_in).getTime()) / 1000));
      tick();
      const i = setInterval(tick, 1000);
      return () => clearInterval(i);
    }
    setElapsed(0);
  }, [today]);

  const doAction = async (type) => {
    setBusy(true);
    try {
      const pos = (await getCurrentPosition()) || {};
      const device = await getDeviceInfo();
      await api.post(`/attendance/${type}`, { ...pos, device });
      toast.success(type === "checkin" ? "Checked in — session started" : "Checked out. Session saved!");
      await load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const active = today?.active;
  const totalToday = (today?.completed_seconds_today || 0) + (active ? elapsed : 0);
  const sessions = today?.sessions_today || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="employee-home">
      <div className="surface rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <p className="overline text-white/40 relative">Today · {fmtDate(new Date().toISOString())}</p>

        <div className="relative flex flex-col items-center text-center mt-6">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => doAction(active ? "checkout" : "checkin")}
            disabled={busy}
            data-testid={active ? "checkout-button" : "checkin-button"}
            className={`relative h-44 w-44 rounded-full grid place-items-center font-heading font-bold text-lg transition-colors ${
              active ? "bg-[#FF3B30] text-white audio-pulse" : "bg-[#D4AF37] text-black audio-pulse"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : active ? (
                <><LogOut className="h-7 w-7" /> Check Out</>
              ) : (
                <><LogIn className="h-7 w-7" /> Check In</>
              )}
            </div>
          </motion.button>

          <div className="mt-6" data-testid="attendance-status">
            {active ? (
              <div className="flex items-center gap-3">
                <Equalizer />
                <span className="font-mono text-3xl font-bold text-[#D4AF37]" data-testid="live-timer">
                  {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
                  {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:
                  {String(elapsed % 60).padStart(2, "0")}
                </span>
              </div>
            ) : sessions > 0 ? (
              <p className="text-white/50">Last checkout {fmtTime(today.last_check_out)} · tap to check in again</p>
            ) : (
              <p className="text-white/40">Tap to start your shift</p>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-3 mt-7">
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <p className="text-[11px] text-white/40 flex items-center gap-1"><Repeat className="h-3 w-3" /> Sessions Today</p>
            <p className="font-mono text-lg font-semibold mt-1" data-testid="sessions-today">{sessions}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <p className="text-[11px] text-white/40 flex items-center gap-1"><Clock className="h-3 w-3" /> Worked Today</p>
            <p className="font-mono text-lg font-semibold mt-1" data-testid="worked-today">{fmtDuration(totalToday)}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-bold mb-3 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#D4AF37]" /> Attendance History
        </h3>
        <div className="space-y-2" data-testid="attendance-history">
          {history.length === 0 && (
            <p className="text-sm text-white/40 py-6 text-center surface rounded-xl">No records yet.</p>
          )}
          {history.map((r, i) => (
            <div key={i} className="flex items-center justify-between surface rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium">{fmtDate(r.date)}</p>
                <p className="text-xs text-white/40 font-mono">
                  {fmtTime(r.check_in)} → {r.check_out ? fmtTime(r.check_out) : "active"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-mono text-[#D4AF37]">
                <Clock className="h-3.5 w-3.5" /> {r.check_out ? fmtDuration(r.worked_seconds) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
