"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { getSJFQueue, SJFEntry } from "@/app/actions/sjf";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  SHEETED:  "bg-blue-100 text-blue-700",
  FOLDED:   "bg-emerald-100 text-emerald-700",
  STITCHING:"bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
};

const RM_COLORS: Record<string, string> = {
  AVAILABLE:             "text-green-600",
  RELEASE_TO_PRODUCTION: "text-blue-600",
  NOT_SUFFICIENT:        "text-yellow-600",
  OUT_OF_STOCK:          "text-red-600",
};

function AgingBadge({ tier, hours }: { tier: string; hours: number }) {
  if (tier === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
        <Flame className="w-3 h-3" />
        Critical · {hours.toFixed(1)}h
      </span>
    );
  }
  if (tier === "AGING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
        <AlertTriangle className="w-3 h-3" />
        Aging · {hours.toFixed(1)}h
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
      <Clock className="w-3 h-3" />
      {hours.toFixed(1)}h
    </span>
  );
}

function fmtDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SJFScheduler() {
  const [queue, setQueue] = useState<SJFEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  function load() {
    startTransition(async () => {
      const data = await getSJFQueue();
      setQueue(data);
      setLastRefresh(new Date());
    });
  }

  useEffect(() => { load(); }, []);

  const critical = queue.filter((j) => j.agingTier === "CRITICAL").length;
  const aging    = queue.filter((j) => j.agingTier === "AGING").length;
  const fresh    = queue.filter((j) => j.agingTier === "FRESH").length;
  const nextJob  = queue[0] ?? null;

  return (
    <div className="space-y-3">

      {/* Legend / Info bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">How priority is computed:</span>
        <code className="bg-gray-100 rounded px-2 py-0.5 text-[11px]">
          score = (1000 / est.duration) + (waiting_hrs × 20)
        </code>
        <span>Starvation prevention: +20 pts per hour → critical jobs (≥8h) are always first.</span>
        <button
          onClick={load}
          disabled={isPending}
          className="ml-auto flex items-center gap-1 text-orange-500 hover:text-orange-600 font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <span className="text-gray-400">
          Updated {lastRefresh.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <span className="font-semibold">{queue.length}</span>
          <span className="text-gray-400">jobs in queue</span>
        </div>
        {critical > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm animate-pulse">
            <Flame className="w-4 h-4 text-red-600" />
            <span className="font-bold text-red-700">{critical} critical</span>
            <span className="text-red-400">· waiting ≥8h</span>
          </div>
        )}
        {aging > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-700">{aging} aging</span>
            <span className="text-yellow-500">· 4–8h</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="font-semibold">{fresh}</span>
          <span className="text-gray-400">fresh</span>
        </div>
      </div>

      {/* Next-up spotlight */}
      {nextJob && (
        <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-bold uppercase text-orange-600 tracking-wide">Next Up</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{nextJob.name}</p>
            <p className="text-xs text-gray-500 font-mono">{nextJob.itemNumber} · {nextJob.customer}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[nextJob.type] ?? "bg-gray-100 text-gray-600"}`}>
              {nextJob.type}
            </span>
            <AgingBadge tier={nextJob.agingTier} hours={nextJob.waitingHours} />
            <span className="font-bold text-orange-600">Score: {nextJob.priorityScore.toFixed(1)}</span>
            <span className="text-gray-400">Est: {fmtDuration(nextJob.estimatedDuration)}</span>
          </div>
          <Link
            href={`/dashboard/items/${nextJob.id}`}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-semibold whitespace-nowrap"
          >
            View JR
          </Link>
        </div>
      )}

      {/* Queue table */}
      {isPending && queue.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-2" />
          Loading queue…
        </div>
      ) : queue.length === 0 ? (
        <div className="py-12 text-center text-gray-400 border rounded-xl">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">No active jobs in queue.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-8">Rank</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Job</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Est. Duration</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Waiting</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Priority Score</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Deadline</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Materials</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((job, i) => {
                const procPct = job.processCount > 0
                  ? Math.round((job.completedProcesses / job.processCount) * 100)
                  : 0;
                const isFirst = i === 0;
                const rmColor = RM_COLORS[job.rawMaterials] ?? "text-gray-400";
                const deadlineDays = Math.ceil(
                  (new Date(job.deadline).getTime() - Date.now()) / 86_400_000
                );
                const deadlineColor = deadlineDays <= 1 ? "text-red-600 font-bold" : deadlineDays <= 3 ? "text-yellow-600 font-semibold" : "text-gray-600";

                return (
                  <tr
                    key={job.id}
                    className={`border-b transition-colors ${
                      isFirst ? "bg-orange-50/60" :
                      job.agingTier === "CRITICAL" ? "bg-red-50/40" :
                      job.agingTier === "AGING"    ? "bg-yellow-50/30" :
                      "hover:bg-gray-50"
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isFirst ? "bg-orange-500 text-white" :
                        i === 1  ? "bg-gray-300 text-gray-700" :
                        i === 2  ? "bg-amber-200 text-amber-800" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {i + 1}
                      </span>
                    </td>

                    {/* Job */}
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-gray-900 leading-tight">{job.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{job.itemNumber}</p>
                      <p className="text-[10px] text-gray-400">{job.customer}</p>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[job.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {job.type}
                      </span>
                    </td>

                    {/* Est. Duration */}
                    <td className="py-2.5 px-3 text-gray-700 font-mono text-xs">
                      {fmtDuration(job.estimatedDuration)}
                    </td>

                    {/* Waiting */}
                    <td className="py-2.5 px-3">
                      <AgingBadge tier={job.agingTier} hours={job.waitingHours} />
                    </td>

                    {/* Priority Score */}
                    <td className="py-2.5 px-3">
                      <span className={`font-bold text-sm ${
                        isFirst ? "text-orange-600" :
                        job.agingTier === "CRITICAL" ? "text-red-600" :
                        job.agingTier === "AGING"    ? "text-yellow-600" :
                        "text-gray-700"
                      }`}>
                        {job.agingTier === "CRITICAL"
                          ? `∞` // show ∞ for critical (score is inflated)
                          : job.priorityScore.toFixed(1)}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-orange-400"
                            style={{ width: `${procPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{procPct}%</span>
                      </div>
                    </td>

                    {/* Deadline */}
                    <td className={`py-2.5 px-3 text-xs ${deadlineColor} whitespace-nowrap`}>
                      {new Date(job.deadline).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      {deadlineDays <= 3 && (
                        <span className="ml-1 text-[10px]">({deadlineDays}d)</span>
                      )}
                    </td>

                    {/* Materials */}
                    <td className={`py-2.5 px-3 text-xs font-semibold ${rmColor}`}>
                      {job.rawMaterials.replace(/_/g, " ")}
                    </td>

                    <td className="py-2.5 px-3">
                      <Link
                        href={`/dashboard/items/${job.id}`}
                        className="text-xs text-orange-500 hover:text-orange-700 font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
