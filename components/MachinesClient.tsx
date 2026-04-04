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

// ── Realistic Side-Profile Machine Illustrations ────────────────────────────
// Each machine is a recognisable 2D side-view silhouette with working-state
// animations driven by the CSS keyframes already defined in globals.css.

function MachineSVG({ type, status }: { type: string; status: MachineStatus }) {
  const busy     = status === "BUSY";
  const inactive = status === "INACTIVE";
  const c        = busy ? "#f97316" : inactive ? "#4b5563" : getAccent(type);
  const op       = inactive ? 0.30 : 1;
  const dim      = c + "66";   // 40 % opacity variant for recessed areas
  const mid      = c + "99";   // 60 % opacity variant for mid-tones
  const bg       = "#0f172a";  // card dark background

  if (type === "Printing Press") {
    // Heidelberg-style offset litho press — side view
    // Layout: paper-roll stand | large press housing | delivery section
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full" style={{ opacity: op }}>
        {/* ── Floor line ── */}
        <line x1="8" y1="90" x2="152" y2="90" stroke={c} strokeWidth="0.8" opacity="0.25"/>

        {/* ── Paper roll stand (left) ── */}
        {/* Stand legs */}
        <line x1="14" y1="90" x2="14" y2="68" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="26" y1="90" x2="26" y2="68" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Roll hub bar */}
        <line x1="12" y1="68" x2="28" y2="68" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        {/* Paper roll — circle */}
        <circle cx="20" cy="58" r="12" fill={bg} stroke={c} strokeWidth="1.8"/>
        <circle cx="20" cy="58" r="7"  fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="20" cy="58" r="2.5" fill={c} opacity="0.9"/>
        {/* Rotation spokes when BUSY */}
        {busy && (
          <g className="dt-roller-spin" style={{ transformOrigin: "20px 58px" }}>
            {[0,60,120,180,240,300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg}
                x1={20 + Math.cos(rad)*3} y1={58 + Math.sin(rad)*3}
                x2={20 + Math.cos(rad)*9} y2={58 + Math.sin(rad)*9}
                stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"
              />;
            })}
          </g>
        )}
        {/* Paper web strip from roll */}
        <line x1="32" y1="58" x2="48" y2="58"
          stroke={busy ? c : "white"} strokeWidth="2.5"
          opacity={busy ? 0.9 : 0.2}
          className={busy ? "dt-feed" : ""}
        />

        {/* ── Main press housing ── */}
        {/* Body */}
        <rect x="48" y="22" width="70" height="68" rx="3" fill={bg} stroke={c} strokeWidth="1.6"/>
        {/* Top hood */}
        <rect x="52" y="18" width="62" height="10" rx="2" fill={dim} stroke={c} strokeWidth="1"/>
        {/* Impression cylinder — large circle */}
        <circle cx="83" cy="55" r="22" fill={bg} stroke={c} strokeWidth="1.5"/>
        <circle cx="83" cy="55" r="16" fill={dim} stroke={mid} strokeWidth="0.8"/>
        {/* Cylinder cross hatch detail */}
        <line x1="67" y1="55" x2="99" y2="55" stroke={c} strokeWidth="0.6" opacity="0.4"/>
        <line x1="83" y1="39" x2="83" y2="71" stroke={c} strokeWidth="0.6" opacity="0.4"/>
        {/* Cylinder hub */}
        <circle cx="83" cy="55" r="5" fill={c} opacity="0.7"/>
        {/* Cylinder rotation anim */}
        {busy && (
          <g className="dt-roller-spin" style={{ transformOrigin: "83px 55px" }}>
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg}
                x1={83 + Math.cos(rad)*6} y1={55 + Math.sin(rad)*6}
                x2={83 + Math.cos(rad)*20} y2={55 + Math.sin(rad)*20}
                stroke={c} strokeWidth="1.8" strokeLinecap="round" opacity="0.5"
              />;
            })}
          </g>
        )}
        {/* Ink duct bar at top of housing */}
        <rect x="56" y="28" width="54" height="6" rx="1" fill={mid} opacity="0.5"/>
        {/* Ink rollers — row of small circles */}
        <circle cx="62" cy="31" r="3" fill={bg} stroke={c} strokeWidth="1"/>
        <circle cx="70" cy="31" r="3" fill={bg} stroke={c} strokeWidth="1"/>
        <circle cx="78" cy="31" r="3" fill={bg} stroke={c} strokeWidth="1"/>
        <circle cx="86" cy="31" r="3" fill={bg} stroke={c} strokeWidth="1"/>
        <circle cx="94" cy="31" r="3" fill={bg} stroke={c} strokeWidth="1"/>
        {/* Control panel box */}
        <rect x="100" y="68" width="14" height="18" rx="1" fill={dim}/>
        <rect x="102" y="70" width="4" height="3" rx="0.5" fill={c} opacity="0.8"/>
        <rect x="108" y="70" width="4" height="3" rx="0.5" fill={c} opacity="0.5"/>

        {/* ── Delivery section (right) ── */}
        {/* Delivery housing */}
        <rect x="118" y="42" width="28" height="48" rx="2" fill={bg} stroke={c} strokeWidth="1.2"/>
        {/* Output sheet stack */}
        {[0,2,4,6,8].map((offset) => (
          <line key={offset} x1="121" y1={78 - offset} x2="143" y2={78 - offset}
            stroke="white" strokeWidth="1" opacity={0.06 + offset * 0.015}/>
        ))}
        {/* Delivery rollers */}
        <circle cx="129" cy="50" r="5" fill={bg} stroke={c} strokeWidth="1.2"/>
        <circle cx="129" cy="50" r="2" fill={c} opacity="0.6"/>
        {/* Sheet gripper bar */}
        <rect x="120" y="58" width="25" height="3" rx="1" fill={mid} opacity="0.5"/>
        {/* Paper travel line BUSY */}
        {busy && (
          <line x1="118" y1="58" x2="105" y2="58"
            stroke={c} strokeWidth="2" opacity="0.8"
            className="dt-feed"
          />
        )}
      </svg>
    );
  }

  if (type === "Cutting Machine") {
    // Polar guillotine cutter — side view
    // Layout: wide table bed | left safety guard | vertical blade column | control panel
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full" style={{ opacity: op }}>
        {/* ── Floor line ── */}
        <line x1="8" y1="90" x2="152" y2="90" stroke={c} strokeWidth="0.8" opacity="0.25"/>

        {/* ── Table base / cabinet ── */}
        <rect x="12" y="68" width="110" height="22" rx="3" fill={bg} stroke={c} strokeWidth="1.5"/>
        {/* Cabinet door lines */}
        <line x1="65" y1="70" x2="65" y2="88" stroke={c} strokeWidth="0.7" opacity="0.3"/>
        <rect x="16" y="72" width="22" height="14" rx="1" fill={dim}/>
        <rect x="45" y="72" width="16" height="14" rx="1" fill={dim}/>
        {/* Feet */}
        <rect x="14" y="88" width="8" height="4" rx="1" fill={c} opacity="0.5"/>
        <rect x="110" y="88" width="8" height="4" rx="1" fill={c} opacity="0.5"/>

        {/* ── Cutting table top surface ── */}
        <rect x="12" y="54" width="110" height="14" rx="2" fill={dim} stroke={c} strokeWidth="1.2"/>
        {/* Scale ruler markings */}
        {[20,30,40,50,60,70,80,90,100,110].map((x) => (
          <line key={x} x1={x} y1="54" x2={x} y2={x % 40 === 0 ? 50 : 52}
            stroke={c} strokeWidth="0.8" opacity="0.5"/>
        ))}
        {/* Paper stack on table */}
        {[0,1.5,3,4.5].map((offset) => (
          <rect key={offset} x="22" y={47 - offset} width="80" height="6" rx="0.5"
            fill="white" stroke={c} strokeWidth="0.4"
            opacity={0.07 - offset * 0.01}/>
        ))}

        {/* ── Left portal column ── */}
        <rect x="10" y="12" width="14" height="56" rx="2" fill={bg} stroke={c} strokeWidth="1.5"/>
        <rect x="12" y="14" width="10" height="8" rx="1" fill={dim}/>

        {/* ── Right portal column ── */}
        <rect x="110" y="12" width="14" height="56" rx="2" fill={bg} stroke={c} strokeWidth="1.5"/>
        <rect x="112" y="14" width="10" height="8" rx="1" fill={dim}/>

        {/* ── Top crossbar ── */}
        <rect x="10" y="8" width="114" height="10" rx="2" fill={bg} stroke={c} strokeWidth="1.5"/>

        {/* ── Animated blade carriage ── */}
        <g className={busy ? "dt-blade-drop" : ""} style={{ transformOrigin: "67px 35px" }}>
          {/* Carriage beam */}
          <rect x="14" y="22" width="106" height="8" rx="1.5" fill={mid} stroke={c} strokeWidth="1.2"/>
          {/* Blade edge — triangular bevel */}
          <polygon points="14,30 120,30 119,40 15,40"
            fill={c} opacity="0.9" stroke={c} strokeWidth="0.5"/>
          {/* Blade shine */}
          <line x1="16" y1="31" x2="118" y2="31" stroke="white" strokeWidth="0.8" opacity="0.35"/>
        </g>

        {/* ── Right control panel tower ── */}
        <rect x="128" y="22" width="24" height="68" rx="3" fill={bg} stroke={c} strokeWidth="1.5"/>
        {/* Screen */}
        <rect x="131" y="26" width="18" height="12" rx="1.5" fill={dim}/>
        {busy && <rect x="131" y="26" width="18" height="12" rx="1.5" fill={c} opacity="0.3"/>}
        {/* Buttons */}
        {[0,1,2].map((i) => (
          <circle key={i} cx={136 + i * 6} cy="46" r="2.5"
            fill={i === 0 && busy ? c : dim}
            stroke={c} strokeWidth="0.8"
          />
        ))}
        {/* Numeric keypad dots */}
        {[0,1,2,3,4,5].map((i) => (
          <rect key={i} cx={132 + (i % 3) * 6} cy={54 + Math.floor(i / 3) * 6}
            x={132 + (i % 3) * 6} y={54 + Math.floor(i / 3) * 6}
            width="4" height="4" rx="0.5"
            fill={dim} stroke={c} strokeWidth="0.5"
          />
        ))}
      </svg>
    );
  }

  if (type === "Folding Machine") {
    // MBO buckle folder — side view
    // Layout: angled feed tray | long horizontal body with fold plates | output delivery
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full" style={{ opacity: op }}>
        {/* ── Floor line ── */}
        <line x1="8" y1="90" x2="152" y2="90" stroke={c} strokeWidth="0.8" opacity="0.25"/>

        {/* ── Machine body (long horizontal cabinet) ── */}
        <rect x="30" y="48" width="100" height="32" rx="3" fill={bg} stroke={c} strokeWidth="1.6"/>
        {/* Cabinet panel divisions */}
        <line x1="60"  y1="50" x2="60"  y2="78" stroke={c} strokeWidth="0.7" opacity="0.25"/>
        <line x1="90"  y1="50" x2="90"  y2="78" stroke={c} strokeWidth="0.7" opacity="0.25"/>
        <line x1="115" y1="50" x2="115" y2="78" stroke={c} strokeWidth="0.7" opacity="0.25"/>
        {/* Machine feet */}
        <rect x="35" y="78" width="8" height="12" rx="1" fill={c} opacity="0.4"/>
        <rect x="60" y="78" width="8" height="12" rx="1" fill={c} opacity="0.4"/>
        <rect x="90" y="78" width="8" height="12" rx="1" fill={c} opacity="0.4"/>
        <rect x="118" y="78" width="8" height="12" rx="1" fill={c} opacity="0.4"/>

        {/* ── Fold plate pockets (visible top openings) ── */}
        <rect x="35"  y="46" width="20" height="6" rx="1" fill={bg} stroke={c} strokeWidth="1"/>
        <rect x="63"  y="46" width="20" height="6" rx="1" fill={bg} stroke={c} strokeWidth="1"/>
        <rect x="93"  y="46" width="18" height="6" rx="1" fill={bg} stroke={c} strokeWidth="1"/>
        {/* Roller nip pairs at each pocket */}
        <circle cx="38" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="44" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="66" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="72" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="96" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="102" cy="49" r="3.5" fill={dim} stroke={c} strokeWidth="1"/>

        {/* ── Left paper feed tray (angled) ── */}
        <line x1="12" y1="30" x2="32" y2="50" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="20" y1="28" x2="40" y2="48" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Tray surface */}
        <polygon points="12,30 20,28 40,48 32,50" fill={dim} opacity="0.5"/>
        {/* Paper sheets on feed tray */}
        {[0,2,4].map((offset) => (
          <line key={offset}
            x1={13 + offset * 0.5} y1={30 - offset}
            x2={33 + offset * 0.5} y2={50 - offset}
            stroke="white" strokeWidth={2 - offset * 0.3} opacity={0.12 - offset * 0.02}
          />
        ))}

        {/* ── Paper path through rollers when BUSY ── */}
        {busy && (
          <g>
            <polyline
              points="30,49 48,49 62,49 68,49 82,49 98,49 112,49 130,49"
              fill="none"
              stroke={c}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
              className="dt-fold-travel"
              strokeDasharray="16 8"
            />
            {/* Fold crease marks */}
            <line x1="48" y1="44" x2="48" y2="54" stroke={c} strokeWidth="1.5" opacity="0.7"/>
            <line x1="82" y1="44" x2="82" y2="54" stroke={c} strokeWidth="1.5" opacity="0.7"/>
          </g>
        )}

        {/* ── Right output delivery ── */}
        {/* Delivery tray */}
        <rect x="130" y="52" width="22" height="6" rx="1" fill={dim} stroke={c} strokeWidth="1"/>
        {/* Output sheet stack */}
        {[0,1.5,3,4.5,6].map((offset) => (
          <rect key={offset}
            x={131} y={51 - offset}
            width={20} height={5.5}
            rx="0.5" fill="white"
            stroke={c} strokeWidth="0.4"
            opacity={0.06 + offset * 0.008}
          />
        ))}
        {/* Delivery roller */}
        <circle cx="140" cy="46" r="5" fill={bg} stroke={c} strokeWidth="1.2"/>
        <circle cx="140" cy="46" r="2" fill={c} opacity="0.6"/>

        {/* ── Control display ── */}
        <rect x="116" y="52" width="12" height="10" rx="1" fill={dim}/>
        {busy && <rect x="116" y="52" width="12" height="10" rx="1" fill={c} opacity="0.25"/>}
        <line x1="117" y1="57" x2="127" y2="57" stroke={c} strokeWidth="0.8" opacity="0.5"/>
      </svg>
    );
  }

  if (type === "Stitching Machine") {
    // Muller Martini saddle stitcher — side view
    // Layout: cover feeder | long saddle chain conveyor | stitching heads | trimmer/delivery
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full" style={{ opacity: op }}>
        {/* ── Floor line ── */}
        <line x1="8" y1="90" x2="152" y2="90" stroke={c} strokeWidth="0.8" opacity="0.25"/>

        {/* ── Main frame base ── */}
        <rect x="10" y="72" width="140" height="10" rx="2" fill={bg} stroke={c} strokeWidth="1.4"/>
        {/* Frame support legs */}
        {[18, 50, 82, 110, 138].map((x) => (
          <rect key={x} x={x - 3} y="80" width="6" height="10" rx="1" fill={c} opacity="0.35"/>
        ))}

        {/* ── Saddle chain rail ── */}
        {/* Rail top bar */}
        <rect x="16" y="60" width="128" height="4" rx="1" fill={dim} stroke={c} strokeWidth="1"/>
        {/* Saddle fold triangles riding the rail */}
        {[24, 46, 68, 90, 112, 130].map((x) => (
          <polygon key={x}
            points={`${x},60 ${x + 8},60 ${x + 4},52`}
            fill={bg}
            stroke={c}
            strokeWidth="1.2"
          />
        ))}
        {/* Book spine sitting on first/second saddle when BUSY */}
        {busy && (
          <>
            <polygon points="46,60 54,60 50,50" fill={c} opacity="0.25" stroke={c} strokeWidth="0.8"/>
            <path d="M 46 60 Q 50 46 54 60" fill={c} opacity="0.15"/>
          </>
        )}

        {/* ── Cover feeder (left side) ── */}
        {/* Feeder cabinet */}
        <rect x="8" y="28" width="28" height="44" rx="2" fill={bg} stroke={c} strokeWidth="1.4"/>
        {/* Feeder stack of signatures */}
        {[0,2,4,6].map((offset) => (
          <rect key={offset}
            x={11} y={30 + offset}
            width={22} height={3}
            rx="0.5" fill="white"
            stroke={c} strokeWidth="0.3"
            opacity={0.08 - offset * 0.01}
          />
        ))}
        {/* Suction bar */}
        <rect x="11" y="46" width="22" height="3" rx="1" fill={mid}/>
        {/* Opening roller */}
        <circle cx="17" cy="55" r="5" fill={bg} stroke={c} strokeWidth="1.2"/>
        <circle cx="17" cy="55" r="2" fill={c} opacity="0.6"/>

        {/* ── Stitching head assembly ── */}
        {/* Head support bar */}
        <rect x="56" y="16" width="50" height="6" rx="1" fill={mid} stroke={c} strokeWidth="1"/>
        {/* Left stitching head */}
        <rect x="60" y="22" width="16" height="28" rx="2" fill={bg} stroke={c} strokeWidth="1.4"/>
        <rect x="63" y="24" width="10" height="6" rx="1" fill={dim}/>
        <circle cx="68" cy="26" r="2.5" fill={c} opacity={busy ? 1 : 0.4}/>
        {/* Left needle */}
        <g className={busy ? "dt-needle-plunge" : ""} style={{ transformOrigin: "68px 50px" }}>
          <rect x="67" y="50" width="2.5" height="12" rx="0.5" fill={c} opacity="0.9"/>
          <polygon points="66,62 68.25,68 70.5,62" fill={c} opacity="0.85"/>
        </g>
        {/* Right stitching head */}
        <rect x="84" y="22" width="16" height="28" rx="2" fill={bg} stroke={c} strokeWidth="1.4"/>
        <rect x="87" y="24" width="10" height="6" rx="1" fill={dim}/>
        <circle cx="92" cy="26" r="2.5" fill={c} opacity={busy ? 1 : 0.4}/>
        {/* Right needle */}
        <g className={busy ? "dt-needle-plunge" : ""} style={{ transformOrigin: "92px 50px", animationDelay: "0.2s" }}>
          <rect x="91" y="50" width="2.5" height="12" rx="0.5" fill={c} opacity="0.9"/>
          <polygon points="90,62 92.25,68 94.5,62" fill={c} opacity="0.85"/>
        </g>

        {/* ── Trimmer / delivery (right end) ── */}
        {/* Trimmer housing */}
        <rect x="122" y="32" width="30" height="40" rx="2" fill={bg} stroke={c} strokeWidth="1.4"/>
        {/* Trimmer blade */}
        <rect x="125" y="36" width="24" height="5" rx="1" fill={mid}/>
        <polygon points="125,41 149,41 148,47 126,47" fill={c} opacity="0.75"/>
        {/* Output chute */}
        <rect x="130" y="54" width="18" height="14" rx="1" fill={dim}/>
        {/* Finished books in chute */}
        {busy && [0,3,6].map((y) => (
          <rect key={y} x="132" y={56 + y} width="14" height="2.5" rx="0.5"
            fill="white" opacity={0.1 - y * 0.02}/>
        ))}
        {/* Wire spool on top */}
        <circle cx="134" cy="32" r="6" fill={bg} stroke={c} strokeWidth="1.2"/>
        <circle cx="134" cy="32" r="3" fill={dim}/>
        {busy && (
          <g className="dt-roller-spin" style={{ transformOrigin: "134px 32px" }}>
            {[0,120,240].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={deg}
                x1={134 + Math.cos(rad)*3.5} y1={32 + Math.sin(rad)*3.5}
                x2={134 + Math.cos(rad)*5.5} y2={32 + Math.sin(rad)*5.5}
                stroke={c} strokeWidth="1.2" opacity="0.7"
              />;
            })}
          </g>
        )}
      </svg>
    );
  }

  // Other / generic machine — side-view cabinet with display and gear
  return (
    <svg viewBox="0 0 160 100" className="w-full h-full" style={{ opacity: op }}>
      <line x1="8" y1="90" x2="152" y2="90" stroke={c} strokeWidth="0.8" opacity="0.25"/>
      {/* Cabinet body */}
      <rect x="30" y="20" width="100" height="70" rx="4" fill={bg} stroke={c} strokeWidth="1.6"/>
      {/* Top lid */}
      <rect x="34" y="16" width="92" height="8" rx="2" fill={dim} stroke={c} strokeWidth="1"/>
      {/* Display screen */}
      <rect x="38" y="28" width="50" height="28" rx="2" fill={dim}/>
      {busy && <rect x="38" y="28" width="50" height="28" rx="2" fill={c} opacity="0.2"/>}
      <line x1="40" y1="36" x2="86" y2="36" stroke={c} strokeWidth="0.8" opacity="0.4"/>
      <line x1="40" y1="42" x2="80" y2="42" stroke={c} strokeWidth="0.8" opacity="0.3"/>
      <line x1="40" y1="48" x2="76" y2="48" stroke={c} strokeWidth="0.8" opacity="0.25"/>
      {/* Control buttons */}
      {[0,1,2].map((i) => (
        <circle key={i} cx={96 + i * 10} cy="35" r="3.5"
          fill={i === 0 && busy ? c : dim}
          stroke={c} strokeWidth="0.8"/>
      ))}
      {/* Larger gear / rotating element */}
      <g className={busy ? "dt-gear" : ""} style={{ transformOrigin: "96px 66px" }}>
        <circle cx="96" cy="66" r="14" fill="none" stroke={c} strokeWidth="1.2" opacity="0.5"/>
        <circle cx="96" cy="66" r="6" fill={dim} stroke={c} strokeWidth="1"/>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={96 + Math.cos(a)*7} y1={66 + Math.sin(a)*7}
              x2={96 + Math.cos(a)*13} y2={66 + Math.sin(a)*13}
              stroke={c} strokeWidth="3.5" strokeLinecap="round"
            />
          );
        })}
      </g>
      {/* Feet */}
      <rect x="36" y="88" width="10" height="5" rx="1" fill={c} opacity="0.4"/>
      <rect x="114" y="88" width="10" height="5" rx="1" fill={c} opacity="0.4"/>
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
