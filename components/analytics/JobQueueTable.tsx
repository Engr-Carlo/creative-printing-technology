"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { RefreshCw, Flame, AlertTriangle, Clock, PackageX } from "lucide-react";
import { getSJFQueue, type SJFEntry } from "@/app/actions/sjf";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtScore(score: number): string {
  if (score >= 999_999) return "∞";
  return score.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AgingBadge({ tier, hours }: { tier: string; hours: number }) {
  if (tier === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
        <Flame className="w-3 h-3 shrink-0" />
        {hours.toFixed(1)}h — Critical
      </span>
    );
  }
  if (tier === "AGING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        {hours.toFixed(1)}h — Aging
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-gray-500 bg-gray-50 border border-gray-200">
      <Clock className="w-3 h-3 shrink-0" />
      {hours.toFixed(1)}h
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  SHEETED:   "bg-blue-50   text-blue-700   border-blue-200",
  FOLDED:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  STITCHING: "bg-purple-50  text-purple-700  border-purple-200",
};

const RM_LABEL: Record<string, { label: string; cls: string }> = {
  AVAILABLE:             { label: "Available",         cls: "text-green-600" },
  RELEASE_TO_PRODUCTION: { label: "Released",          cls: "text-blue-600"  },
  NOT_SUFFICIENT:        { label: "Low Stock",         cls: "text-amber-600" },
  OUT_OF_STOCK:          { label: "Out of Stock",      cls: "text-red-600"   },
  APPROVAL:              { label: "Pending Approval",  cls: "text-orange-600"},
};

// ─── Formula Display ─────────────────────────────────────────────────────────

function FormulaCard() {
  return (
    <div
      className="animate-fade-slide-up bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      style={{ animationDelay: "0ms" }}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Priority Formula — Shortest Job First with Aging
      </h2>

      {/* Main formula */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* P(j) = */}
        <span className="text-3xl font-light text-gray-800 tracking-tight">P(j) =</span>

        {/* B over t */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-light text-gray-800 leading-none pb-1">B</span>
          <div className="w-full h-px bg-gray-700" />
          <span className="text-2xl font-light text-gray-800 leading-none pt-1">t</span>
        </div>

        {/* + r · w */}
        <span className="text-3xl font-light text-gray-800 tracking-tight">+ r · w</span>
      </div>

      {/* Variable legend */}
      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-[12px]">
        <div>
          <dt className="font-semibold text-gray-700">B = 1000</dt>
          <dd className="text-gray-400">base weight</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-700">t = est. duration (min)</dt>
          <dd className="text-gray-400">processing time</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-700">r = 20</dt>
          <dd className="text-gray-400">aging rate</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-700">w = wait (hrs)</dt>
          <dd className="text-gray-400">time in queue</dd>
        </div>
      </dl>

      {/* Starvation note */}
      <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex items-start gap-2">
        <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-gray-500">
          <span className="font-semibold text-gray-700">Starvation prevention:</span>{" "}
          if w ≥ 8 h then P → ∞ (job is pinned to the top of the queue regardless of duration).
          Aging threshold: 4 h (amber) → 8 h (red, critical).
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function JobQueueTable() {
  const [queue, setQueue]     = useState<SJFEntry[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [isPending, start]    = useTransition();
  const [lastRefresh, setLast] = useState<Date | null>(null);

  const load = useCallback(() => {
    start(async () => {
      const data = await getSJFQueue();
      setQueue(data);
      setLoaded(true);
      setLast(new Date());
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const criticalCount = queue.filter((j) => j.agingTier === "CRITICAL").length;
  const agingCount    = queue.filter((j) => j.agingTier === "AGING").length;

  return (
    <div className="space-y-5 p-6">
      {/* Formula */}
      <FormulaCard />

      {/* Stats row + Refresh */}
      <div
        className="animate-fade-slide-up flex flex-wrap items-center justify-between gap-3"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {queue.length} job{queue.length !== 1 ? "s" : ""} in queue
          </span>
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold animate-pulse">
              <Flame className="w-3 h-3" />
              {criticalCount} critical
            </span>
          )}
          {agingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {agingCount} aging
            </span>
          )}
          {lastRefresh && (
            <span className="text-gray-400">
              Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>

        <button
          onClick={load}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Computing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div
        className="animate-fade-slide-up bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        style={{ animationDelay: "140ms" }}
      >
        {!loaded ? (
          <div className="py-16 text-center text-gray-400 text-sm animate-pulse">
            Computing priority scores…
          </div>
        ) : queue.length === 0 ? (
          <div className="py-16 text-center">
            <PackageX className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-400">No jobs in queue</p>
            <p className="text-xs text-gray-400 mt-1">All items are completed or no items are active.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-10">#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Job</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Est. Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Wait</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Score P(j)</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Processes</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Deadline</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.map((job, i) => {
                  const isCritical = job.agingTier === "CRITICAL";
                  const isFirst    = i === 0;
                  const deadlineDate = new Date(job.deadline);
                  const isOverdue    = deadlineDate < new Date();
                  const rmInfo = RM_LABEL[job.rawMaterials] ?? { label: job.rawMaterials, cls: "text-gray-500" };

                  return (
                    <tr
                      key={job.id}
                      className={`animate-row-in transition-colors ${
                        isCritical ? "bg-red-50/60" : isFirst ? "bg-orange-50/40" : "hover:bg-gray-50/70"
                      }`}
                      style={{ animationDelay: `${160 + i * 40}ms` }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          isFirst
                            ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                            : isCritical
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {i + 1}
                        </span>
                      </td>

                      {/* Job info */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] font-bold text-blue-600 mb-0.5">
                          {job.itemNumber}
                        </div>
                        <div className="font-medium text-gray-800 truncate max-w-[180px]">{job.name}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{job.customer}</div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                          TYPE_STYLES[job.type] ?? "bg-gray-50 text-gray-600 border-gray-200"
                        }`}>
                          {job.type.charAt(0) + job.type.slice(1).toLowerCase()}
                        </span>
                      </td>

                      {/* Est. duration */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-gray-700 text-[13px]">
                          {fmtDuration(job.estimatedDuration)}
                        </span>
                      </td>

                      {/* Wait / aging */}
                      <td className="px-4 py-3">
                        <AgingBadge tier={job.agingTier} hours={job.waitingHours} />
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`animate-score-pop font-mono text-[15px] font-bold tabular-nums ${
                            isCritical
                              ? "text-red-600"
                              : isFirst
                              ? "text-orange-600"
                              : "text-gray-700"
                          }`}
                          style={{ animationDelay: `${200 + i * 40}ms` }}
                        >
                          {fmtScore(job.priorityScore)}
                        </span>
                      </td>

                      {/* Processes */}
                      <td className="px-4 py-3 text-center">
                        <div className="text-[12px] font-mono text-gray-600">
                          {job.completedProcesses}/{job.processCount}
                        </div>
                        {job.processCount > 0 && (
                          <div className="mt-1 h-1.5 w-16 mx-auto bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                job.completedProcesses === job.processCount
                                  ? "bg-green-500"
                                  : "bg-orange-400"
                              }`}
                              style={{
                                width: `${Math.round((job.completedProcesses / job.processCount) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3">
                        <span className={`text-[12px] ${isOverdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {deadlineDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {isOverdue && (
                          <div className="text-[10px] text-red-500 font-semibold">Overdue</div>
                        )}
                      </td>

                      {/* Materials */}
                      <td className="px-4 py-3">
                        <span className={`text-[12px] font-medium ${rmInfo.cls}`}>
                          {rmInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      {loaded && queue.length > 0 && (
        <p
          className="animate-fade-in text-[11px] text-gray-400 text-center"
          style={{ animationDelay: `${200 + queue.length * 40 + 100}ms` }}
        >
          Jobs are sorted by descending P(j). Ties are resolved by earliest deadline first.
        </p>
      )}
    </div>
  );
}
