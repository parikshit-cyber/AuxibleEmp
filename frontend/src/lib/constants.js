export const VENUE_TYPES = ["Club", "Bar", "Restaurant", "Home Theatre", "Theatre"];

export const JOB_STATUSES = ["Scheduled", "On-site", "Installing", "Testing", "Completed"];

export const JOB_STATUS_STYLE = {
  Scheduled: "bg-zinc-700 text-zinc-100",
  "On-site": "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  Installing: "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30",
  Testing: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  Completed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

export const VENUE_ICON = {
  Club: "🎧",
  Bar: "🍸",
  Restaurant: "🍽️",
  "Home Theatre": "🏠",
  Theatre: "🎭",
};

export const UPDATE_STATUS = {
  visiting: { label: "Site Visit", cls: "bg-blue-500/15 text-blue-300 border border-blue-500/25" },
  working: { label: "Working", cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" },
  break: { label: "On Break", cls: "bg-amber-500/15 text-amber-300 border border-amber-500/25" },
};
