import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Loader2, Power, FileDown } from "lucide-react";

const EMPTY = { name: "", email: "", password: "", phone: "", designation: "", employee_code: "" };

export default function Employees() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(null);

  const load = () => api.get("/users").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("Name, email and password are required");
    setBusy(true);
    try {
      await api.post("/users", form);
      toast.success("Employee created");
      setOpen(false); setForm(EMPTY); load();
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const toggleActive = async (u) => { await api.patch(`/users/${u.id}`, { active: !u.active }); load(); };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    await api.delete(`/users/${u.id}`); toast.success("Employee removed"); load();
  };

  const exportPdf = async (u) => {
    setExporting(u.id);
    try {
      const res = await api.get(`/users/${u.id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(u.name || "employee").replace(/ /g, "_")}_report.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF exported");
    } catch {
      toast.error("Export failed");
    } finally { setExporting(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="employees-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="overline text-[#D4AF37]">Workforce</p>
          <h1 className="font-heading text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-[#D4AF37]" /> Employees
          </h1>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }} data-testid="add-employee-button" className="bg-[#D4AF37] hover:bg-[#F0C74A] text-black font-semibold">
          <Plus className="h-4 w-4 mr-1" /> Add Employee
        </Button>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="employees-table">
            <thead>
              <tr className="text-left overline text-white/40 border-b border-white/10">
                <th className="px-5 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Phone</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-white/40">No employees yet.</td></tr>}
              {list.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3 text-white/50">{u.email}</td>
                  <td className="px-3 py-3 font-mono">{u.employee_code || "—"}</td>
                  <td className="px-3 py-3">{u.phone || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                      {u.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8 text-[#D4AF37] border-[#D4AF37]/30 bg-transparent hover:bg-[#D4AF37]/10" onClick={() => exportPdf(u)} data-testid={`export-${u.id}`}>
                        {exporting === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><FileDown className="h-3.5 w-3.5 mr-1" /> PDF</>}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 bg-transparent border-white/15 hover:bg-white/5" onClick={() => toggleActive(u)} data-testid={`toggle-${u.id}`}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-[#FF3B30] border-[#FF3B30]/30 bg-transparent hover:bg-[#FF3B30]/10" onClick={() => remove(u)} data-testid={`delete-${u.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white" data-testid="add-employee-dialog">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Full Name *"><Input value={form.name} data-testid="emp-name-input" onChange={(e) => set("name", e.target.value)} className="bg-[#0A0A0A] border-white/10" /></Field>
            <Field label="Employee Code"><Input value={form.employee_code} data-testid="emp-code-input" onChange={(e) => set("employee_code", e.target.value)} className="bg-[#0A0A0A] border-white/10" /></Field>
            <Field label="Email *" full><Input type="email" value={form.email} data-testid="emp-email-input" onChange={(e) => set("email", e.target.value)} className="bg-[#0A0A0A] border-white/10" /></Field>
            <Field label="Password *"><Input value={form.password} data-testid="emp-password-input" onChange={(e) => set("password", e.target.value)} className="bg-[#0A0A0A] border-white/10" /></Field>
            <Field label="Phone"><Input value={form.phone} data-testid="emp-phone-input" onChange={(e) => set("phone", e.target.value)} className="bg-[#0A0A0A] border-white/10" /></Field>
            <Field label="Designation" full><Input value={form.designation} data-testid="emp-designation-input" onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Senior Audio Engineer" className="bg-[#0A0A0A] border-white/10" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-white/15 hover:bg-white/5">Cancel</Button>
            <Button onClick={create} disabled={busy} data-testid="save-employee-button" className="bg-[#D4AF37] hover:bg-[#F0C74A] text-black font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-white/70">{label}</Label>
      {children}
    </div>
  );
}
