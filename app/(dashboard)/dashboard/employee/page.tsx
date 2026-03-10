import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Cog, Users, Monitor, FileText, Scissors, BookOpen } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ProcessStatusButton } from "@/components/ProcessStatusButton";
import ProcessNoteCell from "@/components/ProcessNoteCell";
import NoteSection from "@/components/NoteSection";

const CATEGORY_CONFIG = {
  SHEETED: { label: "Sheeted", icon: "FileText", color: "blue", processes: ["Printing", "Pre-Fold/Inspection", "Trimming", "Inspection"] },
  FOLDED: { label: "Folded", icon: "Scissors", color: "emerald", processes: ["Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Inspection"] },
  STITCHING: { label: "Stitching", icon: "BookOpen", color: "purple", processes: ["Printing", "Pre-Fold/Inspection", "Trimming", "Folding", "Stitching", "Inspection"] },
} as const;

async function getLineLeaderData(activeTab: string) {
  // Get ALL items in the Manual department — not filtered by user
  const manualDept = await prisma.department.findFirst({ where: { type: "MANUAL" } });
  if (!manualDept) return { items: [], deptName: "Manual Department" };

  const items = await prisma.item.findMany({
    where: {
      departmentId: manualDept.id,
      ...(activeTab && ["SHEETED", "FOLDED", "STITCHING"].includes(activeTab)
        ? { type: activeTab as any }
        : {}),
    },
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
      rawMaterials: true,
      processes: {
        select: {
          id: true,
          name: true,
          order: true,
          status: true,
          machine: { select: { name: true } },
          assignedTo: { select: { name: true } },
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
    take: 100,
  });

  // Count items per category (for tab badges)
  const counts = await prisma.item.groupBy({
    by: ["type"],
    where: { departmentId: manualDept.id },
    _count: true,
  });

  const categoryCounts: Record<string, number> = {};
  for (const c of counts) categoryCounts[c.type] = c._count;

  return { items, deptName: manualDept.name, categoryCounts };
}

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

export default async function EmployeeDashboardPage(props: {
  searchParams: Promise<{ tab?: string; item?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const searchParams = await props.searchParams;
  const activeTab = searchParams.tab || "SHEETED";
  const expandedItemId = searchParams.item;
  const data = await getLineLeaderData(activeTab);
  const { items, deptName, categoryCounts } = data;

  // Stats for the active tab
  const allProc = items.flatMap((i) => i.processes);
  const completedCount = allProc.filter((p) => p.status === "COMPLETED").length;
  const totalCount = allProc.length;

  return (
    <div className="flex flex-col h-full">
      {/* Orange Header Bar */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold">Line Leader Dashboard</h1>
            <p className="text-[10px] opacity-80">{(deptName || "Manual Department").toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-[10px] opacity-80">Items</p>
            <p className="text-lg font-bold">{items.length}</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-[10px] opacity-80">Processes</p>
            <p className="text-lg font-bold">{completedCount}/{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b bg-white px-4 flex items-center gap-1">
        {(["SHEETED", "FOLDED", "STITCHING"] as const).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const count = categoryCounts?.[cat] || 0;
          const isActive = activeTab === cat;
          return (
            <Link
              key={cat}
              href={`/dashboard/employee?tab=${cat}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? `border-orange-500 text-orange-600 bg-orange-50/50`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cat === "SHEETED" && <FileText className="w-3.5 h-3.5" />}
              {cat === "FOLDED" && <Scissors className="w-3.5 h-3.5" />}
              {cat === "STITCHING" && <BookOpen className="w-3.5 h-3.5" />}
              {cfg.label}
              <span className={`min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
              }`}>{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-20">
            <div className="text-center">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No {CATEGORY_CONFIG[activeTab as keyof typeof CATEGORY_CONFIG]?.label || ""} items yet</p>
              <p className="text-[10px] mt-1 text-gray-400">Items created by the encoder will appear here</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const doneProc = item.processes.filter((p) => p.status === "COMPLETED").length;
            const totalProc = item.processes.length;
            const progressPct = totalProc > 0 ? Math.round((doneProc / totalProc) * 100) : 0;

            return (
              <Card key={item.id} className="border overflow-hidden">
                {/* Item Header - Clickable to expand */}
                <Link
                  href={isExpanded
                    ? `/dashboard/employee?tab=${activeTab}`
                    : `/dashboard/employee?tab=${activeTab}&item=${item.id}`}
                >
                  <div className={`px-4 py-3 flex items-center gap-4 cursor-pointer transition-colors ${
                    isExpanded ? "bg-orange-50 border-l-4 border-l-orange-500" : "hover:bg-gray-50"
                  }`}>
                    {/* Item Number & Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-sm text-blue-600">{item.itemNumber}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{item.status.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{item.name} — {item.customer}</p>
                    </div>

                    {/* Output */}
                    <div className="text-right text-[10px]">
                      <p className="text-gray-500">Output</p>
                      <p className="font-bold text-sm">{item.currentOutput}/{item.targetOutput}</p>
                    </div>

                    {/* Progress */}
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="text-right text-[10px]">
                      <p className="text-gray-500">Deadline</p>
                      <p className="font-bold">
                        {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    {/* Expand indicator */}
                    <div className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      ▾
                    </div>
                  </div>
                </Link>

                {/* Expanded: Process Evaluation */}
                {isExpanded && (
                  <div className="border-t bg-white">
                    {/* Process Evaluation Header */}
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Cog className="w-3 h-3" />
                        Process Evaluation — {CATEGORY_CONFIG[item.type as keyof typeof CATEGORY_CONFIG]?.label}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {doneProc}/{totalProc} complete
                      </p>
                    </div>

                    {/* Process Cards */}
                    <div className="p-3 space-y-2">
                      {item.processes.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-xs">
                          No processes defined for this item
                        </div>
                      ) : (
                        item.processes.map((proc) => (
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
                              {/* Step Number */}
                              <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                proc.status === "IN_PROGRESS" ? "bg-blue-500 text-white" :
                                proc.status === "COMPLETED"   ? "bg-green-500 text-white" :
                                proc.status === "REJECTED"    ? "bg-red-500 text-white" :
                                proc.status === "DELAYED"     ? "bg-orange-400 text-white" :
                                "bg-gray-200 text-gray-500"
                              }`}>{proc.order}</span>

                              {/* Process Info */}
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
                                  <span className="flex items-center gap-1">
                                    <Users className="w-2.5 h-2.5" />
                                    {proc.assignedTo?.name || "—"}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons + Notes */}
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

                    {/* Item Notes */}
                    <div className="px-3 pb-3">
                      <Card className="border">
                        <CardContent className="p-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Item Notes</p>
                          <NoteSection
                            type="item"
                            targetId={item.id}
                            notes={(item as any).notes || []}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
