"use client";

import { useState, useEffect, useTransition } from "react";
import { getSJFQueue, SJFEntry } from "@/app/actions/sjf";
import { Cpu, Flame, AlertTriangle, Clock, Trophy, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// Simulated computation log lines — give the feeling of live scheduling
const LOG_LINES = [
  "Fetching active job queue…",
  "Computing priority scores…",
  "Applying SJF base weights…",
  "Checking aging thresholds…",
  "Detecting starvation risk…",
  "Applying aging bonus (+20/hr)…",
  "Pinning critical jobs to top…",
  "Sorting by priority score…",
  "Queue ready.",
];

function ComputationLog({ running }: { running: boolean }) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!running) return;
    setLines([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < LOG_LINES.length) {
        setLines((prev) => [...prev, LOG_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 180);
    return () => clearInterval(interval);
  }, [running]);

  if (!running && lines.length === 0) return null;

  return (
    <div className="font-mono text-[10px] bg-black/80 text-green-400 rounded-lg px-3 py-2.5 space-y-0.5 min-h-[60px]">
      {lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i === lines.length - 1 && running ? "animate-pulse" : ""}`}>
          <span className="text-green-600">&gt;</span>
          <span>{l}</span>
          {i === lines.length - 1 && running && (
            <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse ml-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

export function SJFSpotlight() {
  const [queue, setQueue] = useState<SJFEntry[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastRun, setLastRun] = useState<Date | null>(null);

  function runScheduler() {
    setComputing(true);
    startTransition(async () => {
      const data = await getSJFQueue();
      // Small delay so the log animation plays out
      await new Promise((r) => setTimeout(r, LOG_LINES.length * 180 + 300));
      setQueue(data);
      setLastRun(new Date());
      setComputing(false);
    });
  }

  // Auto-run on mount
  useEffect(() => { runScheduler(); }, []);

  const top3   = queue?.slice(0, 3) ?? [];
  const next   = top3[0] ?? null;
  const critical = queue?.filter((j) => j.agingTier === "CRITICAL").length ?? 0;
  const aging    = queue?.filter((j) => j.agingTier === "AGING").length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-orange-400 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl shadow-orange-900/20">

      {/* Animated scan line */}
      {computing && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent animate-[scan_1.5s_linear_infinite]"
            style={{ animation: "scan 1.5s linear infinite" }} />
        </div>
      )}

      {/* Corner glow when critical jobs exist */}
      {critical > 0 && !computing && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${computing ? "bg-orange-500 animate-pulse" : "bg-orange-500"}`}>
            <Cpu className="w-5 h-5 text-white" />
            {computing && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-900 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black">SJF Scheduler</h2>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                computing
                  ? "bg-green-500/20 border-green-500/50 text-green-400 animate-pulse"
                  : "bg-slate-700 border-slate-600 text-slate-400"
              }`}>
                {computing ? "● COMPUTING" : "● IDLE"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Shortest Job First · Aging-based starvation prevention</p>
          </div>
        </div>
        <button
          onClick={runScheduler}
          disabled={computing}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors"
        >
          <Zap className={`w-3 h-3 ${computing ? "animate-spin" : ""}`} />
          {computing ? "Running…" : "Re-compute"}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Computation log */}
        <ComputationLog running={computing} />

        {/* Results */}
        {!computing && queue !== null && (
          <>
            {/* Summary row */}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <span className="text-slate-400">Queue size</span>
                <span className="font-black text-white">{queue.length}</span>
              </div>
              {critical > 0 && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-1.5 animate-pulse">
                  <Flame className="w-3 h-3 text-red-400" />
                  <span className="font-black text-red-400">{critical} critical</span>
                </div>
              )}
              {aging > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span className="font-black text-yellow-400">{aging} aging</span>
                </div>
              )}
              {lastRun && (
                <div className="ml-auto flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  Computed {lastRun.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active jobs in queue.
              </div>
            ) : (
              <>
                {/* #1 Next Up — big spotlight */}
                {next && (
                  <div className={`relative rounded-xl overflow-hidden border ${
                    next.agingTier === "CRITICAL"
                      ? "border-red-500/60 bg-gradient-to-r from-red-900/40 to-slate-800/40"
                      : next.agingTier === "AGING"
                      ? "border-yellow-500/50 bg-gradient-to-r from-yellow-900/30 to-slate-800/40"
                      : "border-orange-500/50 bg-gradient-to-r from-orange-900/30 to-slate-800/40"
                  }`}>
                    {/* Subtle shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent pointer-events-none" />

                    <div className="relative flex flex-wrap items-center gap-3 p-3">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400">Next Job</p>
                          <p className="text-[10px] font-black text-orange-300">Rank #1</p>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white leading-tight truncate">{next.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{next.itemNumber} · {next.customer}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          next.type === "SHEETED"   ? "bg-blue-500/30 text-blue-300 border border-blue-500/40"   :
                          next.type === "FOLDED"    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40" :
                                                      "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                        }`}>{next.type}</span>
                        {next.agingTier === "CRITICAL" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40 font-bold animate-pulse">
                            <Flame className="w-2.5 h-2.5" /> CRITICAL
                          </span>
                        )}
                        <span className="text-slate-400">Est: <span className="text-white font-bold">{fmtDuration(next.estimatedDuration)}</span></span>
                        <span className="text-slate-400">Wait: <span className="text-white font-bold">{next.waitingHours.toFixed(1)}h</span></span>
                        <span className="text-orange-300 font-black">Score: {next.agingTier === "CRITICAL" ? "∞" : next.priorityScore.toFixed(1)}</span>
                      </div>

                      <Link
                        href={`/dashboard/items/${next.id}`}
                        className="flex-shrink-0 flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Work on This <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Rank #2 and #3 */}
                {top3.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {top3.slice(1).map((job, i) => (
                      <Link key={job.id} href={`/dashboard/items/${job.id}`}>
                        <div className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 transition-colors cursor-pointer">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                            i === 0 ? "bg-slate-400/30 text-slate-300" : "bg-amber-700/30 text-amber-400"
                          }`}>{i + 2}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{job.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{job.itemNumber}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {job.agingTier === "CRITICAL" && <Flame className="w-3 h-3 text-red-400 ml-auto mb-0.5" />}
                            {job.agingTier === "AGING" && <AlertTriangle className="w-3 h-3 text-yellow-400 ml-auto mb-0.5" />}
                            <p className="text-[9px] text-slate-500">Score</p>
                            <p className="text-[10px] font-black text-orange-400">{job.agingTier === "CRITICAL" ? "∞" : job.priorityScore.toFixed(1)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Footer: full queue link */}
                {queue.length > 3 && (
                  <p className="text-center text-[10px] text-slate-500 pt-1">
                    +{queue.length - 3} more jobs in queue ·{" "}
                    <Link href="/dashboard/analytics" className="text-orange-400 hover:underline font-bold">
                      View full queue →
                    </Link>
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Loading skeleton */}
        {computing && queue === null && (
          <div className="space-y-2 animate-pulse">
            <div className="h-16 bg-white/5 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 bg-white/5 rounded-xl" />
              <div className="h-12 bg-white/5 rounded-xl" />
            </div>
          </div>
        )}
      </div>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
