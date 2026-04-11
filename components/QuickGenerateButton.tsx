"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickGenerateItem } from "@/app/actions/items";
import { getMachineNames } from "@/app/actions/machines";
import { Zap, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "SHEETED", label: "Sheeted", desc: "Cutting -> Printing -> Pre-Fold -> Trimming -> Inspection" },
  { value: "FOLDED",  label: "Folded",  desc: "Cutting -> Printing -> Pre-Fold -> Trimming -> Folding -> Inspection" },
  { value: "STITCHING", label: "Stitching", desc: "Cutting -> Printing -> Pre-Fold -> Trimming -> Folding -> Stitching -> Inspection" },
];

export function QuickGenerateButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ itemId: string; itemNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbMachines, setDbMachines] = useState<{ name: string; type: string }[]>([]);

  const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    type: "SHEETED",
    name: "",
    customer: "",
    quantity: "1",
    targetOutput: "501",
    estimatedDuration: "",
    color: "",
    deadline: defaultDeadline,
    machines: [] as string[],
  });

  // Keep targetOutput in sync when quantity changes (auto = qty + 500)
  function handleQtyChange(val: string) {
    const qty = parseInt(val) || 1;
    setForm((f) => ({ ...f, quantity: val, targetOutput: String(qty + 500) }));
  }

  function handleOpen() {
    setOpen(true);
    setGenerated(null);
    setError(null);
    const qty = 1;
    setForm({ type: "SHEETED", name: "", customer: "", quantity: "1", targetOutput: String(qty + 500), estimatedDuration: "", color: "", deadline: defaultDeadline, machines: [] });
    getMachineNames().then(setDbMachines).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const qty = parseInt(form.quantity) || 1;
      const targetOutput = parseInt(form.targetOutput) || qty + 500;
      const result = await quickGenerateItem({
        type: form.type,
        name: form.name,
        customer: form.customer,
        quantity: qty,
        targetOutput,
        color: form.color || undefined,
        rawMaterials: "AVAILABLE",
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
        deadline: form.deadline || undefined,
        machines: form.machines.length > 0 ? form.machines.join(", ") : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success && result.itemId) {
        setGenerated({ itemId: result.itemId, itemNumber: result.itemNumber! });
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-dismiss 2.5 s after item is generated
  useEffect(() => {
    if (!generated) return;
    const t = setTimeout(() => setOpen(false), 2500);
    return () => clearTimeout(t);
  }, [generated]);

  const selectedType = TYPES.find((t) => t.value === form.type);

  return (
    <>
      <Button onClick={handleOpen} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
        <Zap className="w-4 h-4" />
        Generate Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Generate Manual Item
            </DialogTitle>
          </DialogHeader>

          {generated ? (
            <div className="py-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Item created successfully!</p>
                <p className="text-2xl font-black font-mono text-green-700 mt-1">{generated.itemNumber}</p>
                <p className="text-xs text-gray-400 mt-2">Closing in a moment…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Item Type *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      className={`p-2 rounded-lg border-2 text-left transition-colors ${
                        form.type === t.value
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-bold text-sm">{t.label}</p>
                    </button>
                  ))}
                </div>
                {selectedType && (
                  <p className="text-[10px] text-gray-500">{selectedType.desc}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-name" className="text-xs font-bold uppercase text-gray-500">Job Name *</Label>
                <Input
                  id="gen-name"
                  placeholder="e.g. Product Brochure"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-customer" className="text-xs font-bold uppercase text-gray-500">Customer *</Label>
                <Input
                  id="gen-customer"
                  placeholder="e.g. ABC Corp"
                  value={form.customer}
                  onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                  required
                />
              </div>

              {/* Quantity + Target Output side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gen-qty" className="text-xs font-bold uppercase text-gray-500">Quantity</Label>
                  <Input
                    id="gen-qty"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => handleQtyChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gen-target" className="text-xs font-bold uppercase text-gray-500">
                    Actual Output
                    <span className="normal-case text-gray-400 font-normal ml-1">(auto = qty+500)</span>
                  </Label>
                  <Input
                    id="gen-target"
                    type="number"
                    min="1"
                    value={form.targetOutput}
                    onChange={(e) => setForm((f) => ({ ...f, targetOutput: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-duration" className="text-xs font-bold uppercase text-gray-500">Estimated Duration (minutes) <span className="normal-case text-gray-400 font-normal">— optional</span></Label>
                <Input
                  id="gen-duration"
                  type="number"
                  min="1"
                  placeholder="e.g. 120"
                  value={form.estimatedDuration}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedDuration: e.target.value }))}
                />
                <p className="text-[10px] text-gray-400">Used by the SJF scheduler for priority ordering.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-color" className="text-xs font-bold uppercase text-gray-500">Color</Label>
                <select
                  id="gen-color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select Color</option>
                  <option value="Single Color Black">Single Color Black</option>
                  <option value="Two Colors">Two Colors</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Machine</Label>
                <div className="flex flex-wrap gap-3">
                  {dbMachines.map((machine) => (
                    <label key={machine.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.machines.includes(machine.name)}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            machines: e.target.checked
                              ? [...f.machines, machine.name]
                              : f.machines.filter((m) => m !== machine.name),
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm">{machine.name} <span className="text-xs text-gray-400">({machine.type})</span></span>
                    </label>
                  ))}
                  {dbMachines.length === 0 && (
                    <p className="text-xs text-gray-400">No machines found</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-deadline" className="text-xs font-bold uppercase text-gray-500">Deadline</Label>
                <Input
                  id="gen-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Generate
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
