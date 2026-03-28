"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, PackageCheck, AlertTriangle, XCircle, CheckCircle2, X, Rocket } from "lucide-react";
import {
  addItemMaterialRequirement,
  removeItemMaterialRequirement,
  releaseItemToProduction,
} from "@/app/actions/inventory";

type InventoryOption = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
};

type MaterialUsage = {
  id: string;
  requiredQty: number;
  inventoryItem: InventoryOption;
};

function materialStatus(usage: MaterialUsage) {
  const stock = usage.inventoryItem.currentStock;
  if (stock <= 0)
    return { label: "Out of Stock", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle };
  if (stock < usage.requiredQty)
    return { label: "Insufficient", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: AlertTriangle };
  return { label: "Sufficient", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 };
}

export function ItemMaterialsCard({
  itemId,
  initialUsages,
  inventoryOptions,
  rawMaterials,
  isAdmin,
}: {
  itemId: string;
  initialUsages: MaterialUsage[];
  inventoryOptions: InventoryOption[];
  rawMaterials: string;
  isAdmin: boolean;
}) {
  const [usages, setUsages] = useState(initialUsages);
  const [addOpen, setAddOpen] = useState(false);
  const [releaseWarning, setReleaseWarning] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isReleased = rawMaterials === "RELEASE_TO_PRODUCTION";

  // Which inventory items are not yet added
  const alreadyLinked = new Set(usages.map((u) => u.inventoryItem.id));
  const availableOptions = inventoryOptions.filter((o) => !alreadyLinked.has(o.id));

  const allSufficient = usages.length > 0 && usages.every(
    (u) => u.inventoryItem.currentStock >= u.requiredQty
  );

  async function handleRemove(inventoryItemId: string) {
    const result = await removeItemMaterialRequirement(itemId, inventoryItemId);
    if (result.error) { setGlobalError(result.error); return; }
    setUsages((prev) => prev.filter((u) => u.inventoryItem.id !== inventoryItemId));
  }

  async function handleRelease() {
    setGlobalError(null);
    setReleaseWarning(null);
    const result = await releaseItemToProduction(itemId);
    if (result.error) { setGlobalError(result.error); return; }
    if (result.warning) setReleaseWarning(result.warning);
    startTransition(() => { window.location.reload(); });
  }

  // ── Add Requirement Dialog ─────────────────────────────────────────────
  function AddDialog() {
    const [selectedId, setSelectedId] = useState("");
    const [qty, setQty] = useState("1");
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const selected = inventoryOptions.find((o) => o.id === selectedId);

    async function handleAdd() {
      if (!selectedId) { setErr("Select a material"); return; }
      const q = parseFloat(qty);
      if (!q || q <= 0) { setErr("Enter a valid quantity"); return; }
      setPending(true);
      const result = await addItemMaterialRequirement(itemId, selectedId, q);
      setPending(false);
      if (result.error) { setErr(result.error); return; }
      // Optimistically update local state
      const added = inventoryOptions.find((o) => o.id === selectedId)!;
      setUsages((prev) => [
        ...prev,
        { id: `${itemId}-${selectedId}`, requiredQty: q, inventoryItem: added },
      ]);
      setAddOpen(false);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-bold text-gray-900">Add Material Requirement</h3>
            <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
            {availableOptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">All inventory materials are already linked.</p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">Material</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    <option value="">Select material…</option>
                    {availableOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.currentStock} {o.unit} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                {selected && (
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500">
                      Required Qty ({selected.unit})
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Current stock: {selected.currentStock} {selected.unit}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setAddOpen(false)}
                    className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={pending || !selectedId}
                    className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {pending ? "Adding…" : "Add"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {addOpen && <AddDialog />}

      <div className="space-y-3">
        {globalError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{globalError}</p>
        )}
        {releaseWarning && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            ⚠ {releaseWarning}
          </p>
        )}

        {/* Material Requirements List */}
        {usages.length === 0 ? (
          <div className="py-8 text-center text-gray-400 border rounded-xl bg-gray-50">
            <PackageCheck className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No materials linked to this job.</p>
            {isAdmin && !isReleased && (
              <p className="text-xs mt-1">Add requirements below to enable inventory checking.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Material</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Required</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">In Stock</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  {isAdmin && !isReleased && <th className="py-2.5 px-3"></th>}
                </tr>
              </thead>
              <tbody>
                {usages.map((usage) => {
                  const s = materialStatus(usage);
                  const SIcon = s.icon;
                  return (
                    <tr key={usage.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {usage.inventoryItem.name}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {usage.requiredQty} {usage.inventoryItem.unit}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {usage.inventoryItem.currentStock} {usage.inventoryItem.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
                          <SIcon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      {isAdmin && !isReleased && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleRemove(usage.inventoryItem.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action buttons */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {!isReleased && (
              <button
                onClick={() => setAddOpen(true)}
                disabled={availableOptions.length === 0}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Add Requirement
              </button>
            )}

            {!isReleased && usages.length > 0 && (
              <button
                onClick={handleRelease}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  allSufficient
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                <Rocket className="w-4 h-4" />
                {allSufficient ? "Release to Production" : "Release (Insufficient Stock)"}
              </button>
            )}

            {isReleased && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <CheckCircle2 className="w-4 h-4" />
                Released to Production — materials deducted
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
