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
            placeholder="ITM-001"
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
            placeholder="Business Cards"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Type <span className="text-red-500">*</span>
          </Label>
          <Input
            id="type"
            name="type"
            placeholder="Printing, Packaging, etc."
            required
          />
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
          <Input id="color" name="color" placeholder="CMYK, RGB, etc." />
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

        <div className="space-y-2 md:col-span-2">
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
      </div>

      <div className="flex gap-4 justify-end">
        <Button type="submit">Create Item</Button>
      </div>
    </form>
  );
}
