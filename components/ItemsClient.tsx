"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Package, AlertCircle } from "lucide-react";
import { RawMaterialsSelect, RawMaterialsBadge } from "@/components/RawMaterialsSelect";

export interface ItemRow {
  id: string;
  itemNumber: string;
  name: string;
  type: string;
  status: string;
  currentOutput: number;
  targetOutput: number;
  rawMaterials: string;
  department: { name: string };
  processes: { status: string }[];
}

const TYPE_TABS = [
  { value: "ALL",       label: "All Types",  color: "bg-gray-800 text-white" },
  { value: "SHEETED",   label: "Sheeted",    color: "bg-blue-500   text-white" },
  { value: "FOLDED",    label: "Folded",     color: "bg-emerald-500 text-white" },
  { value: "STITCHING", label: "Stitching",  color: "bg-purple-500 text-white" },
] as const;

const STATUS_FILTERS = [
  { value: "ALL",         label: "All"         },
  { value: "PENDING",     label: "Pending"     },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED",   label: "Completed"   },
  { value: "REJECTED",    label: "Rejected"    },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-800 border-yellow-300",
  IN_PROGRESS: "bg-blue-100   text-blue-800   border-blue-300",
  COMPLETED:   "bg-green-100  text-green-800  border-green-300",
  REJECTED:    "bg-red-100    text-red-800    border-red-300",
};

export function ItemsClient({ items, isAdmin }: { items: ItemRow[]; isAdmin: boolean }) {
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.itemNumber.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.department.name.toLowerCase().includes(q);
      const matchType   = typeFilter   === "ALL" || item.type   === typeFilter;
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

  const counts = useMemo(() => ({
    ALL:         items.length,
    SHEETED:     items.filter((i) => i.type === "SHEETED").length,
    FOLDED:      items.filter((i) => i.type === "FOLDED").length,
    STITCHING:   items.filter((i) => i.type === "STITCHING").length,
  }), [items]);
  const needsRelease = useMemo(() =>
    items.filter((i) => (i.rawMaterials === "AVAILABLE" || i.rawMaterials === "APPROVAL") && i.status === "PENDING").length
  , [items]);
  return (
    <div className="space-y-3">
      {/* QA Release Banner */}
      {isAdmin && needsRelease > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">{needsRelease} item{needsRelease > 1 ? "s" : ""} awaiting QA release</p>
            <p className="text-xs text-orange-600 mt-0.5">Change the Release Status to “Release to Production” so line leaders can begin.</p>
          </div>
        </div>
      )}

      {/* Search + Status filter bar */}}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search item #, name, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-1" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === s.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 border-b pb-3">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              typeFilter === t.value
                ? t.color + " shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              typeFilter === t.value ? "bg-white/20" : "bg-gray-100 text-gray-400"
            }`}>
              {t.value === "ALL"
                ? counts.ALL
                : counts[t.value as keyof typeof counts]}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-400 self-center">
          {filtered.length} of {items.length} items
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-2 px-3 font-bold">Item #</th>
                <th className="text-left py-2 px-3 font-bold">Name</th>
                <th className="text-left py-2 px-3 font-bold">Type</th>
                <th className="text-left py-2 px-3 font-bold">Dept</th>
                <th className="text-left py-2 px-3 font-bold text-orange-300">Release Status</th>
                <th className="text-left py-2 px-3 font-bold">Job Status</th>
                <th className="text-left py-2 px-3 font-bold">Proc.</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Package className="w-8 h-8 mb-2 text-gray-200" />
                      <p className="text-sm font-medium">No items match your filters</p>
                      <button
                        onClick={() => { setSearch(""); setTypeFilter("ALL"); setStatusFilter("ALL"); }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const total       = item.processes.length;
                  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING;

                  return (
                    <tr key={item.id} className="border-b hover:bg-orange-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-primary">{item.itemNumber}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{item.name}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.type === "SHEETED"   ? "bg-blue-100   text-blue-700"   :
                          item.type === "FOLDED"    ? "bg-emerald-100 text-emerald-700" :
                                                      "bg-purple-100  text-purple-700"
                        }`}>{item.type}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{item.department.name}</span>
                      </td>
                      <td className="py-2 px-3">
                        {isAdmin
                          ? <RawMaterialsSelect itemId={item.id} currentStatus={item.rawMaterials} />
                          : <RawMaterialsBadge status={item.rawMaterials} />}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusStyle}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">{total}</span>
                      </td>
                      <td className="py-2 px-3">
                        <Link href={`/dashboard/items/${item.id}`}
                          className="text-[10px] font-bold text-primary hover:text-orange-700 hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
