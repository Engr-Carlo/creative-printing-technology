"use client";

import { useEffect, useState, useRef } from "react";
import { Activity, Zap, Cpu } from "lucide-react";
import type { SJFEntry } from "@/app/actions/sjf";

// ── AnimatedCount — scrambles to target value ─────────────────────────────────
function AnimatedCount({
  target,
  active,
  decimals = 0,
  suffix = "",
}: {
  target: number;
  active: boolean;
  decimals?: number;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const DURATION = 900;

  useEffect(() => {
    if (!active) return;
    startRef.current = performance.now();

    function tick(now: number) {
      const t = Math.min((now - startRef.current) / DURATION, 1);
      if (t >= 1) {
        setVal(target);
        return;
      }
      // Scramble: random noise shrinks as t → 1
      const scramble = t < 0.75 ? (Math.random() * 2 - 1) * target * (1 - t) * 0.8 : 0;
      setVal(target * t + scramble);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target]);

  const display = Math.max(0, val).toLocaleString("en-US", { maximumFractionDigits: decimals });
  return <>{display}{suffix}</>;
}

// ── TypeWriter — reveals text character by character ─────────────────────────
function TypeWriter({
  text,
  active,
  speed = 18,
  className = "",
}: {
  text: string;
  active: boolean;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!active) { setShown(""); return; }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      if (i >= text.length) { clearInterval(id); return; }
      setShown(text.slice(0, ++i));
    }, speed);
    return () => clearInterval(id);
  }, [active, text, speed]);

  return (
    <span className={`font-mono ${className}`}>
      {shown}
      <span className="inline-block w-[5px] h-[13px] ml-[2px] bg-green-400 align-middle animate-[pulse_0.65s_ease-in-out_infinite]" />
    </span>
  );
}

// ── ScoreRow — one job's score with a bar ────────────────────────────────────
function ScoreRow({
  job,
  maxScore,
  active,
  delay,
}: {
  job: SJFEntry;
  maxScore: number;
  active: boolean;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [active, delay]);

  const rawScore =
    job.agingTier === "CRITICAL" ? job.priorityScore - 999_999 : job.priorityScore;
  const pct = maxScore > 0 ? Math.min((rawScore / maxScore) * 100, 100) : 0;
  const barColor =
    job.agingTier === "CRITICAL"
      ? "bg-red-400"
      : job.agingTier === "AGING"
      ? "bg-amber-400"
      : "bg-cyan-400";

  return (
    <div
      className={`transition-all duration-300 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
    >
      <div className="flex items-center gap-2 text-[10px] font-mono mb-0.5">
        <span className="text-gray-500 w-[60px] truncate">{job.itemNumber}</span>
        <div className="flex-1 h-[3px] rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: visible ? `${pct}%` : "0%" }}
          />
        </div>
        <span className="text-green-300 w-[48px] text-right">
          {job.agingTier === "CRITICAL" ? "∞" : rawScore.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  newJobs: SJFEntry[];
  onClose: () => void;
}

const TOTAL_MS = 5000;

export function SJFComputationOverlay({ newJobs, onClose }: Props) {
  const [phase, setPhase] = useState(0);       // 0=scan 1=metrics 2=scores 3=done
  const [progressPct, setProgressPct] = useState(100); // countdown bar

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const totalJobs     = newJobs.length;
  const totalMin      = newJobs.reduce((s, j) => s + Math.max(j.estimatedDuration, 1), 0);
  const criticalCount = newJobs.filter((j) => j.agingTier === "CRITICAL").length;
  const agingCount    = newJobs.filter((j) => j.agingTier === "AGING").length;
  const maxRealScore  = Math.max(
    1,
    ...newJobs.map((j) =>
      j.agingTier === "CRITICAL" ? j.priorityScore - 999_999 : j.priorityScore
    )
  );
  const totalHours  = Math.floor(totalMin / 60);
  const totalMinsR  = totalMin % 60;
  const loadLabel   = totalHours > 0 ? `${totalHours}h ${totalMinsR}m` : `${totalMin}m`;

  // Show top-5 jobs in the score breakdown
  const topFive = newJobs.slice(0, 5);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => onCloseRef.current(), TOTAL_MS),
    ];

    const startTs = performance.now();
    let raf: number;
    function tick() {
      const elapsed = performance.now() - startTs;
      setProgressPct(Math.max(0, 100 - (elapsed / TOTAL_MS) * 100));
      if (elapsed < TOTAL_MS) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, []);

  const secondsLeft = Math.ceil((progressPct / 100) * (TOTAL_MS / 1000));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-[500px] rounded-2xl overflow-hidden shadow-2xl animate-fade-slide-up"
        style={{
          background: "linear-gradient(160deg, #06101c 0%, #091520 55%, #0b1a1a 100%)",
          border: "1px solid rgba(74,222,128,0.22)",
          boxShadow: "0 0 50px rgba(74,222,128,0.07), 0 30px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Countdown strip */}
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-green-400"
            style={{ width: `${progressPct}%`, transition: "none" }}
          />
        </div>

        {/* Header row */}
        <div className="px-5 pt-3.5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-green-400 animate-sjf-flicker" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[3px] text-green-400 animate-sjf-flicker">
              SJF · Priority Engine
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-green-400/50">{secondsLeft}s</span>
            <button
              onClick={onClose}
              className="text-[10px] font-mono text-gray-600 hover:text-green-400 transition-colors px-1.5 py-0.5 rounded border border-white/10 hover:border-green-400/40"
            >
              [ESC]
            </button>
          </div>
        </div>

        {/* Phase 0 — Typewriter scan ────────────────────────────────────────*/}
        <div className="px-5 py-3 border-t border-green-400/10 relative overflow-hidden">
          <div className="animate-sjf-scan" />
          <p className="text-[8px] font-mono text-green-400/35 uppercase tracking-[3px] mb-1.5">
            &gt;_ ANALYZE · COMPUTE · SCHEDULE
          </p>
          <TypeWriter
            text={`Queue scan: ${totalJobs} job${totalJobs !== 1 ? "s" : ""} detected${criticalCount > 0 ? ` · ${criticalCount} CRITICAL` : ""}${agingCount > 0 ? ` · ${agingCount} aging` : ""} — SJF dispatch initiated`}
            active={phase >= 0}
            speed={16}
            className="text-green-300 text-[12px]"
          />
        </div>

        {/* Phase 1 — Aggregate metric cards ───────────────────────────────────*/}
        {phase >= 1 && (
          <div className="px-5 py-3 border-t border-green-400/10 grid grid-cols-4 gap-2">
            {[
              {
                label: "JOBS",
                value: totalJobs,
                decimals: 0,
                suffix: "",
                color: "text-cyan-400",
              },
              {
                label: "LOAD",
                value: totalHours > 0 ? totalHours + totalMinsR / 60 : totalMin,
                decimals: totalHours > 0 ? 1 : 0,
                suffix: totalHours > 0 ? "h" : "m",
                color: "text-yellow-400",
              },
              {
                label: "CRITICAL",
                value: criticalCount,
                decimals: 0,
                suffix: "",
                color: criticalCount > 0 ? "text-red-400" : "text-gray-600",
              },
              {
                label: "AGING",
                value: agingCount,
                decimals: 0,
                suffix: "",
                color: agingCount > 0 ? "text-amber-400" : "text-gray-600",
              },
            ].map(({ label, value, decimals, suffix, color }) => (
              <div
                key={label}
                className="rounded-lg px-2 py-2 text-center"
                style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)" }}
              >
                <p className="text-[7px] font-mono text-green-400/35 uppercase tracking-[2px] mb-0.5">
                  {label}
                </p>
                <p className={`text-[22px] leading-tight font-mono font-bold ${color}`}>
                  <AnimatedCount
                    target={value}
                    active={phase >= 1}
                    decimals={decimals}
                    suffix={suffix}
                  />
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Phase 2 — Priority score breakdown (top 5) ─────────────────────────*/}
        {phase >= 2 && (
          <div className="px-5 py-3 border-t border-green-400/10">
            <p className="text-[8px] font-mono text-green-400/35 uppercase tracking-[3px] mb-2">
              &gt;_ COMPUTING SJF PRIORITY SCORES · P(j) = 1000/t + 20×w
            </p>
            <div className="space-y-1">
              {topFive.map((job, i) => (
                <ScoreRow
                  key={job.id}
                  job={job}
                  maxScore={maxRealScore}
                  active={phase >= 2}
                  delay={i * 140}
                />
              ))}
              {newJobs.length > 5 && (
                <p className="text-[9px] font-mono text-green-400/30 mt-1">
                  + {newJobs.length - 5} more job{newJobs.length - 5 !== 1 ? "s" : ""} computed
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase 3 — Queue ready ──────────────────────────────────────────────*/}
        {phase >= 3 && (
          <div className="px-5 py-3 border-t border-green-400/10 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-green-400 animate-pulse shrink-0" />
            <span className="font-mono text-[11px] text-green-400 font-bold uppercase tracking-wide">
              {totalJobs} job{totalJobs !== 1 ? "s" : ""} scheduled · {loadLabel} total production load
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2 border-t border-green-400/8 flex items-center justify-between">
          <span className="text-[8px] font-mono text-gray-700 tracking-widest">
            BASE:1000 · AGING:20pts/hr · STARVATION:8h
          </span>
          <Activity className="w-3 h-3 text-green-400/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
