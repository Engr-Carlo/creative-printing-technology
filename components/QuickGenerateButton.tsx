"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickGenerateItem } from "@/app/actions/items";
import { Zap, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "SHEETED", label: "Sheeted", desc: "Printing → Pre-Fold → Trimming → Inspection" },
  { value: "FOLDED",  label: "Folded",  desc: "Printing → Pre-Fold → Trimming → Folding → Inspection" },
  { value: "STITCHING", label: "Stitching", desc: "Printing → Pre-Fold → Trimming → Folding → Stitching → Inspection" },
];

export function QuickGenerateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ itemId: string; itemNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    type: "SHEETED",
    name: "",
    customer: "",
    quantity: "1",
    targetOutput: "0",
    color: "",
    rawMaterials: "NOT_AVAILABLE",
    deadline: defaultDeadline,
  });

  function handleOpen() {
    setOpen(true);
    setGenerated(null);
    setError(null);
    setForm({ type: "SHEETED", name: "", customer: "", quantity: "1", targetOutput: "0", color: "", rawMaterials: "NOT_AVAILABLE", deadline: defaultDeadline });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await quickGenerateItem({
        type: form.type,
        name: form.name,
        customer: form.customer,
        quantity: parseInt(form.quantity) || 1,
        targetOutput: parseInt(form.targetOutput) || 0,
        color: form.color || undefined,
        rawMaterials: form.rawMaterials,
        deadline: form.deadline || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setGenerated({ itemId: result.itemId!, itemNumber: result.itemNumber! });
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoToItem() {
    setOpen(false);
    router.push(`/dashboard/items/${generated!.itemId}`);
  }

  function handleGoToEmployee() {
    setOpen(false);
    router.push(`/dashboard/employee`);
    router.refresh();
  }

  const selectedType = TYPES.find((t) => t.value === form.type);

  return (
    <>
      <Button onClick={handleOpen} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
        <Zap className="w-4 h-4" />
        Generate Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Generate Manual Item
            </DialogTitle>
          </DialogHeader>

          {generated ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Item generated successfully!</p>
                <p className="text-xl font-bold font-mono text-green-700 mt-1">{generated.itemNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoToEmployee} className="flex-1">
                  Open Line Leader View
                </Button>
                <Button onClick={handleGoToItem} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  View Item
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gen-qty" className="text-xs font-bold uppercase text-gray-500">Quantity</Label>
                  <Input
                    id="gen-qty"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gen-target" className="text-xs font-bold uppercase text-gray-500">Target Output</Label>
                  <Input
                    id="gen-target"
                    type="number"
                    min="0"
                    value={form.targetOutput}
                    onChange={(e) => setForm((f) => ({ ...f, targetOutput: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="gen-color" className="text-xs font-bold uppercase text-gray-500">Color</Label>
                <Input
                  id="gen-color"
                  placeholder="e.g. Full Color, Black & White"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gen-raw" className="text-xs font-bold uppercase text-gray-500">Raw Materials</Label>
                  <select
                    id="gen-raw"
                    value={form.rawMaterials}
                    onChange={(e) => setForm((f) => ({ ...f, rawMaterials: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="NOT_AVAILABLE">Not Available</option>
                    <option value="AVAILABLE">Available</option>
                  </select>
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
