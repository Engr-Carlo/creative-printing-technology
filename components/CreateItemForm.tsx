"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem } from "@/app/actions/items";
import { useEffect } from "react";

const initialState = {
  error: "",
};

type Department = {
  id: string;
  name: string;
};

const ITEM_TYPES = [
  { value: "FOLDED", label: "Folded" },
  { value: "SHEETED", label: "Sheeted" },
  { value: "STITCHING", label: "Stitching" },
];

const RAW_MATERIAL_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "DONE", label: "Done" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHORT", label: "Short" },
];

export function CreateItemForm({ departments }: { departments: Department[] }) {
  const [state, formAction] = useFormState(createItem, initialState);

  useEffect(() => {
    if (state.error) {
      alert(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="itemNumber">
            Item Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="itemNumber"
            name="itemNumber"
            placeholder="e.g. #ITEM1001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Item Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Premium Box Package"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="type"
            name="type"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Type</option>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">
            Customer <span className="text-red-500">*</span>
          </Label>
          <Input
            id="customer"
            name="customer"
            placeholder="Customer Name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentId">
            Department <span className="text-red-500">*</span>
          </Label>
          <select
            id="departmentId"
            name="departmentId"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" placeholder="e.g. Single Color Black, 2 Colors" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">
            Quantity <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            placeholder="1000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetOutput">
            Target Output <span className="text-red-500">*</span>
          </Label>
          <Input
            id="targetOutput"
            name="targetOutput"
            type="number"
            min="1"
            placeholder="1000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">
            Deadline <span className="text-red-500">*</span>
          </Label>
          <Input
            id="deadline"
            name="deadline"
            type="datetime-local"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rawMaterials">
            Raw Materials Status <span className="text-red-500">*</span>
          </Label>
          <select
            id="rawMaterials"
            name="rawMaterials"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Status</option>
            {RAW_MATERIAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <Button type="submit" size="lg">
          Create Item
        </Button>
      </div>
    </form>
  );
}
