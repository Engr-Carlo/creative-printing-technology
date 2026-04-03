"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Power, PowerOff, AlertTriangle, CheckCircle2,
  Clock, User, Package, Zap, X, Layers, Printer, Scissors,
  BookOpen, Paperclip, Cpu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type MachineWithStatus } from "@/app/actions/machines";
import { createMachine, updateMachine, toggleMachineActive } from "@/app/actions/machines";

const MACHINE_TYPES = [
  "Printing Press",
  "Cutting Machine",
  "Folding Machine",
  "Stitching Machine",
  "Other",
];

const TYPE_FILTERS = [
  { value: "ALL",               label: "All",       Icon: Cpu },
  { value: "Printing Press",    label: "Printing",  Icon: Printer },
  { value: "Cutting Machine",   label: "Cutting",   Icon: Scissors },
  { value: "Folding Machine",   label: "Folding",   Icon: BookOpen },
  { value: "Stitching Machine", label: "Stitching", Icon: Paperclip },
];

// Idle/INACTIVE accent color per type (BUSY always uses orange)
const TYPE_ACCENT: Record<string, string> = {
  "Printing Press":    "#60a5fa",
  "Cutting Machine":   "#f87171",
  "Folding Machine":   "#34d399",
  "Stitching Machine": "#a78bfa",
  "Other":             "#9ca3af",
};

function getAccent(type: string) {
  return TYPE_ACCENT[type] ?? TYPE_ACCENT["Other"];
}

type MachineStatus = "INACTIVE" | "BUSY" | "IDLE";

function getMachineStatus(m: MachineWithStatus): MachineStatus {
  if (!m.isActive) return "INACTIVE";
  if (m.currentJob) return "BUSY";
  return "IDLE";
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
    <span className="font-mono text-[11px] font-bold text-orange-300 tabular-nums">{elapsed}</span>
  );
}

// ── SVG Machine Illustrations ────────────────────────────────────────────────

function MachineSVG({ type, status }: { type: string; status: MachineStatus }) {
  const busy     = status === "BUSY";
  const inactive = status === "INACTIVE";
  const c        = busy ? "#f97316" : inactive ? "#374151" : getAccent(type);
  const op       = inactive ? 0.3 : 1;

  if (type === "Printing Press") {
    return (
      <svg viewBox="0 0 140 90" className="w-full h-full" style={{ opacity: op }}>
        <rect x="8" y="8" width="124" height="74" rx="4" fill="none" stroke={c} strokeWidth="1" opacity="0.15"/>
        <ellipse cx="70" cy="33" rx="52" ry="14" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <ellipse cx="70" cy="31" rx="52" ry="6"  fill="none"   stroke={c} strokeWidth="0.75" opacity="0.45"/>
        <ellipse cx="18"  cy="33" rx="4" ry="14" fill="#1e293b" stroke={c} strokeWidth="1"/>
        <ellipse cx="122" cy="33" rx="4" ry="14" fill="#1e293b" stroke={c} strokeWidth="1"/>
        <rect x="15" y="45" width="110" height="3" rx="1"
          fill={busy ? c : "white"} opacity={busy ? 0.9 : 0.18}/>
        {busy && (
          <>
            <rect x="32" y="42" width="13" height="9" rx="1" fill={c} opacity="0.7"/>
            <rect x="64" y="42" width="13" height="9" rx="1" fill={c} opacity="0.7"/>
            <rect x="96" y="42" width="13" height="9" rx="1" fill={c} opacity="0.7"/>
          </>
        )}
        <ellipse cx="70" cy="57" rx="52" ry="14" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <ellipse cx="70" cy="55" rx="52" ry="6"  fill="none"   stroke={c} strokeWidth="0.75" opacity="0.45"/>
        <ellipse cx="18"  cy="57" rx="4" ry="14" fill="#1e293b" stroke={c} strokeWidth="1"/>
        <ellipse cx="122" cy="57" rx="4" ry="14" fill="#1e293b" stroke={c} strokeWidth="1"/>
        <rect x="15" y="74" width="110" height="3" rx="1" fill="white" opacity="0.1"/>
        <rect x="15" y="78" width="110" height="2" rx="1" fill="white" opacity="0.07"/>
      </svg>
    );
  }

  if (type === "Cutting Machine") {
    const bladeY = busy ? 44 : 18;
    return (
      <svg viewBox="0 0 140 90" className="w-full h-full" style={{ opacity: op }}>
        <rect x="14"  y="12" width="12" height="52" rx="2" fill="#0f172a" stroke={c} strokeWidth="1" opacity="0.6"/>
        <rect x="114" y="12" width="12" height="52" rx="2" fill="#0f172a" stroke={c} strokeWidth="1" opacity="0.6"/>
        <rect x="10" y="6" width="120" height="12" rx="3" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <rect x="20" y={bladeY - 6} width="100" height="7" rx="2" fill="#1e293b" stroke={c} strokeWidth="1.5"/>
        <path d={`M 20 ${bladeY + 1} L 120 ${bladeY + 1} L 118 ${bladeY + 9} L 22 ${bladeY + 9} Z`}
          fill={c} opacity="0.85"/>
        <rect x="14" y="62" width="112" height="16" rx="2" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <rect x="22" y="58" width="96" height="4" rx="1" fill="white" opacity="0.14"/>
        <rect x="22" y="61" width="96" height="2" rx="1" fill="white" opacity="0.09"/>
        {[35, 52, 70, 88, 105].map((x) => (
          <line key={x} x1={x} y1="64" x2={x} y2="68" stroke={c} strokeWidth="0.5" opacity="0.4"/>
        ))}
      </svg>
    );
  }

  if (type === "Folding Machine") {
    return (
      <svg viewBox="0 0 140 90" className="w-full h-full" style={{ opacity: op }}>
        <rect x="8" y="16" width="124" height="56" rx="4" fill="#0f172a" stroke={c} strokeWidth="1.5" opacity="0.4"/>
        <ellipse cx="20"  cy="44" rx="8" ry="22" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <ellipse cx="20"  cy="42" rx="3" ry="9"  fill="none"   stroke={c} strokeWidth="0.75" opacity="0.4"/>
        <ellipse cx="120" cy="44" rx="8" ry="22" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <ellipse cx="120" cy="42" rx="3" ry="9"  fill="none"   stroke={c} strokeWidth="0.75" opacity="0.4"/>
        {[50, 70, 90].map((x) => (
          <line key={x} x1={x} y1="18" x2={x} y2="70" stroke={c} strokeWidth="0.75" strokeDasharray="3 2" opacity="0.3"/>
        ))}
        <polyline
          points="28,44 44,24 62,64 80,24 98,64 112,44"
          fill="none" stroke={c} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          opacity={busy ? 1 : 0.4}
        />
        {busy && (
          <>
            <circle cx="44" cy="24" r="3.5" fill={c} opacity="0.85"/>
            <circle cx="62" cy="64" r="3.5" fill={c} opacity="0.85"/>
            <circle cx="80" cy="24" r="3.5" fill={c} opacity="0.85"/>
            <circle cx="98" cy="64" r="3.5" fill={c} opacity="0.85"/>
          </>
        )}
      </svg>
    );
  }

  if (type === "Stitching Machine") {
    const needleY = busy ? 52 : 42;
    return (
      <svg viewBox="0 0 140 90" className="w-full h-full" style={{ opacity: op }}>
        <rect x="10" y="74" width="120" height="10" rx="2" fill="#0f172a" stroke={c} strokeWidth="1" opacity="0.5"/>
        <path d="M 15 68 Q 70 28 125 68" fill="none" stroke={c} strokeWidth="3" opacity="0.7"/>
        <path d="M 15 68 Q 43 40 70 34 Q 97 40 125 68" fill="none" stroke={c} strokeWidth="1" opacity="0.3"/>
        <path d="M 20 68 Q 46 44 70 39 Q 94 44 120 68" fill="none" stroke={c} strokeWidth="1" opacity="0.2"/>
        <rect x="35" y="8" width="14" height="28" rx="3" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <circle cx="42" cy="12" r="3" fill={c} opacity={busy ? 0.9 : 0.4}/>
        <line x1="42" y1="36" x2="42" y2={needleY} stroke={c} strokeWidth="1.5"/>
        <path d={`M 40 ${needleY} L 42 ${needleY + 5} L 44 ${needleY}`} fill={c} opacity="0.85"/>
        <rect x="91" y="8" width="14" height="28" rx="3" fill="#0f172a" stroke={c} strokeWidth="1.5"/>
        <circle cx="98" cy="12" r="3" fill={c} opacity={busy ? 0.9 : 0.4}/>
        <line x1="98" y1="36" x2="98" y2={needleY} stroke={c} strokeWidth="1.5"/>
        <path d={`M 96 ${needleY} L 98 ${needleY + 5} L 100 ${needleY}`} fill={c} opacity="0.85"/>
        {[22, 35, 48, 62, 75, 88, 102, 115, 128].map((xp, i) => {
          const t  = (xp - 15) / 110;
          const sy = 68 - 40 * 4 * t * (1 - t);
          return <circle key={i} cx={xp} cy={sy} r="2.5" fill={c} opacity={busy ? 0.9 : 0.35}/>;
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 90" className="w-full h-full" style={{ opacity: op }}>
      <circle cx="70" cy="45" r="28" fill="none" stroke={c} strokeWidth="1.5" opacity="0.5"/>
      <circle cx="70" cy="45" r="12" fill="none" stroke={c} strokeWidth="1.5"/>
      {Array.from({ length: 8 }).map((_, i) => {
        const a  = (i * 45 * Math.PI) / 180;
        return (
          <line key={i}
            x1={70 + Math.cos(a) * 26} y1={45 + Math.sin(a) * 26}
            x2={70 + Math.cos(a) * 34} y2={45 + Math.sin(a) * 34}
            stroke={c} strokeWidth="5" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ── Machine Card ─────────────────────────────────────────────────────────────
function MachineCard({
  machine, isAdmin, maxToday, onEdit, onToggle,
}: {
  machine: MachineWithStatus;
  isAdmin: boolean;
  maxToday: number;
  onEdit: (m: MachineWithStatus) => void;
  onToggle: (m: MachineWithStatus) => void;
}) {
  const status       = getMachineStatus(machine);
  const busy         = status === "BUSY";
  const inactive     = status === "INACTIVE";
  const utilizationPct = maxToday > 0
    ? Math.round((machine.todayCompletedCount / maxToday) * 100) : 0;

  const cardCls = inactive
    ? "border-slate-700/50 opacity-60"
    : busy
    ? "border-orange-500/60"
    : "border-slate-700/40 hover:border-slate-600/60";

  const cardGlow = busy
    ? { boxShadow: "0 0 24px rgba(249,115,22,0.25), 0 4px 20px rgba(0,0,0,0.5)" }
    : inactive
    ? { boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
    : { boxShadow: "0 2px 16px rgba(0,0,0,0.35)" };

  const ledColor = busy ? "#f97316" : inactive ? "#1e293b" : "#22c55e";
  const ledGlow  = busy
    ? { boxShadow: "0 0 8px #f97316, 0 0 18px rgba(249,115,22,0.5)" }
    : inactive ? {}
    : { boxShadow: "0 0 6px #22c55e, 0 0 12px rgba(34,197,94,0.4)" };

  const handles: string[] = machine.handlesProcesses ?? [];

  return (
    <div
      className={`relative rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-300 group bg-slate-900 ${cardCls}`}
      style={cardGlow}
    >
      {busy && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400/80 to-transparent animate-pulse pointer-events-none z-10" />
      )}

      {/* Dark visualization header */}
      <div className="relative h-36 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-3 pt-4">
          <MachineSVG type={machine.type} status={status} />
        </div>
        <div className="absolute top-3 right-3 z-10">
          <div
            className={`w-3 h-3 rounded-full ${busy ? "animate-pulse" : ""}`}
            style={{ backgroundColor: ledColor, ...ledGlow }}
          />
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent px-3 pt-6 pb-2.5">
          <p className="font-mono text-[8px] font-bold text-slate-500 uppercase tracking-[0.15em]">
            {machine.type}
          </p>
          <h3 className="font-mono text-[22px] font-black text-white leading-none tracking-tight">
            {machine.name}
          </h3>
        </div>
      </div>

      {/* Data area */}
      <div className="flex-1 flex flex-col border-t border-white/10">
        <div className="flex-1 px-3 py-2.5 space-y-2.5">
          {handles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {handles.map((p) => (
                <span key={p}
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-slate-400"
                >
                  <Layers className="w-2.5 h-2.5 opacity-50" />
                  {p}
                </span>
              ))}
            </div>
          )}

          {busy && machine.currentJob ? (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/25 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Running</span>
                </div>
                {machine.currentJob.startedAt && (
                  <ElapsedTime startedAt={machine.currentJob.startedAt} />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Package className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-orange-300">
                    {machine.currentJob.itemNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {machine.currentJob.itemName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[9px]">⚙</span>
                  <span className="text-[10px] text-slate-300 font-semibold">
                    {machine.currentJob.processName}
                  </span>
                </div>
                {machine.currentJob.assignedToName && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                    <span className="text-[10px] text-slate-400">
                      {machine.currentJob.assignedToName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : inactive ? (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-2.5 py-2 flex items-center gap-2">
              <PowerOff className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span className="text-[10px] text-slate-600 font-medium">Machine offline</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-2.5 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-[10px] text-green-300 font-medium">Ready for next job</span>
              </div>
              {(machine.fleetActiveEstimate ?? 0) > 0 && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-2.5 py-2 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-[10px] text-blue-300 font-medium">
                    ~{machine.fleetActiveEstimate} active on floor
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-slate-600" />
                <span className="text-[9px] text-slate-500">Today&apos;s output</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                {machine.todayCompletedCount} job{machine.todayCompletedCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  utilizationPct > 70 ? "bg-green-400" :
                  utilizationPct > 30 ? "bg-orange-400" :
                  utilizationPct > 0  ? "bg-blue-400"   : "bg-slate-700"
                }`}
                style={{ width: `${Math.max(utilizationPct, utilizationPct > 0 ? 8 : 0)}%` }}
              />
            </div>
          </div>

          {machine.recentBreakdownCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-[9px] font-semibold text-red-300">
                {machine.recentBreakdownCount} breakdown{machine.recentBreakdownCount > 1 ? "s" : ""} this month
              </span>
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[9px] text-slate-600 font-medium truncate pr-2">
            {machine.department.name}
          </span>
          {isAdmin && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(machine)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/10 transition-colors"
                title="Edit machine"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => onToggle(machine)}
                className={`p-1.5 rounded-lg transition-colors ${
                  machine.isActive
                    ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                    : "text-slate-600 hover:text-green-400 hover:bg-green-500/10"
                }`}
                title={machine.isActive ? "Deactivate" : "Activate"}
              >
                {machine.isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
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
  const [, startTransition] = useTransition();

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
            label: "Busy",     value: busyCount,
            dot: "bg-orange-500", dotGlow: "shadow-[0_0_8px_#f97316]",
            bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400",
          },
          {
            label: "Idle",     value: idleCount,
            dot: "bg-green-500",  dotGlow: "shadow-[0_0_6px_#22c55e]",
            bg: "bg-green-500/10 border-green-500/20",   text: "text-green-400",
          },
          {
            label: "Inactive", value: inactiveCount,
            dot: "bg-slate-600",  dotGlow: "",
            bg: "bg-slate-800/50 border-slate-700/40",   text: "text-slate-500",
          },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 bg-slate-900 ${s.bg}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot} ${s.dotGlow}`} />
            <div>
              <p className={`text-2xl font-black font-mono ${s.text}`}>{s.value}</p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${s.text} opacity-60`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar + Add button ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-1 flex-wrap">
          {TYPE_FILTERS.map((f) => {
            const count  = f.value === "ALL"
              ? machines.length
              : machines.filter((m) => m.type === f.value).length;
            const active = typeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  active
                    ? "bg-slate-800 text-white border-slate-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                <f.Icon className="w-3.5 h-3.5" />
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
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
