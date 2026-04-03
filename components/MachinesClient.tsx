"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Cpu,
  Wrench,
  Plus,
  Pencil,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Package,
  Zap,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MachineWithStatus } from "@/app/actions/machines";
import { createMachine, updateMachine, toggleMachineActive } from "@/app/actions/machines";

const MACHINE_TYPES = [
  "Printing Press",
  "Cutting Machine",
  "Folding Machine",
  "Stitching Machine",
  "Other",
];

const TYPE_FILTERS = [
  { value: "ALL",              label: "All Machines" },
  { value: "Printing Press",   label: "Printing Press" },
  { value: "Cutting Machine",  label: "Cutting" },
  { value: "Folding Machine",  label: "Folding" },
  { value: "Stitching Machine",label: "Stitching" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  "Printing Press":    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: "bg-blue-500" },
  "Cutting Machine":   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: "bg-red-500" },
  "Folding Machine":   { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200",icon: "bg-emerald-500" },
  "Stitching Machine": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: "bg-purple-500" },
  "Other":             { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",   icon: "bg-gray-500" },
};

function getTypeColor(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS["Other"];
}

// ── Elapsed time counter ─────────────────────────────────────────────────────
function ElapsedTime({ startedAt }: { startedAt: string }) {
  const calc = useCallback(() => {
    const diff = Date.now() - new Date(startedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [startedAt]);

  const [elapsed, setElapsed] = useState(calc);
  useEffect(() => {
    setElapsed(calc());
    const id = setInterval(() => setElapsed(calc()), 30000);
    return () => clearInterval(id);
  }, [calc]);

  return (
    <span className="font-mono text-[11px] font-bold text-orange-600 tabular-nums">
      {elapsed}
    </span>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
function getMachineStatus(m: MachineWithStatus): "INACTIVE" | "BUSY" | "IDLE" {
  if (!m.isActive) return "INACTIVE";
  if (m.currentJob) return "BUSY";
  return "IDLE";
}

const STATUS_CFG = {
  INACTIVE: {
    pill: "bg-gray-100 text-gray-500 border-gray-200",
    dot: "bg-gray-400",
    label: "Inactive",
    pulse: false,
  },
  BUSY: {
    pill: "bg-orange-100 text-orange-700 border-orange-300",
    dot: "bg-orange-500",
    label: "Busy",
    pulse: true,
  },
  IDLE: {
    pill: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    label: "Idle",
    pulse: false,
  },
};

// ── Machine Card ─────────────────────────────────────────────────────────────
function MachineCard({
  machine,
  isAdmin,
  maxToday,
  onEdit,
  onToggle,
}: {
  machine: MachineWithStatus;
  isAdmin: boolean;
  maxToday: number;
  onEdit: (m: MachineWithStatus) => void;
  onToggle: (m: MachineWithStatus) => void;
}) {
  const status = getMachineStatus(machine);
  const sCfg = STATUS_CFG[status];
  const tColor = getTypeColor(machine.type);
  const utilizationPct = maxToday > 0 ? Math.round((machine.todayCompletedCount / maxToday) * 100) : 0;

  return (
    <div
      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 flex flex-col group ${
        status === "INACTIVE"
          ? "opacity-50 border-gray-200 bg-gray-50"
          : status === "BUSY"
          ? "border-orange-300 bg-white shadow-lg shadow-orange-100"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300"
      }`}
    >
      {/* Busy scan line animation */}
      {status === "BUSY" && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-[slide_2s_linear_infinite]" />
      )}

      {/* Top bar */}
      <div className={`px-4 pt-4 pb-3 flex items-start justify-between gap-2 ${tColor.bg}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Machine type icon dot */}
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tColor.icon}`}>
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${tColor.text} opacity-70`}>
              {machine.type}
            </p>
            <h3 className="text-lg font-black text-gray-900 leading-tight truncate">
              {machine.name}
            </h3>
          </div>
        </div>

        {/* Status pill */}
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold flex-shrink-0 ${sCfg.pill}`}>
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sCfg.dot} ${sCfg.pulse ? "animate-pulse" : ""}`}
          />
          {sCfg.label}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {/* Current job */}
        {status === "BUSY" && machine.currentJob ? (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                  Running
                </span>
              </div>
              {machine.currentJob.startedAt && (
                <ElapsedTime startedAt={machine.currentJob.startedAt} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-[11px] font-mono font-bold text-primary">
                  {machine.currentJob.itemNumber}
                </span>
                <span className="text-[11px] text-gray-600 truncate">{machine.currentJob.itemName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-700 font-semibold">
                  {machine.currentJob.processName}
                </span>
              </div>
              {machine.currentJob.assignedToName && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600">
                    {machine.currentJob.assignedToName}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : status === "IDLE" ? (
          <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">Ready for next job</span>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 flex items-center gap-2">
            <PowerOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Machine offline</span>
          </div>
        )}

        {/* Today's utilization */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium">Today&apos;s output</span>
            </div>
            <span className="text-[10px] font-bold text-gray-700 tabular-nums">
              {machine.todayCompletedCount} job{machine.todayCompletedCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                utilizationPct > 70 ? "bg-green-500" :
                utilizationPct > 30 ? "bg-orange-400" :
                utilizationPct > 0  ? "bg-blue-400" : "bg-gray-200"
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>

        {/* Breakdown alert */}
        {machine.recentBreakdownCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-red-700">
              {machine.recentBreakdownCount} breakdown{machine.recentBreakdownCount > 1 ? "s" : ""} this month
            </span>
          </div>
        )}
      </div>

      {/* Department footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-medium truncate pr-2">
          {machine.department.name}
        </span>

        {/* Admin controls — visible on hover */}
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(machine)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Edit machine"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggle(machine)}
              className={`p-1.5 rounded-lg transition-colors ${
                machine.isActive
                  ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  : "text-gray-400 hover:text-green-600 hover:bg-green-50"
              }`}
              title={machine.isActive ? "Deactivate machine" : "Activate machine"}
            >
              {machine.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Machine Form Dialog ───────────────────────────────────────────────────────
function MachineFormDialog({
  open,
  onClose,
  machine,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  machine: MachineWithStatus | null;
  departments: { id: string; name: string }[];
}) {
  const isEdit = !!machine;
  const [name, setName] = useState(machine?.name ?? "");
  const [type, setType] = useState(machine?.type ?? MACHINE_TYPES[0]);
  const [departmentId, setDepartmentId] = useState(machine?.department.id ?? departments[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset form when dialog opens with new machine
  useEffect(() => {
    if (open) {
      setName(machine?.name ?? "");
      setType(machine?.type ?? MACHINE_TYPES[0]);
      setDepartmentId(machine?.department.id ?? departments[0]?.id ?? "");
      setError("");
    }
  }, [open, machine, departments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Machine name is required"); return; }
    setError("");
    startTransition(async () => {
      const result = isEdit
        ? await updateMachine(machine!.id, { name, type, departmentId })
        : await createMachine({ name, type, departmentId });
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            {isEdit ? "Edit Machine" : "Add Machine"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Machine Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="e.g. R7, MB05"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Machine Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {MACHINE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Machine"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────
export function MachinesClient({
  machines: initialMachines,
  departments,
  isAdmin,
}: {
  machines: MachineWithStatus[];
  departments: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const [machines, setMachines] = useState(initialMachines);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MachineWithStatus | null>(null);
  const [_, startTransition] = useTransition();

  const filtered = machines.filter(
    (m) => typeFilter === "ALL" || m.type === typeFilter
  );

  const busyCount    = machines.filter((m) => m.isActive && m.currentJob).length;
  const idleCount    = machines.filter((m) => m.isActive && !m.currentJob).length;
  const inactiveCount= machines.filter((m) => !m.isActive).length;
  const maxToday     = Math.max(...machines.map((m) => m.todayCompletedCount), 1);

  const handleEdit = (m: MachineWithStatus) => {
    setEditTarget(m);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleToggle = (m: MachineWithStatus) => {
    // Optimistic update
    setMachines((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x))
    );
    startTransition(async () => {
      const result = await toggleMachineActive(m.id, !m.isActive);
      if (result.error) {
        // Revert on failure
        setMachines((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, isActive: m.isActive } : x))
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Busy",
            value: busyCount,
            icon: Zap,
            bg: "bg-orange-50 border-orange-200",
            iconBg: "bg-orange-500",
            textColor: "text-orange-700",
          },
          {
            label: "Idle",
            value: idleCount,
            icon: CheckCircle2,
            bg: "bg-green-50 border-green-200",
            iconBg: "bg-green-500",
            textColor: "text-green-700",
          },
          {
            label: "Inactive",
            value: inactiveCount,
            icon: PowerOff,
            bg: "bg-gray-50 border-gray-200",
            iconBg: "bg-gray-400",
            textColor: "text-gray-600",
          },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.bg}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={`text-xl font-black ${s.textColor}`}>{s.value}</p>
              <p className={`text-[10px] font-semibold ${s.textColor} opacity-70`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar + Add button ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-1">
          {TYPE_FILTERS.map((f) => {
            const count = f.value === "ALL"
              ? machines.length
              : machines.filter((m) => m.type === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  typeFilter === f.value
                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  typeFilter === f.value ? "bg-white/20" : "bg-gray-100 text-gray-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Machine
          </button>
        )}
      </div>

      {/* ── Machine grid ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Cpu className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium">No machines found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              isAdmin={isAdmin}
              maxToday={maxToday}
              onEdit={handleEdit}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <MachineFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        machine={editTarget}
        departments={departments}
      />
    </div>
  );
}
