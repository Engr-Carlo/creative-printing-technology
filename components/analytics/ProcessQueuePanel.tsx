"use client";

import { useState, useTransition, useEffect } from "react";
import { ChevronRight, Clock, AlertCircle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { getProcessQueueData, ProcessQueueEntry, ProcessQueueMetrics } from "@/app/actions/analytics";
import { PROCESS_TEMPLATES } from "@/lib/constants/processes";

const ITEM_TYPES = [
  { value: "SHEETED",   label: "Sheeted" },
  { value: "FOLDED",    label: "Folded" },
  { value: "STITCHING", label: "Stitching" },
];

const statusConfig = {
  NOT_STARTED: { label: "Not Started", color: "bg-gray-100 text-gray-700",    icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800",    icon: Activity },
  COMPLETED:   { label: "Completed",   color: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  DELAYED:     { label: "Delayed",     color: "bg-orange-100 text-orange-800",icon: AlertCircle },
  REJECTED:    { label: "Rejected",    color: "bg-red-100 text-red-800",      icon: XCircle },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProcessQueuePanel() {
  const [selectedType, setSelectedType]       = useState("SHEETED");
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [filterHours, setFilterHours]         = useState<1 | 0.5>(1);
  const [queueData, setQueueData]             = useState<{
    entries: ProcessQueueEntry[];
    metrics: ProcessQueueMetrics;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const processes = PROCESS_TEMPLATES[selectedType] ?? [];

  // When type changes → auto-select first process
  useEffect(() => {
    setSelectedProcess(processes[0] ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  // When selected process or filter changes → fetch data
  useEffect(() => {
    if (!selectedProcess) return;
    startTransition(async () => {
      const data = await getProcessQueueData(selectedProcess, filterHours, selectedType);
      setQueueData(data);
    });
  }, [selectedProcess, filterHours, selectedType]);

  const metrics = queueData?.metrics;
  const entries = queueData?.entries ?? [];
  const completionPct =
    metrics && metrics.total > 0
      ? Math.round((metrics.completed / metrics.total) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {/* Item Type Tabs */}
      <div className="flex gap-2">
        {ITEM_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedType(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
              selectedType === t.value
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pipeline Navigator */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-0 min-w-max">
          {processes.map((name, index) => (
            <div key={name} className="flex items-center">
              <button
                onClick={() => setSelectedProcess(name)}
                className={`flex flex-col items-center justify-center w-40 h-16 rounded-lg border-2 transition-all font-semibold ${
                  selectedProcess === name
                    ? "border-orange-500 bg-orange-500 text-white shadow-md"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <span className="text-[10px] font-normal opacity-70 mb-0.5">
                  Process {index + 1}
                </span>
                <span className="text-xs font-bold leading-tight text-center px-2">{name}</span>
              </button>

              {index < processes.length - 1 && (
                <ChevronRight className="w-6 h-6 text-gray-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue Panel */}
      {selectedProcess && (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white">

          {/* Header: title + filter + metrics */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b bg-gray-50/80">
            {/* Title */}
            <div className="shrink-0">
              <span className="text-sm font-bold text-gray-900">{selectedProcess}</span>
              <span className="ml-2 text-xs text-gray-400 font-medium capitalize">
                {selectedType.charAt(0) + selectedType.slice(1).toLowerCase()}
              </span>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Filter Toggle */}
              <div className="flex rounded-lg border overflow-hidden text-xs font-semibold bg-white">
                <button
                  onClick={() => setFilterHours(1)}
                  className={`px-3 py-1.5 transition-colors ${
                    filterHours === 1 ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  1 hr
                </button>
                <button
                  onClick={() => setFilterHours(0.5)}
                  className={`px-3 py-1.5 border-l transition-colors ${
                    filterHours === 0.5 ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  30 min
                </button>
              </div>

              {/* Metric Cards */}
              {[
                {
                  label: "Arrival Rate",
                  value: metrics != null ? `${metrics.arrivalRate}/hr` : "—",
                  color: "text-blue-600",
                },
                {
                  label: "Service Rate",
                  value: metrics != null ? `${metrics.serviceRate}/hr` : "—",
                  color: "text-green-600",
                },
                {
                  label: "Server Utilization",
                  value: metrics != null ? `${metrics.utilization}%` : "—",
                  color: "text-purple-600",
                },
                {
                  label: "Avg Waiting Time",
                  value: metrics != null ? `${metrics.avgWaitingTime} min` : "—",
                  color: "text-orange-600",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex flex-col items-center px-3 py-1.5 rounded-lg border bg-white min-w-[76px]"
                >
                  <span className={`text-sm font-bold ${m.color}`}>{m.value}</span>
                  <span className="text-[9px] text-gray-400 text-center leading-tight mt-0.5">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-2.5 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${completionPct}%` }}
                >
                  {completionPct > 10 && (
                    <span className="text-[10px] font-bold text-white">{completionPct}%</span>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                {metrics ? `${metrics.completed}/${metrics.total}` : "0/0"}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isPending ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-2" />
                Loading queue...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No job requests at this stage yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">JR #</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Name</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Arrival Time</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Time</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion Time</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wait</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const sCfg = statusConfig[entry.status as keyof typeof statusConfig];
                    const SIcon = sCfg?.icon ?? Clock;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b transition-colors ${
                          entry.status === "IN_PROGRESS"
                            ? "bg-blue-50/50"
                            : entry.status === "COMPLETED"
                            ? "bg-green-50/30"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono text-xs font-bold text-gray-600">
                          JR {i + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-xs font-semibold text-gray-900 leading-tight">
                            {entry.itemName}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {entry.jrNumber}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                          {fmtTime(entry.arrivalTime)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                          {fmtTime(entry.startTime)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                          {fmtTime(entry.completionTime)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                          {entry.waitingMinutes !== null
                            ? `${entry.waitingMinutes} min`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sCfg?.color ?? "bg-gray-100 text-gray-600"}`}
                          >
                            <SIcon className="w-3 h-3" />
                            {sCfg?.label ?? entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
