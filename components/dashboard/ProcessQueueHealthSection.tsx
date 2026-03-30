"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { ProcessQueueDrawer } from "@/components/ProcessQueueDrawer";

interface HealthTile {
  name: string;
  rho_mm1: number;
  rho_mm2: number;
  stable_mm1: boolean;
  insufficientData: boolean;
}

function RhoBadge({ rho, insufficient }: { rho: number; insufficient: boolean }) {
  if (insufficient || rho === 0)
    return <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">No data</span>;
  if (rho < 0.5)
    return <span className="text-[10px] font-bold text-green-700 px-2 py-0.5 rounded-full bg-green-100">ρ {rho.toFixed(2)} ✓</span>;
  if (rho <= 0.63)
    return <span className="text-[10px] font-bold text-yellow-700 px-2 py-0.5 rounded-full bg-yellow-100">ρ {rho.toFixed(2)} ⚠</span>;
  if (rho < 1)
    return <span className="text-[10px] font-bold text-orange-700 px-2 py-0.5 rounded-full bg-orange-100">ρ {rho.toFixed(2)} !</span>;
  return <span className="text-[10px] font-bold text-red-700 px-2 py-0.5 rounded-full bg-red-100">ρ {rho.toFixed(2)} ✕</span>;
}

export function ProcessQueueHealthSection({ tiles }: { tiles: HealthTile[] }) {
  const [activeProcessId] = useState("admin-view"); // static — admin doesn't need real processId
  const [drawerTypeName, setDrawerTypeName] = useState<string | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">Process Queue Health</h2>
            <span className="text-[10px] text-slate-400">— M/M/1 utilization, last 7 days</span>
          </div>
          <span className="text-[10px] text-slate-400">Click a stage to view analysis</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-0 divide-x divide-y">
          {tiles.map((tile) => {
            const isOverloaded = !tile.insufficientData && tile.rho_mm1 >= 1;
            const isWarning = !tile.insufficientData && tile.rho_mm1 >= 0.63 && tile.rho_mm1 < 1;
            return (
              <button
                key={tile.name}
                onClick={() => setDrawerTypeName(tile.name)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-colors hover:bg-gray-50 ${
                  isOverloaded ? "bg-red-50/50 hover:bg-red-50" :
                  isWarning    ? "bg-orange-50/50 hover:bg-orange-50" :
                  ""
                }`}
              >
                <p className="text-[11px] font-bold text-gray-700 leading-tight">{tile.name}</p>
                <RhoBadge rho={tile.rho_mm1} insufficient={tile.insufficientData} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawer — admin = readOnly */}
      <ProcessQueueDrawer
        processId={activeProcessId}
        itemId=""
        processTypeName={drawerTypeName ?? ""}
        isOpen={!!drawerTypeName}
        onClose={() => setDrawerTypeName(null)}
        readOnly={true}
      />
    </>
  );
}
