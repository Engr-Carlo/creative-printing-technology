"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Flame, AlertTriangle, Clock, ListOrdered } from "lucide-react";
import { getSJFQueue, type SJFEntry } from "@/app/actions/sjf";

function AgingIcon({ tier }: { tier: string }) {
  if (tier === "CRITICAL") return <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />;
  if (tier === "AGING")    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
}

export function NextJobBanner() {
  const [top, setTop]         = useState<SJFEntry | null>(null);
  const [total, setTotal]     = useState(0);
  const [loaded, setLoaded]   = useState(false);
  const [, start]             = useTransition();

  useEffect(() => {
    start(async () => {
      const data = await getSJFQueue();
      setTop(data[0] ?? null);
      setTotal(data.length);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="px-4 py-2 border-b bg-white animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!top) {
    return (
      <div className="px-4 py-2 border-b bg-white flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <ListOrdered className="w-4 h-4" />
          No active jobs in queue
        </span>
        <Link
          href="/dashboard/queue"
          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
        >
          View Queue <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const isCritical = top.agingTier === "CRITICAL";

  return (
    <div
      className={`animate-fade-slide-up px-4 py-2 border-b flex items-center justify-between gap-4 ${
        isCritical ? "bg-red-50 border-b-red-200" : "bg-white"
      }`}
    >
      {/* Left: label */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 shrink-0">
          Next Job
        </span>
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
            isCritical ? "bg-red-500 text-white" : "bg-orange-500 text-white"
          }`}
        >
          1
        </span>

        {/* Job name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <AgingIcon tier={top.agingTier} />
          <span className="font-mono text-[11px] font-bold text-blue-600 shrink-0">{top.itemNumber}</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{top.name}</span>
          <span className="text-xs text-gray-400 shrink-0">— {top.customer}</span>
        </div>
      </div>

      {/* Right: score + queue link */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-gray-400 leading-none">P(j)</div>
          <div className={`font-mono text-sm font-bold ${isCritical ? "text-red-600" : "text-orange-600"}`}>
            {top.priorityScore >= 999_999 ? "∞" : top.priorityScore.toLocaleString("en-US", { maximumFractionDigits: 1 })}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 hidden sm:block">{total} in queue</span>
        <Link
          href="/dashboard/queue"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[11px] font-semibold transition-colors shadow-sm"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          View Queue
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
