"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Flame, AlertTriangle, Clock } from "lucide-react";
import type { SJFEntry } from "@/app/actions/sjf";

// ─── Fraction with animated bar drawing left-to-right ───────────────────────

function Fraction({
  num,
  den,
  drawBar,
}: {
  num: React.ReactNode;
  den: React.ReactNode;
  drawBar: boolean;
}) {
  return (
    <div className="inline-flex flex-col items-center min-w-max">
      <span className="font-mono text-xl leading-tight pb-0.5">{num}</span>
      <span
        className={`block h-[1.5px] w-full bg-gray-800 origin-left transition-transform duration-500 ease-out ${
          drawBar ? "scale-x-100" : "scale-x-0"
        }`}
      />
      <span className="font-mono text-xl leading-tight pt-0.5">{den}</span>
    </div>
  );
}

// ─── Reveal wrapper — fades in and lifts up when phase threshold is met ──────

function Reveal({
  children,
  show,
  className = "",
}: {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none select-none"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Main overlay component ──────────────────────────────────────────────────

interface Props {
  newJobs: SJFEntry[];
  onClose: () => void;
}

export function SJFComputationOverlay({ newJobs, onClose }: Props) {
  const [jobIdx, setJobIdx] = useState(0);
  // phases: 0=formula  1=substitution  2=arithmetic  3=result
  const [phase, setPhase]   = useState(0);

  const job        = newJobs[jobIdx];
  const t          = job.estimatedDuration > 0 ? job.estimatedDuration : 120;
  const bp         = 1000 / t;                        // base priority
  const ab         = job.waitingHours * 20;            // aging bonus
  const rawScore   = Math.round((bp + ab) * 100) / 100;
  const isCritical = job.agingTier === "CRITICAL";
  const isAging    = job.agingTier === "AGING";

  // Auto-advance phases 0 → 1 → 2 → 3, then stop
  useEffect(() => {
    if (phase >= 3) return;
    const id = setTimeout(() => setPhase((p) => p + 1), 700);
    return () => clearTimeout(id);
  }, [phase]);

  // Reset animation when navigating between jobs
  function navigate(idx: number) {
    setJobIdx(idx);
    setPhase(0);
  }

  function goNext() {
    if (jobIdx < newJobs.length - 1) navigate(jobIdx + 1);
    else onClose();
  }

  function goPrev() {
    if (jobIdx > 0) navigate(jobIdx - 1);
  }

  const scoreColor =
    isCritical ? "text-red-600" : isAging ? "text-amber-500" : "text-gray-900";

  const tierBadge =
    isCritical
      ? "bg-red-50 border-red-200 text-red-700"
      : isAging
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";

  const TierIcon  = isCritical ? Flame : isAging ? AlertTriangle : Clock;
  const tierLabel = isCritical ? "Critical" : isAging ? "Aging" : "Fresh";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-[460px] flex flex-col overflow-hidden animate-fade-slide-up">

        {/* Progress strip — fills as phases advance */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-orange-400 transition-all duration-700 ease-out"
            style={{ width: `${(phase / 3) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
              SJF · Priority Computation
            </p>
            <h2 className="text-sm font-bold text-gray-900 mt-0.5">
              {newJobs.length === 1
                ? "1 New Job Detected"
                : `${newJobs.length} New Jobs Detected`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Computation body */}
        <div className="px-6 py-5 space-y-5 flex-1" style={{ minHeight: 320 }}>

          {/* Job identity — always visible */}
          <div className="pb-4 border-b border-dashed border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] font-bold text-blue-600 tracking-widest">
                {job.itemNumber}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                {job.type.charAt(0) + job.type.slice(1).toLowerCase()}
              </span>
            </div>
            <p className="font-semibold text-gray-900 leading-tight">{job.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{job.customer}</p>
          </div>

          {/* Phase 0 — Abstract formula */}
          <Reveal show={phase >= 0}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Formula
            </p>
            <div className="flex items-center gap-2 text-xl font-light text-gray-700">
              <span>P(j) =</span>
              <Fraction
                num={<span className="text-gray-600">B</span>}
                den={<span className="text-gray-600">t</span>}
                drawBar={phase >= 0}
              />
              <span>+ r · w</span>
            </div>
          </Reveal>

          {/* Phase 1 — Substituted values */}
          <Reveal show={phase >= 1}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Substitution
            </p>
            <div className="flex items-center gap-2 text-xl font-light text-gray-700">
              <span>P(j) =</span>
              <Fraction
                num={<span className="font-bold text-gray-900">1000</span>}
                den={<span className="font-bold text-gray-900">{t}</span>}
                drawBar={phase >= 1}
              />
              <span>+ 20 ×</span>
              <span className="font-mono font-bold text-gray-900">
                {job.waitingHours.toFixed(1)}
              </span>
            </div>
          </Reveal>

          {/* Phase 2 — Arithmetic breakdown */}
          <Reveal show={phase >= 2}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Arithmetic
            </p>
            <div className="flex items-center gap-2 text-xl font-light text-gray-700">
              <span>P(j) =</span>
              <span className="font-mono font-medium text-gray-900">{bp.toFixed(2)}</span>
              <span>+</span>
              <span className="font-mono font-medium text-gray-900">{ab.toFixed(2)}</span>
            </div>
          </Reveal>

          {/* Phase 3 — Final result */}
          <Reveal show={phase >= 3}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Result
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-light text-gray-700">P(j) =</span>
                <span
                  className={`font-mono text-3xl font-bold animate-score-pop ${scoreColor}`}
                >
                  {isCritical
                    ? "∞"
                    : rawScore.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${tierBadge}`}
              >
                <TierIcon
                  className={`w-3 h-3 ${isCritical ? "animate-pulse" : ""}`}
                />
                {tierLabel} · {job.waitingHours.toFixed(1)}h
              </span>
            </div>
            {isCritical && (
              <p className="text-[11px] text-red-400 mt-1.5 italic">
                Starvation prevention applied — score floated to ∞
              </p>
            )}
          </Reveal>
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={jobIdx === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-white hover:text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {newJobs.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === jobIdx
                    ? "w-5 h-2 bg-orange-500"
                    : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-colors shadow-sm"
          >
            {jobIdx < newJobs.length - 1 ? "Next Job" : "View Queue"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
