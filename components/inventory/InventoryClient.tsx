"use client";

import { useState, useTransition } from "react";
import {
  Package,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChevronDown,
  X,
} from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restockInventoryItem,
  adjustInventoryStock,
} from "@/app/actions/inventory";

type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  _count: { usages: number };
};

function stockStatus(item: InventoryItem) {
  if (item.currentStock <= 0)
    return { label: "Out of Stock", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle };
  if (item.currentStock < item.minStock)
    return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: AlertTriangle };
  return { label: "In Stock", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 };
}

// ─── Small reusable modal shell ────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Main InventoryClient ──────────────────────────────────────────────────
export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.unit.toLowerCase().includes(search.toLowerCase())
  );

  const outOfStock = items.filter((i) => i.currentStock <= 0).length;
  const lowStock = items.filter((i) => i.currentStock > 0 && i.currentStock < i.minStock).length;

  function refresh(updated: InventoryItem[]) {
    setItems(updated);
  }

  // ── Add Material ─────────────────────────────────────────────────────────
  function AddDialog() {
    const [form, setForm] = useState({ name: "", description: "", unit: "", currentStock: "0", minStock: "0" });
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleAdd() {
      if (!form.name.trim() || !form.unit.trim()) { setErr("Name and unit are required"); return; }
      setPending(true);
      const result = await createInventoryItem({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit: form.unit.trim(),
        currentStock: parseFloat(form.currentStock) || 0,
        minStock: parseFloat(form.minStock) || 0,
      });
      setPending(false);
      if (result.error) { setErr(result.error); return; }
      setAddOpen(false);
      startTransition(() => { window.location.reload(); });
    }

    return (
      <Modal title="Add New Material" onClose={() => setAddOpen(false)}>
        <div className="space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Material Name *</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Bond Paper 80gsm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Description</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Unit *</label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                <option value="">Select unit</option>
                {["reams", "sheets", "kg", "liters", "rolls", "pcs", "boxes", "cartons"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Initial Stock</label>
              <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Low-Stock Threshold</label>
            <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
              placeholder="System warns when stock falls below this" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAddOpen(false)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} disabled={pending}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2 text-sm font-semibold disabled:opacity-50">
              {pending ? "Adding…" : "Add Material"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Restock ───────────────────────────────────────────────────────────────
  function RestockDialog({ item }: { item: InventoryItem }) {
    const [qty, setQty] = useState("1");
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleRestock() {
      const q = parseFloat(qty);
      if (!q || q <= 0) { setErr("Enter a valid quantity"); return; }
      setPending(true);
      const result = await restockInventoryItem(item.id, q, note || undefined);
      setPending(false);
      if (result.error) { setErr(result.error); return; }
      setRestockTarget(null);
      startTransition(() => { window.location.reload(); });
    }

    return (
      <Modal title={`Restock — ${item.name}`} onClose={() => setRestockTarget(null)}>
        <div className="space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
          <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
            Current stock: <strong>{item.currentStock}</strong> {item.unit}
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Quantity to Add ({item.unit})</label>
            <input type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Note (optional)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery from supplier" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setRestockTarget(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleRestock} disabled={pending}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2 text-sm font-semibold disabled:opacity-50">
              {pending ? "Restocking…" : "Confirm Restock"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Adjust Stock ──────────────────────────────────────────────────────────
  function AdjustDialog({ item }: { item: InventoryItem }) {
    const [newStock, setNewStock] = useState(String(item.currentStock));
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleAdjust() {
      const s = parseFloat(newStock);
      if (isNaN(s) || s < 0) { setErr("Enter a valid stock value"); return; }
      setPending(true);
      const result = await adjustInventoryStock(item.id, s, note || undefined);
      setPending(false);
      if (result.error) { setErr(result.error); return; }
      setAdjustTarget(null);
      startTransition(() => { window.location.reload(); });
    }

    return (
      <Modal title={`Adjust Stock — ${item.name}`} onClose={() => setAdjustTarget(null)}>
        <div className="space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
          <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
            Current stock: <strong>{item.currentStock}</strong> {item.unit}
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Set Actual Stock ({item.unit})</label>
            <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={newStock} onChange={(e) => setNewStock(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Reason</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Stock count correction" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAdjustTarget(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdjust} disabled={pending}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm font-semibold disabled:opacity-50">
              {pending ? "Saving…" : "Set Stock"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function EditDialog({ item }: { item: InventoryItem }) {
    const [form, setForm] = useState({ name: item.name, description: item.description ?? "", unit: item.unit, minStock: String(item.minStock) });
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleEdit() {
      if (!form.name.trim() || !form.unit.trim()) { setErr("Name and unit are required"); return; }
      setPending(true);
      const result = await updateInventoryItem(item.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit: form.unit.trim(),
        minStock: parseFloat(form.minStock) || 0,
      });
      setPending(false);
      if (result.error) { setErr(result.error); return; }
      setEditTarget(null);
      startTransition(() => { window.location.reload(); });
    }

    return (
      <Modal title="Edit Material" onClose={() => setEditTarget(null)}>
        <div className="space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Name</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Description</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Unit</label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {["reams", "sheets", "kg", "liters", "rolls", "pcs", "boxes", "cartons"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Low-Stock Threshold</label>
              <input type="number" min="0" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditTarget(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleEdit} disabled={pending}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2 text-sm font-semibold disabled:opacity-50">
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Delete Confirm ────────────────────────────────────────────────────────
  function DeleteDialog({ item }: { item: InventoryItem }) {
    const [pending, setPending] = useState(false);

    async function handleDelete() {
      setPending(true);
      const result = await deleteInventoryItem(item.id);
      setPending(false);
      if (result.error) { setError(result.error); setDeleteTarget(null); return; }
      setDeleteTarget(null);
      startTransition(() => { window.location.reload(); });
    }

    return (
      <Modal title="Delete Material" onClose={() => setDeleteTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{item.name}</strong>? This cannot be undone.
            {item._count.usages > 0 && (
              <span className="block mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                ⚠ This material is linked to {item._count.usages} job request(s).
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} disabled={pending}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-semibold disabled:opacity-50">
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dialogs */}
      {addOpen && <AddDialog />}
      {restockTarget && <RestockDialog item={restockTarget} />}
      {adjustTarget && <AdjustDialog item={adjustTarget} />}
      {editTarget && <EditDialog item={editTarget} />}
      {deleteTarget && <DeleteDialog item={deleteTarget} />}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[10px] font-medium uppercase text-gray-400">Total Materials</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="rounded-xl border bg-yellow-50 p-4">
          <p className="text-[10px] font-medium uppercase text-yellow-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700">{lowStock}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4">
          <p className="text-[10px] font-medium uppercase text-red-500">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search materials…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No materials found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Material</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">In Stock</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Min Threshold</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">JRs Linked</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const s = stockStatus(item);
                const SIcon = s.icon;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900">{item.currentStock}</span>
                      <span className="ml-1 text-gray-400 text-xs">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
                        <SIcon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {item._count.usages > 0 ? (
                        <span className="bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-semibold">
                          {item._count.usages}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setRestockTarget(item)}
                          title="Restock"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAdjustTarget(item)}
                          title="Adjust Stock"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditTarget(item)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
