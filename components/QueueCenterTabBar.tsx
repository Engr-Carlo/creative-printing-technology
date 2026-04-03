"use client";

import Link from "next/link";
import { Activity, Monitor } from "lucide-react";

interface Props {
  activeTab: "constraints" | "live";
  isAdmin: boolean;
}

export function QueueCenterTabBar({ activeTab, isAdmin }: Props) {
  return (
    <div className="bg-white border-b -mx-4 -mt-4 px-5 py-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Queue Center</p>
        <h1 className="text-xl font-black text-gray-900">Queue Analysis</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {activeTab === "live" ? "Real-time arrival & service rates per process step" : "M/M/1 & M/M/2 utilization constraints by process stage"}
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/dashboard/queue-analysis?tab=constraints"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "constraints"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          Constraint Analysis
        </Link>

        {isAdmin && (
          <Link
            href="/dashboard/queue-analysis?tab=live"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "live"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Monitor className="w-4 h-4" />
            Live Monitor
          </Link>
        )}
      </div>
    </div>
  );
}
