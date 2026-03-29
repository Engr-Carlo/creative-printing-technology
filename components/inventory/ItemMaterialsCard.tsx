"use client";

import { useState, useTransition } from "react";
import { PackageCheck, AlertTriangle, XCircle, CheckCircle2, Rocket, CheckCheck } from "lucide-react";
import { releaseItemToProduction } from "@/app/actions/inventory";

type MaterialUsage = {
  id: string;
  requiredQty: number;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
  };
};

type ProcessMaterial = {
  id: string;
  name: string;
  order: number;
  status: string;
  materialUsages: MaterialUsage[];
};

function stockStatus(requiredQty: number, currentStock: number) {
  if (currentStock <= 0)
    return { label: "Out of Stock", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle };
  if (currentStock < requiredQty)
    return { label: "Insufficient", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: AlertTriangle };
  return { label: "Sufficient", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 };
}

export function ItemMaterialsCard({
  itemId,
  processes,
  rawMaterials,
  isAdmin,
}: {
  itemId: string;
  processes: ProcessMaterial[];
  rawMaterials: string;
  isAdmin: boolean;
}) {
  const [releaseWarning, setReleaseWarning] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isReleased = rawMaterials === "RELEASE_TO_PRODUCTION";

  const processesWithMaterials = processes.filter((p) => p.materialUsages.length > 0);

  // Check stock sufficiency only for processes not yet completed
  const pendingMaterials = processesWithMaterials.flatMap((p) =>
    p.status !== "COMPLETED" && p.status !== "REJECTED" ? p.materialUsages : []
  );
  const allSufficient =
    pendingMaterials.length === 0 ||
    pendingMaterials.every((u) => u.inventoryItem.currentStock >= u.requiredQty);

  async function handleRelease() {
    setGlobalError(null);
    setReleaseWarning(null);
    const result = await releaseItemToProduction(itemId);
    if (result.error) { setGlobalError(result.error); return; }
    if (result.warning) setReleaseWarning(result.warning);
    startTransition(() => { window.location.reload(); });
  }

  if (processesWithMaterials.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 border rounded-xl bg-gray-50">
        <PackageCheck className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        <p className="text-sm">No material requirements for this job.</p>
        <p className="text-xs mt-1">Materials are auto-assigned when a job is generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {globalError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{globalError}</p>
      )}
      {releaseWarning && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          ⚠ {releaseWarning}
        </p>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Process</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Material</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Required</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">In Stock</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {processesWithMaterials.map((process) =>
              process.materialUsages.map((usage, mIdx) => {
                const isDone = process.status === "COMPLETED" || process.status === "REJECTED";
                const s = isDone
                  ? { label: "Deducted", color: "bg-gray-100 text-gray-500 border-gray-300", icon: CheckCheck }
                  : stockStatus(usage.requiredQty, usage.inventoryItem.currentStock);
                const SIcon = s.icon;
                return (
                  <tr key={usage.id} className={`border-b ${isDone ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                    {mIdx === 0 && (
                      <td
                        className="py-2.5 px-3 font-semibold text-gray-700 align-top"
                        rowSpan={process.materialUsages.length}
                      >
                        <span className="text-xs font-bold">{process.name}</span>
                        {isDone && (
                          <span className="ml-1.5 text-[10px] text-green-600 font-normal">✓ done</span>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-gray-900">{usage.inventoryItem.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {usage.requiredQty} {usage.inventoryItem.unit}
                    </td>
                    <td className={`py-2.5 px-3 ${isDone ? "text-gray-400 line-through" : "text-gray-600"}`}>
                      {usage.inventoryItem.currentStock} {usage.inventoryItem.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
                        <SIcon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {!isReleased && (
            <button
              onClick={handleRelease}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                allSufficient ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              <Rocket className="w-4 h-4" />
              {allSufficient ? "Release to Production" : "Release (Low Stock Warning)"}
            </button>
          )}
          {isReleased && (
            <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <CheckCircle2 className="w-4 h-4" />
              Released to Production — materials deduct as each process completes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

