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

// ── 3D Isometric Machine Illustrations ───────────────────────────────────────
// Each machine uses an isometric projection:
//   - ISO top face:  skewX(-30) scaleY(0.866)
//   - ISO left face: skewY(30) scaleX(0.866)  + dark fill
//   - ISO right face:skewY(-30) scaleX(0.866) + darkest fill
// Animated with CSS keyframes in globals.css

function MachineSVG({ type, status }: { type: string; status: MachineStatus }) {
  const busy     = status === "BUSY";
  const inactive = status === "INACTIVE";
  const base     = busy ? "#f97316" : inactive ? "#374151" : getAccent(type);
  const op       = inactive ? 0.25 : 1;

  // Derived shades from base colour for isometric faces
  const face    = base;          // top face  – brightest
  const dark    = base + "99";   // left face – mid
  const darker  = base + "55";   // right face – darkest

  if (type === "Printing Press") {
    // Isometric printing press with two rollers and a paper path
    return (
      <svg viewBox="0 0 160 110" className="w-full h-full" style={{ opacity: op }} overflow="visible">
        {/* Floor shadow */}
        <ellipse cx="80" cy="98" rx="54" ry="10" fill={face} className={busy ? "dt-glow-pulse" : ""} opacity="0.12"/>

        {/* ── Machine body (isometric box) ── */}
        {/* Right face */}
        <polygon points="120,30 136,40 136,78 120,68" fill={darker} stroke={face} strokeWidth="0.6"/>
        {/* Left face */}
        <polygon points="24,40 40,30 120,30 104,40" fill={dark}   stroke={face} strokeWidth="0.6"/>
        {/* Top face */}
        <polygon points="24,40 104,40 120,30 40,30" fill={face}   stroke={face} strokeWidth="0.6" opacity="0.18"/>
        {/* Front face (main) */}
        <polygon points="24,40 24,78 104,78 104,40" fill="#0f172a" stroke={face} strokeWidth="1"/>

        {/* ── Top roller (isometric cylinder) ── */}
        <g className={busy ? "dt-roller-spin" : ""} style={{ transformOrigin: "64px 39px" }}>
          <ellipse cx="64" cy="33" rx="42" ry="10" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
          <ellipse cx="64" cy="31" rx="42" ry="5"  fill="none"    stroke={face} strokeWidth="0.6" opacity="0.5"/>
          <rect x="22" y="33" width="84" height="12" fill="#0f172a" stroke={face} strokeWidth="1"/>
          <ellipse cx="64" cy="45" rx="42" ry="10" fill="#1e293b" stroke={face} strokeWidth="1.2"/>
          <ellipse cx="22" cy="39" rx="4"  ry="10" fill="#1a2744" stroke={face} strokeWidth="0.8"/>
          <ellipse cx="106" cy="39" rx="4" ry="10" fill="#1a2744" stroke={face} strokeWidth="0.8"/>
        </g>

        {/* ── Paper / substrate between rollers ── */}
        <rect x="22" y="47" width="84" height="4" rx="1"
          fill={busy ? face : "white"} opacity={busy ? 0.85 : 0.15}
          className={busy ? "dt-feed" : ""} strokeDasharray={busy ? "8 4" : "0"} strokeDashoffset="0"/>

        {/* ── Bottom roller ── */}
        <g className={busy ? "dt-roller-spin" : ""} style={{ transformOrigin: "64px 62px", animationDirection: "reverse" }}>
          <ellipse cx="64" cy="57" rx="42" ry="10" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
          <ellipse cx="64" cy="55" rx="42" ry="5"  fill="none"    stroke={face} strokeWidth="0.6" opacity="0.5"/>
          <rect x="22" y="57" width="84" height="10" fill="#0f172a" stroke={face} strokeWidth="1"/>
          <ellipse cx="64" cy="67" rx="42" ry="10" fill="#1e293b" stroke={face} strokeWidth="1.2"/>
          <ellipse cx="22"  cy="62" rx="4" ry="10" fill="#1a2744" stroke={face} strokeWidth="0.8"/>
          <ellipse cx="106" cy="62" rx="4" ry="10" fill="#1a2744" stroke={face} strokeWidth="0.8"/>
        </g>

        {/* Ink marks on paper when BUSY */}
        {busy && (
          <>
            <rect x="36" y="46" width="10" height="6" rx="1" fill={face} opacity="0.75"/>
            <rect x="58" y="46" width="10" height="6" rx="1" fill={face} opacity="0.75"/>
            <rect x="80" y="46" width="10" height="6" rx="1" fill={face} opacity="0.75"/>
          </>
        )}

        {/* Output sheet stack on bed */}
        <rect x="22" y="75" width="84" height="4" rx="1" fill="white" opacity="0.08"/>
        <rect x="22" y="80" width="84" height="2" rx="1" fill="white" opacity="0.05"/>

        {/* Isometric side detail lines */}
        <line x1="120" y1="30" x2="120" y2="68" stroke={face} strokeWidth="0.5" opacity="0.3"/>
        <line x1="40"  y1="30" x2="40"  y2="78" stroke={face} strokeWidth="0.5" opacity="0.2"/>
      </svg>
    );
  }

  if (type === "Cutting Machine") {
    // Isometric guillotine cutter — blade animates drop when BUSY
    return (
      <svg viewBox="0 0 160 110" className="w-full h-full" style={{ opacity: op }} overflow="visible">
        {/* Floor shadow */}
        <ellipse cx="80" cy="100" rx="50" ry="9" fill={face} className={busy ? "dt-glow-pulse" : ""} opacity="0.12"/>

        {/* ── Cutting bed (isometric box) ── */}
        <polygon points="24,72 40,62 120,62 104,72" fill={dark}   stroke={face} strokeWidth="0.6"/>
        <polygon points="120,62 136,72 136,88 120,78" fill={darker} stroke={face} strokeWidth="0.6"/>
        <rect x="24" y="72" width="96" height="18" fill="#0f172a" stroke={face} strokeWidth="1"/>

        {/* Paper stack on bed */}
        <polygon points="28,70 44,60 116,60 100,70" fill="white" opacity="0.08" stroke={face} strokeWidth="0.4"/>
        <polygon points="28,67 44,57 116,57 100,67" fill="white" opacity="0.05"/>

        {/* Scale ticks on bed */}
        {[40,55,70,85,100].map((x) => (
          <line key={x} x1={x} y1="72" x2={x} y2="76" stroke={face} strokeWidth="0.8" opacity="0.35"/>
        ))}

        {/* ── Left column ── */}
        <polygon points="22,12 30,8 30,68 22,72" fill={dark} stroke={face} strokeWidth="0.8"/>
        <rect x="14" y="12" width="16" height="60" fill="#0f172a" stroke={face} strokeWidth="1"/>

        {/* ── Right column ── */}
        <polygon points="114,12 122,8 122,68 114,72" fill={dark} stroke={face} strokeWidth="0.8"/>
        <rect x="114" y="12" width="16" height="60" fill="#0f172a" stroke={face} strokeWidth="1"/>

        {/* ── Top crossbar ── */}
        <polygon points="22,8 30,4 138,4 130,8"     fill={face}   stroke={face} strokeWidth="0.6" opacity="0.4"/>
        <rect x="14" y="8" width="124" height="10" fill="#0f172a" stroke={face} strokeWidth="1.2"/>

        {/* ── Animated blade group ── */}
        <g className={busy ? "dt-blade-drop" : ""}>
          {/* Beam */}
          <rect x="22" y="22" width="100" height="9" rx="2" fill="#1e293b" stroke={face} strokeWidth="1.2"/>
          {/* Blade bevel — isometric wedge */}
          <polygon points="22,31 122,31 120,42 24,42" fill={face} opacity="0.85"/>
          <line x1="22" y1="31" x2="122" y2="31" stroke="white" strokeWidth="0.6" opacity="0.4"/>
        </g>
      </svg>
    );
  }

  if (type === "Folding Machine") {
    // Isometric folder — zigzag paper path through rollers
    return (
      <svg viewBox="0 0 160 110" className="w-full h-full" style={{ opacity: op }} overflow="visible">
        {/* Floor shadow */}
        <ellipse cx="80" cy="100" rx="56" ry="9" fill={face} className={busy ? "dt-glow-pulse" : ""} opacity="0.12"/>

        {/* ── Machine body ── */}
        <polygon points="24,38 40,28 136,28 120,38" fill={face}   stroke={face} strokeWidth="0.6" opacity="0.2"/>
        <polygon points="120,28 136,38 136,80 120,70" fill={darker} stroke={face} strokeWidth="0.6"/>
        <polygon points="24,38 40,28 40,70 24,80" fill={dark}   stroke={face} strokeWidth="0.6"/>
        <rect x="24" y="38" width="96" height="34" fill="#0f172a" stroke={face} strokeWidth="1.2"/>

        {/* ── Left feed roller (isometric cylinder vertical) ── */}
        <ellipse cx="32" cy="53" rx="6" ry="20" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
        <ellipse cx="32" cy="51" rx="2.5" ry="8" fill="none"    stroke={face} strokeWidth="0.5" opacity="0.4"/>

        {/* ── Right exit roller ── */}
        <ellipse cx="128" cy="53" rx="6" ry="20" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
        <ellipse cx="128" cy="51" rx="2.5" ry="8" fill="none"   stroke={face} strokeWidth="0.5" opacity="0.4"/>

        {/* ── Fold knife separator lines ── */}
        {[60, 80, 100].map((x) => (
          <line key={x} x1={x} y1="40" x2={x} y2="70" stroke={face} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.3"/>
        ))}

        {/* ── Paper zigzag path ── */}
        <polyline
          points="38,53 54,35 72,71 90,35 108,71 122,53"
          fill="none"
          stroke={busy ? face : "white"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={busy ? 1 : 0.25}
          className={busy ? "dt-fold-travel" : ""}
          strokeDasharray={busy ? "120 0" : "4 4"}
        />

        {/* Fold vertex dots when BUSY */}
        {busy && (
          <>
            <circle cx="54"  cy="35" r="4" fill={face} opacity="0.9"/>
            <circle cx="72"  cy="71" r="4" fill={face} opacity="0.9"/>
            <circle cx="90"  cy="35" r="4" fill={face} opacity="0.9"/>
            <circle cx="108" cy="71" r="4" fill={face} opacity="0.9"/>
          </>
        )}

        {/* ── Output stack on bed ── */}
        <polygon points="32,78 48,68 128,68 112,78" fill="white" opacity="0.06"/>
        <polygon points="32,82 48,72 128,72 112,82" fill="white" opacity="0.04"/>
      </svg>
    );
  }

  if (type === "Stitching Machine") {
    // Isometric saddle-stitcher — book on curved saddle, needles plunge when BUSY
    return (
      <svg viewBox="0 0 160 110" className="w-full h-full" style={{ opacity: op }} overflow="visible">
        {/* Floor shadow */}
        <ellipse cx="80" cy="100" rx="52" ry="9" fill={face} className={busy ? "dt-glow-pulse" : ""} opacity="0.12"/>

        {/* ── Machine base (isometric) ── */}
        <polygon points="24,82 40,72 136,72 120,82" fill={dark}    stroke={face} strokeWidth="0.6"/>
        <polygon points="120,72 136,82 136,92 120,82" fill={darker} stroke={face} strokeWidth="0.6"/>
        <rect x="24" y="82" width="96" height="12" fill="#0f172a" stroke={face} strokeWidth="1"/>

        {/* ── Saddle spine (isometric arc — approximated as polygon) ── */}
        <path
          d="M 28 76 Q 80 36 132 76"
          fill="none"
          stroke={face}
          strokeWidth="4"
          opacity="0.75"
          strokeLinecap="round"
        />
        {/* Book pages on saddle */}
        <path d="M 28 76 Q 56 48 80 42 Q 104 48 132 76" fill="none" stroke={face} strokeWidth="1.5" opacity="0.35"/>
        <path d="M 32 76 Q 58 52 80 47 Q 102 52 128 76" fill="none" stroke={face} strokeWidth="1"   opacity="0.2"/>
        {/* Isometric top pages */}
        <path d="M 80 36 L 90 32 Q 112 42 132 72 L 120 76 Q 100 48 80 42 Z" fill={face} opacity="0.08"/>

        {/* ── Left stitching head ── */}
        <polygon points="42,10 52,6 52,42 42,46" fill={dark}   stroke={face} strokeWidth="0.7"/>
        <rect x="36" y="10" width="16" height="36" rx="3" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
        <circle cx="44" cy="15" r="3.5" fill={face} opacity={busy ? 1 : 0.35}/>
        {/* Left needle */}
        <g className={busy ? "dt-needle-plunge" : ""}>
          <line x1="44" y1="46" x2="44" y2="60" stroke={face} strokeWidth="2"/>
          <polygon points="42,60 44,67 46,60" fill={face} opacity="0.9"/>
        </g>

        {/* ── Right stitching head ── */}
        <polygon points="106,10 116,6 116,42 106,46" fill={dark}   stroke={face} strokeWidth="0.7"/>
        <rect x="104" y="10" width="16" height="36" rx="3" fill="#0f172a" stroke={face} strokeWidth="1.2"/>
        <circle cx="112" cy="15" r="3.5" fill={face} opacity={busy ? 1 : 0.35}/>
        {/* Right needle */}
        <g className={busy ? "dt-needle-plunge" : ""} style={{ animationDelay: "0.2s" }}>
          <line x1="112" y1="46" x2="112" y2="60" stroke={face} strokeWidth="2"/>
          <polygon points="110,60 112,67 114,60" fill={face} opacity="0.9"/>
        </g>

        {/* ── Stitch wire dots along spine ── */}
        {[30, 44, 58, 72, 86, 100, 114, 128].map((xp, i) => {
          const t  = (xp - 28) / 104;
          const sy = 76 - 40 * 4 * t * (1 - t);
          return <circle key={i} cx={xp} cy={sy} r="2.8" fill={face} opacity={busy ? 1 : 0.3}/>;
        })}
      </svg>
    );
  }

  // Other / generic isometric box with rotating gear on top
  return (
    <svg viewBox="0 0 160 110" className="w-full h-full" style={{ opacity: op }} overflow="visible">
      <ellipse cx="80" cy="98" rx="44" ry="8" fill={face} opacity="0.1"/>
      {/* Box right */}
      <polygon points="110,38 126,48 126,80 110,70" fill={darker} stroke={face} strokeWidth="0.6"/>
      {/* Box left */}
      <polygon points="34,48 50,38 110,38 94,48" fill={dark}   stroke={face} strokeWidth="0.6"/>
      {/* Box front */}
      <rect x="34" y="48" width="76" height="32" fill="#0f172a" stroke={face} strokeWidth="1"/>
      {/* Box top */}
      <polygon points="34,48 50,38 110,38 94,48" fill={face} stroke={face} strokeWidth="0.6" opacity="0.15"/>

      {/* Gear on top face */}
      <g className={busy ? "dt-gear" : ""} style={{ transformOrigin: "80px 43px" }}>
        <circle cx="80" cy="43" r="14" fill="none" stroke={face} strokeWidth="1.2" opacity="0.6"/>
        <circle cx="80" cy="43" r="6"  fill="none" stroke={face} strokeWidth="1.2"/>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={80 + Math.cos(a) * 12} y1={43 + Math.sin(a) * 12}
              x2={80 + Math.cos(a) * 17} y2={43 + Math.sin(a) * 17}
              stroke={face} strokeWidth="4" strokeLinecap="round"
            />
          );
        })}
      </g>
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.08),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.45),rgba(2,6,23,0.9))]" />
        <div className="dt-panel-scan absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center p-3 pt-4" style={{ perspective: "900px" }}>
          <div className="dt-machine-stage w-full h-full">
            <MachineSVG type={machine.type} status={status} />
          </div>
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
              placeholder="e.g. HP-07, MBO-05"
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
