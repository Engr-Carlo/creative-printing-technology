"use client";

import { useState, useTransition } from "react";
import { updateRawMaterials } from "@/app/actions/items";

const RAW_MATERIAL_OPTIONS = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "DONE", label: "Done", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "PROCESSING", label: "Processing", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "SHORT", label: "Short", color: "bg-red-100 text-red-800 border-red-300" },
];

export function RawMaterialsSelect({
  itemId,
  currentStatus,
}: {
  itemId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  const currentOption = RAW_MATERIAL_OPTIONS.find((o) => o.value === status);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateRawMaterials(itemId, newStatus);
      if (result.error) {
        setStatus(currentStatus); // revert on error
        alert(result.error);
      }
    });
  };

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs font-semibold rounded-md border px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 ${currentOption?.color || "bg-gray-100 text-gray-800 border-gray-300"}`}
    >
      {RAW_MATERIAL_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function RawMaterialsBadge({ status }: { status: string }) {
  const option = RAW_MATERIAL_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${option?.color || "bg-gray-100 text-gray-800 border-gray-300"}`}
    >
      {option?.label || status}
    </span>
  );
}
