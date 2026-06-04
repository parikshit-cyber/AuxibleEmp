import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { fmtTime, timeAgo, isStale } from "@/lib/format";
import MapView from "@/pages/admin/MapView";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BatteryFull, BatteryLow, BatteryCharging, Signal, MapPin, Navigation, Smartphone, Monitor, AlertTriangle, Phone, ShieldCheck, Radar,
} from "lucide-react";

function Battery({ level, charging }) {
  if (level == null) return <span className="text-white/30">N/A</span>;
  const low = level <= 20;
  const Icon = charging ? BatteryCharging : low ? BatteryLow : BatteryFull;
  return (
    <span className={`flex items-center gap-1 font-medium ${low ? "text-[#FF3B30]" : "text-white/80"}`}>
      <Icon className="h-4 w-4" /> {level}%
    </span>
  );
}

export default function LiveMonitor() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [deviceDialog, setDeviceDialog] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/live").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  const submitFlag = async () => {
    if (!msg.trim()) return toast.error("Enter a message");
    setBusy(true);
    try {
      await api.post(`/admin/flag/${dialog.user.id}`, { flag_type: dialog.type, message: msg });
      toast.success("Warning pushed to employee");
      setDialog(null); setMsg(""); load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const clearFlag = async (id) => { await api.post(`/admin/unflag/${id}`); toast.success("Flag cleared"); load(); };

  const statusPill = (it) => {
    if (it.user.flagged) return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30">FLAGGED</span>;
    if (it.status === "checked_in") return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1 w-fit"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ON DUTY</span>;
    if (it.status === "checked_out") return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/60">CHECKED OUT</span>;
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-white/40">OFFLINE</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="live-monitor">
      <div>
        <p className="overline text-[#D4AF37]">Real-time Operations</p>
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <Radar className="h-7 w-7 text-[#D4AF37]" /> Live Monitor
        </h1>
      </div>

      <MapView items={items} />

      <div className="surface rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-heading font-bold">Field Employees</h3>
          <span className="text-xs text-white/40">Auto-refresh · 15s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="live-employee-table">
            <thead>
              <tr className="text-left overline text-white/40 border-b border-white/10">
                <th className="px-5 py-3">Employee</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Check In</th>
                <th className="px-3 py-3">Battery</th>
                <th className="px-3 py-3">Network</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-white/40">No employees yet. Add them in the Employees tab.</td></tr>
              )}
              {items.map((it) => (
                <tr key={it.user.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors" data-testid={`employee-row-${it.user.id}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold ${it.user.flagged ? "bg-[#FF3B30] text-white" : "bg-[#D4AF37] text-black"}`}>
                        {(it.user.name || "?").slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-medium">{it.user.name}</p>
                        <p className="text-[11px] text-white/40">{it.user.designation || it.user.employee_code || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{statusPill(it)}</td>
                  <td className="px-3 py-3 font-mono text-white/80">{fmtTime(it.attendance?.check_in)}</td>
                  <td className="px-3 py-3"><Battery level={it.live?.battery_level} charging={it.live?.battery_charging} /></td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1 text-white/70">
                      <Signal className="h-3.5 w-3.5" />{it.live?.network_effective || it.live?.network_type || "N/A"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {(it.live?.device || it.attendance?.check_in_device) ? (
                      <button onClick={() => setDeviceDialog(it)} data-testid={`device-info-${it.user.id}`} className="flex items-center gap-1.5 text-white/70 hover:text-[#D4AF37] transition-colors text-left">
                        {((it.live?.device || it.attendance?.check_in_device)?.device_type) === "Desktop"
                          ? <Monitor className="h-3.5 w-3.5 shrink-0" /> : <Smartphone className="h-3.5 w-3.5 shrink-0" />}
                        <span className="max-w-[150px] truncate">
                          {(it.live?.device || it.attendance?.check_in_device)?.device_name || "Device"}
                        </span>
                      </button>
                    ) : <span className="text-white/30">N/A</span>}
                  </td>
                  <td className="px-3 py-3">
                    {it.live?.lat ? (
                      <div className="flex items-center gap-3">
                        <a href={`https://maps.google.com/maps?q=${it.live.lat},${it.live.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/70 hover:text-white" data-testid={`map-link-${it.user.id}`} title="View on map">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className={isStale(it.live.timestamp) ? "text-amber-400" : ""}>{timeAgo(it.live.timestamp)}</span>
                        </a>
                        <a href={`https://maps.google.com/maps?daddr=${it.live.lat},${it.live.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#D4AF37] hover:text-[#F0C74A] font-medium" data-testid={`directions-${it.user.id}`} title="Get directions">
                          <Navigation className="h-3.5 w-3.5" /> Directions
                        </a>
                      </div>
                    ) : (
                      <span className="text-white/30">No GPS</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {it.user.flagged ? (
                        <Button size="sm" variant="outline" onClick={() => clearFlag(it.user.id)} data-testid={`clear-flag-${it.user.id}`} className="h-8 text-emerald-300 border-emerald-500/30 bg-transparent hover:bg-emerald-500/10">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Clear
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setDialog({ user: it.user, type: "contact" }); setMsg(""); }} data-testid={`contact-${it.user.id}`} className="h-8 text-amber-300 border-amber-500/30 bg-transparent hover:bg-amber-500/10">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setDialog({ user: it.user, type: "red" }); setMsg(""); }} data-testid={`mark-red-${it.user.id}`} className="h-8 text-[#FF3B30] border-[#FF3B30]/30 bg-transparent hover:bg-[#FF3B30]/10">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Mark Red
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="bg-[#121212] border-white/10 text-white" data-testid="flag-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog?.type === "red"
                ? <><AlertTriangle className="h-5 w-5 text-[#FF3B30]" /> Mark Red — {dialog?.user.name}</>
                : <><Phone className="h-5 w-5 text-amber-400" /> Contact Owner — {dialog?.user.name}</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/50">
              {dialog?.type === "red"
                ? "Flag this employee for suspicious activity. They receive an immediate in-app alert."
                : "Send an urgent message asking the employee to contact you."}
            </p>
            <div className="space-y-1.5">
              <Label className="text-white/70">Message to employee</Label>
              <Textarea data-testid="flag-message-input" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="bg-[#0A0A0A] border-white/10"
                placeholder={dialog?.type === "red" ? "e.g. Your location doesn't match the assigned site." : "e.g. Please call the owner immediately."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} className="bg-transparent border-white/15 hover:bg-white/5">Cancel</Button>
            <Button onClick={submitFlag} disabled={busy} data-testid="confirm-flag-button" className={dialog?.type === "red" ? "bg-[#FF3B30] hover:bg-[#ff5a52] text-white" : "bg-amber-500 hover:bg-amber-400 text-black"}>
              Send Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deviceDialog} onOpenChange={(o) => !o && setDeviceDialog(null)}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-lg" data-testid="device-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#D4AF37]" /> Device Details — {deviceDialog?.user.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto">
            <DeviceBlock title="Current Live Device" d={deviceDialog?.live?.device} />
            <DeviceBlock title="Device used at Check-in" d={deviceDialog?.attendance?.check_in_device} />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function DeviceBlock({ title, d }) {
  const rows = [
    ["Device Name", d?.device_name],
    ["Type", d?.device_type],
    ["Operating System", d?.os],
    ["Browser", d?.browser],
    ["Platform", d?.platform],
    ["Screen", d?.screen],
    ["Vendor", d?.vendor],
    ["Language", d?.language],
  ];
  return (
    <div className="surface rounded-xl p-4">
      <p className="overline text-[#D4AF37] mb-3">{title}</p>
      {!d ? (
        <p className="text-sm text-white/40">No data captured.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 text-sm">
              <span className="text-white/40">{k}</span>
              <span className="font-medium text-right break-all">{v || "—"}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/5">
            <p className="text-white/40 text-[11px] mb-1">User Agent</p>
            <p className="text-[11px] text-white/55 break-all font-mono">{d.user_agent || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
