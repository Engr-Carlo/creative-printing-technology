import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Cog, Monitor, CheckCircle2, ChevronRight } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ProcessStatusButton } from "@/components/ProcessStatusButton";
import ProcessNoteCell from "@/components/ProcessNoteCell";
import NoteSection from "@/components/NoteSection";

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  SHEETED: { label: "S", color: "bg-blue-500 text-white" },
  FOLDED: { label: "F", color: "bg-emerald-500 text-white" },
  STITCHING: { label: "St", color: "bg-purple-500 text-white" },
};

const TYPE_LABELS: Record<string, string> = {
  SHEETED: "Sheeted",
  FOLDED: "Folded",
  STITCHING: "Stitching",
};

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

async function getLineLeaderData() {
  const manualDept = await prisma.department.findFirst({ where: { type: "MANUAL" } });
  if (!manualDept) return { activeItems: [], completedItems: [], rejectedItems: [], deptName: "Manual Department" };

  const items = await prisma.item.findMany({
    where: { departmentId: manualDept.id },
    select: {
      id: true,
      name: true,
      itemNumber: true,
      status: true,
      currentOutput: true,
      targetOutput: true,
      deadline: true,
      customer: true,
      type: true,
      color: true,
      rawMaterials: true,
      processes: {
        select: {
          id: true,
          name: true,
          order: true,
          status: true,
          machine: { select: { name: true } },
          notes: {
            select: { id: true, content: true, createdAt: true, user: { select: { name: true } } },
            orderBy: { createdAt: "desc" as const },
            take: 5,
          },
        },
        orderBy: { order: "asc" },
      },
      notes: {
        select: { id: true, content: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" as const },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const activeItems = items.filter((i) => i.status !== "COMPLETED" && i.status !== "REJECTED");
  const completedItems = items.filter((i) => i.status === "COMPLETED");
  const rejectedItems = items.filter((i) => i.status === "REJECTED");

  return { activeItems, completedItems, rejectedItems, deptName: manualDept.name };
}

export default async function EmployeeDashboardPage(props: {
  searchParams: Promise<{ item?: string; showCompleted?: string; showRejected?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Role guard: only Line Leaders (EMPLOYEE role) can access
  if ((session.user as any).role !== "EMPLOYEE") redirect("/dashboard");

  const searchParams = await props.searchParams;
  const selectedItemId = searchParams.item;
  const showCompleted = searchParams.showCompleted === "1";
  const showRejected = searchParams.showRejected === "1";

  const { activeItems, completedItems, rejectedItems, deptName } = await getLineLeaderData();
  const allItems = [...activeItems, ...completedItems, ...rejectedItems];
  const selectedItem = selectedItemId ? allItems.find((i) => i.id === selectedItemId) : null;

  // Stats
  const allProc = allItems.flatMap((i) => i.processes);
  const completedProc = allProc.filter((p: { status: string }) => p.status === "COMPLETED").length;

  return (
    <div className="flex flex-col h-full">
      {/* Orange Header Bar */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold">Line Leader Dashboard</h1>
          <p className="text-[10px] opacity-80">{(deptName || "Manual Department").toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-[10px] opacity-80">Active</p>
            <p className="text-lg font-bold">{activeItems.length}</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-[10px] opacity-80">Completed</p>
            <p className="text-lg font-bold">{completedItems.length}</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-[10px] opacity-80">Rejected</p>
            <p className="text-lg font-bold">{rejectedItems.length}</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-[10px] opacity-80">Processes</p>
            <p className="text-lg font-bold">{completedProc}/{allProc.length}</p>
          </div>
        </div>
      </div>

      {/* Sidebar + Main Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Item List */}
        <div className="w-72 flex-shrink-0 border-r bg-white flex flex-col overflow-hidden">
          {/* Active Items Header */}
          <div className="px-3 py-2 bg-gray-50 border-b">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Active Items ({activeItems.length})</p>
          </div>

          {/* Active Items List */}
          <div className="flex-1 overflow-y-auto">
            {activeItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                <Package className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                No active items
              </div>
            ) : (
              activeItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                const badge = TYPE_BADGE[item.type] || { label: "?", color: "bg-gray-400 text-white" };
                const doneProc = item.processes.filter((p) => p.status === "COMPLETED").length;
                const totalProc = item.processes.length;
                return (
                  <Link
                    key={item.id}
                    href={isSelected ? "/dashboard/employee" : `/dashboard/employee?item=${item.id}${showCompleted ? "&showCompleted=1" : ""}`}
                  >
                    <div className={`px-3 py-2.5 border-b cursor-pointer transition-all ${
                      isSelected ? "bg-orange-50 border-l-4 border-l-orange-500" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`flex-shrink-0 w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-blue-600">{item.itemNumber}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                            }`}>{item.status.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 truncate">{item.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-gray-400">{doneProc}/{totalProc}</p>
                          <ChevronRight className={`w-3 h-3 text-gray-300 ${isSelected ? "text-orange-500" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}

            {/* Completed Section */}
            {completedItems.length > 0 && (
              <>
                <Link href={showCompleted
                  ? `/dashboard/employee${selectedItemId ? `?item=${selectedItemId}` : ""}${showRejected ? (selectedItemId ? "&showRejected=1" : "?showRejected=1") : ""}`
                  : `/dashboard/employee?showCompleted=1${selectedItemId ? `&item=${selectedItemId}` : ""}${showRejected ? "&showRejected=1" : ""}`
                }>
                  <div className="px-3 py-2 bg-green-50 border-b border-t cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-green-700 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed ({completedItems.length})
                      </p>
                      <span className="text-[10px] text-green-600">{showCompleted ? "▾ Hide" : "▸ Show"}</span>
                    </div>
                  </div>
                </Link>
                {showCompleted && completedItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const badge = TYPE_BADGE[item.type] || { label: "?", color: "bg-gray-400 text-white" };
                  return (
                    <Link
                      key={item.id}
                      href={isSelected ? `/dashboard/employee?showCompleted=1${showRejected ? "&showRejected=1" : ""}` : `/dashboard/employee?item=${item.id}&showCompleted=1${showRejected ? "&showRejected=1" : ""}`}
                    >
                      <div className={`px-3 py-2 border-b cursor-pointer transition-all ${
                        isSelected ? "bg-green-50 border-l-4 border-l-green-500" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`flex-shrink-0 w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${badge.color} opacity-60`}>
                            {badge.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-gray-400">{item.itemNumber}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">COMPLETED</span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">{item.name}</p>
                          </div>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Rejected Section */}
            {rejectedItems.length > 0 && (
              <>
                <Link href={showRejected
                  ? `/dashboard/employee${selectedItemId ? `?item=${selectedItemId}` : ""}${showCompleted ? (selectedItemId ? "&showCompleted=1" : "?showCompleted=1") : ""}`
                  : `/dashboard/employee?showRejected=1${selectedItemId ? `&item=${selectedItemId}` : ""}${showCompleted ? "&showCompleted=1" : ""}`
                }>
                  <div className="px-3 py-2 bg-red-50 border-b border-t cursor-pointer hover:bg-red-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
                        <span className="w-3 h-3 inline-flex items-center justify-center">✕</span>
                        Rejected ({rejectedItems.length})
                      </p>
                      <span className="text-[10px] text-red-600">{showRejected ? "▾ Hide" : "▸ Show"}</span>
                    </div>
                  </div>
                </Link>
                {showRejected && rejectedItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const badge = TYPE_BADGE[item.type] || { label: "?", color: "bg-gray-400 text-white" };
                  return (
                    <Link
                      key={item.id}
                      href={isSelected ? `/dashboard/employee?showRejected=1${showCompleted ? "&showCompleted=1" : ""}` : `/dashboard/employee?item=${item.id}&showRejected=1${showCompleted ? "&showCompleted=1" : ""}`}
                    >
                      <div className={`px-3 py-2 border-b cursor-pointer transition-all ${
                        isSelected ? "bg-red-50 border-l-4 border-l-red-500" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`flex-shrink-0 w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${badge.color} opacity-60`}>
                            {badge.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-gray-400">{item.itemNumber}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">REJECTED</span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">{item.name}</p>
                          </div>
                          <span className="text-red-400 text-xs flex-shrink-0">✕</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!selectedItem ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold">Select an item from the sidebar</p>
                <p className="text-xs text-gray-400 mt-1">Click on an item to view details and manage processes</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Item Header */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold text-blue-600">{selectedItem.itemNumber}</span>
                      <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center ${TYPE_BADGE[selectedItem.type]?.color || "bg-gray-400 text-white"}`}>
                        {TYPE_BADGE[selectedItem.type]?.label || "?"}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedItem.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        selectedItem.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                        selectedItem.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{selectedItem.status.replace(/_/g, " ")}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedItem.name}</h2>
                    <p className="text-sm text-gray-500">{selectedItem.customer}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-[10px] text-gray-500">Output</div>
                    <div className="text-xl font-bold">{selectedItem.currentOutput}/{selectedItem.targetOutput}</div>
                  </div>
                </div>

                {/* Info Row */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
                  <span><strong>Type:</strong> {TYPE_LABELS[selectedItem.type] || selectedItem.type}</span>
                  <span><strong>Deadline:</strong> {new Date(selectedItem.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {selectedItem.color && <span><strong>Color:</strong> {selectedItem.color}</span>}
                  <span><strong>Raw Materials:</strong> {selectedItem.rawMaterials === "RELEASE_TO_PRODUCTION" ? "✓ Released to Production" : selectedItem.rawMaterials === "APPROVAL" ? "⏳ For Approval" : "✗ Not Available"}</span>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const doneProc = selectedItem.processes.filter((p: { status: string }) => p.status === "COMPLETED").length;
                  const totalProc = selectedItem.processes.length;
                  const pct = totalProc > 0 ? Math.round((doneProc / totalProc) * 100) : 0;
                  return (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500">Overall Progress</span>
                        <span className="font-bold">{doneProc}/{totalProc} processes ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Process Evaluation */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Cog className="w-3 h-3" />
                    Process Evaluation — {TYPE_LABELS[selectedItem.type] || selectedItem.type}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {selectedItem.processes.filter((p: { status: string }) => p.status === "COMPLETED").length}/{selectedItem.processes.length} complete
                  </p>
                </div>

                <div className="p-3 space-y-2">
                  {selectedItem.processes.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      No processes defined for this item
                    </div>
                  ) : (
                    selectedItem.processes.map((proc) => (
                      <div
                        key={proc.id}
                        className={`rounded-lg border-2 transition-all ${
                          proc.status === "IN_PROGRESS" ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100" :
                          proc.status === "COMPLETED"   ? "border-green-200 bg-green-50/50" :
                          proc.status === "REJECTED"    ? "border-red-200 bg-red-50/50" :
                          proc.status === "DELAYED"     ? "border-orange-200 bg-orange-50/50" :
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
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex items-center gap-2">
                            <ProcessStatusButton
                              processId={proc.id}
                              currentStatus={proc.status}
                              processName={proc.name}
                              prominent={proc.status === "IN_PROGRESS" || proc.status === "DELAYED"}
                            />
                            <ProcessNoteCell processId={proc.id} notes={(proc as any).notes || []} />
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
                    ))
                  )}
                </div>
              </div>

              {/* Item Notes */}
              <Card className="border">
                <CardContent className="p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Item Notes</p>
                  <NoteSection
                    type="item"
                    targetId={selectedItem.id}
                    notes={(selectedItem as any).notes || []}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
