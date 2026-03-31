"use client";

import { useState } from "react";
import { Cog, Monitor, BarChart2, Clock, CheckCircle } from "lucide-react";
import { ProcessStatusButton } from "@/components/ProcessStatusButton";
import ProcessNoteCell from "@/components/ProcessNoteCell";
import { ProcessQueueDrawer } from "@/components/ProcessQueueDrawer";

const processStatusColors: Record<string, string> = {
  COMPLETED: "bg-green-500 text-white",
  IN_PROGRESS: "bg-blue-500 text-white",
  DELAYED: "bg-orange-500 text-white",
  NOT_STARTED: "bg-gray-200 text-gray-600",
  REJECTED: "bg-red-500 text-white",
};

const processStatusLabels: Record<string, string> = {
  COMPLETED: "Done",
  IN_PROGRESS: "On-Going",
  DELAYED: "Delayed",
  NOT_STARTED: "Pending",
  REJECTED: "Rejected",
};

interface Process {
  id: string;
  name: string;
  order: number;
  status: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  machine?: { name: string } | null;
  notes?: { id: string; content: string; createdAt: Date; user: { name: string } }[];
}

interface Props {
  itemId: string;
  itemType: string;
  itemStatus: string;
  rawMaterials: string;
  processes: Process[];
  /** When true, Accept/Reject is hidden (admin view) */
  readOnly?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  SHEETED: "Sheeted",
  FOLDED: "Folded",
  STITCHING: "Stitching",
};

export function ProcessEvaluationPanel({ itemId, itemType, itemStatus, rawMaterials, processes, readOnly = false }: Props) {
  const [drawerProcessId, setDrawerProcessId] = useState<string | null>(null);
  const [drawerTypeName, setDrawerTypeName] = useState<string>("");

  const openDrawer = (processId: string, typeName: string) => {
    setDrawerProcessId(processId);
    setDrawerTypeName(typeName);
  };

  const closeDrawer = () => setDrawerProcessId(null);

  return (
    <>
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <Cog className="w-3 h-3" />
            Process Evaluation — {TYPE_LABELS[itemType] || itemType}
          </p>
          <p className="text-[10px] text-gray-500">
            {processes.filter((p) => p.status === "COMPLETED").length}/{processes.length} complete
          </p>
        </div>

        <div className="p-3 space-y-2">
          {processes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs">
              No processes defined for this item
            </div>
          ) : (
            processes.map((proc, idx) => {
              const itemRejected = itemStatus === "REJECTED";
              const rawNotReady = rawMaterials !== "RELEASE_TO_PRODUCTION";
              const prevProc = idx > 0 ? processes[idx - 1] : null;
              const prevNotDone = prevProc && prevProc.status !== "COMPLETED";
              const anyPrevRejected = processes.slice(0, idx).some((p) => p.status === "REJECTED");

              let processLocked = false;
              let lockReason = "";

              if (proc.status === "NOT_STARTED") {
                if (itemRejected || anyPrevRejected) {
                  processLocked = true;
                  lockReason = "Item rejected";
                } else if (rawNotReady) {
                  processLocked = true;
                  lockReason = rawMaterials === "APPROVAL" ? "Raw materials pending approval" : "Raw materials not available";
                } else if (prevNotDone) {
                  processLocked = true;
                  lockReason = `Complete "${prevProc!.name}" first`;
                }
              }

              return (
                <div
                  key={proc.id}
                  className={`rounded-lg border-2 transition-all ${
                    proc.status === "IN_PROGRESS" ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100" :
                    proc.status === "COMPLETED"   ? "border-green-200 bg-green-50/50" :
                    proc.status === "REJECTED"    ? "border-red-200 bg-red-50/50" :
                    proc.status === "DELAYED"     ? "border-orange-200 bg-orange-50/50" :
                    processLocked               ? "border-gray-200 bg-gray-50 opacity-60" :
                    "border-gray-200 bg-white"
                  }`}
                >
                  <div className="p-3 flex items-center gap-3">
                    <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      proc.status === "IN_PROGRESS" ? "bg-blue-500 text-white" :
                      proc.status === "COMPLETED"   ? "bg-green-500 text-white" :
                      proc.status === "REJECTED"    ? "bg-red-500 text-white" :
                      proc.status === "DELAYED"     ? "bg-orange-400 text-white" :
                      "bg-gray-200 text-gray-500"
                    }`}>{proc.order}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold text-sm ${
                          proc.status === "IN_PROGRESS" ? "text-blue-900" :
                          proc.status === "COMPLETED"   ? "text-green-900" :
                          proc.status === "REJECTED"    ? "text-red-900" :
                          "text-gray-700"
                        }`}>{proc.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${processStatusColors[proc.status]}`}>
                          {processStatusLabels[proc.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-2.5 h-2.5" />
                          {proc.machine?.name || "—"}
                        </span>
                        {proc.startedAt && (
                          <span className="flex items-center gap-1 text-blue-500">
                            <Clock className="w-2.5 h-2.5" />
                            Started {new Date(proc.startedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {proc.completedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Done {new Date(proc.completedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {/* Queue analysis icon */}
                      <button
                        title="View queue analysis for this process type"
                        onClick={() => openDrawer(proc.id, proc.name)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>

                      <ProcessStatusButton
                        processId={proc.id}
                        currentStatus={proc.status}
                        processName={proc.name}
                        prominent={proc.status === "IN_PROGRESS" || proc.status === "DELAYED"}
                        locked={processLocked}
                        lockReason={lockReason}
                      />
                      <ProcessNoteCell processId={proc.id} notes={proc.notes || []} />
                    </div>
                  </div>

                  {proc.status === "IN_PROGRESS" && (
                    <div className="px-3 pb-3">
                      <div className="bg-blue-100 border border-blue-200 rounded-md px-3 py-2">
                        <p className="text-[11px] text-blue-700 font-semibold">
                          ▶ Active — inspect this process and click COMPLETE to pass or REJECT to fail it.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Queue Analysis Drawer */}
      <ProcessQueueDrawer
        processId={drawerProcessId ?? ""}
        itemId={itemId}
        processTypeName={drawerTypeName}
        isOpen={!!drawerProcessId}
        onClose={closeDrawer}
        readOnly={readOnly}
      />
    </>
  );
}
