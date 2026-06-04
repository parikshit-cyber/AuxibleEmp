import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { getCurrentPosition } from "@/hooks/useLocationTracker";
import { fmtTime, fmtDate } from "@/lib/format";
import { UPDATE_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, MapPin, ClipboardList, Trash2 } from "lucide-react";

export default function EmployeeUpdates() {
  const [form, setForm] = useState({ project_name: "", status: "working", note: "", client_name: "", site_details: "" });
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/updates").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.project_name || !form.note) return toast.error("Project name and note are required");
    setBusy(true);
    try {
      const pos = (await getCurrentPosition()) || {};
      await api.post("/updates", { ...form, lat: pos.lat, lng: pos.lng });
      toast.success("Update submitted");
      setForm({ project_name: "", status: "working", note: "", client_name: "", site_details: "" });
      await load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/updates/${id}`);
      toast.success("Update deleted");
      load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="employee-updates">
      <form onSubmit={submit} className="surface rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#D4AF37]" />
          <h3 className="font-heading text-lg font-bold">Log On-Duty Work</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/70">Project / Task *</Label>
            <Input data-testid="update-project-input" value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="e.g. Club Mirage subwoofer wiring" className="bg-[#0A0A0A] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70">Status *</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="update-status-select" className="bg-[#0A0A0A] border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="visiting">Site Visit</SelectItem>
                <SelectItem value="break">On Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/70">Client / Venue</Label>
            <Input data-testid="update-client-input" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Venue or client" className="bg-[#0A0A0A] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70">Site Details</Label>
            <Input data-testid="update-site-input" value={form.site_details} onChange={(e) => set("site_details", e.target.value)} placeholder="Area / floor" className="bg-[#0A0A0A] border-white/10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70">Work Note *</Label>
          <Textarea data-testid="update-note-input" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Describe what you're working on / visiting..." rows={3} className="bg-[#0A0A0A] border-white/10" />
        </div>

        <Button type="submit" disabled={busy} data-testid="submit-update-button" className="w-full bg-[#D4AF37] hover:bg-[#F0C74A] text-black font-semibold h-11">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit Update (with location)</>}
        </Button>
      </form>

      <div>
        <h3 className="font-heading text-lg font-bold mb-3">My Updates</h3>
        <div className="space-y-3" data-testid="my-updates-list">
          {list.length === 0 && (
            <p className="text-sm text-white/40 py-6 text-center surface rounded-xl">No updates yet.</p>
          )}
          {list.map((u) => (
            <div key={u.id} className="surface rounded-xl p-4" data-testid="my-update-item">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{u.project_name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${UPDATE_STATUS[u.status]?.cls}`}>
                    {UPDATE_STATUS[u.status]?.label || u.status}
                  </span>
                  <button onClick={() => del(u.id)} data-testid={`delete-update-${u.id}`} className="text-white/30 hover:text-[#FF3B30] transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/50 mt-1.5">{u.note}</p>
              {(u.client_name || u.site_details) && (
                <p className="text-xs text-white/40 mt-1.5">
                  {u.client_name && <span className="font-medium">{u.client_name}</span>}
                  {u.client_name && u.site_details && " · "}{u.site_details}
                </p>
              )}
              <div className="flex items-center justify-between mt-2 text-[11px] text-white/35">
                <span>{fmtDate(u.timestamp)} · {fmtTime(u.timestamp)}</span>
                {u.lat && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location tagged</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
