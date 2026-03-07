import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, AlertCircle, Cog, Users, Monitor } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ProcessStatusButton } from "@/components/ProcessStatusButton";
import { ProductionTrendChart } from "@/components/charts/ProductionTrendChart";
import { ItemDistributionChart } from "@/components/charts/ItemDistributionChart";
import ItemNoteCell from "@/components/ItemNoteCell";
import ProcessNoteCell from "@/components/ProcessNoteCell";
import NoteSection from "@/components/NoteSection";

async function getLineLeaderData(userId: string, selectedItemId?: string) {
  // Get user with department
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { id: true, name: true, type: true } },
    },
  });

  if (!user) return null;

  // Get all items in the user's department (or assigned to user if no department)
  const whereClause = user.departmentId
    ? { departmentId: user.departmentId }
    : { assignments: { some: { userId } } };

  const items = await prisma.item.findMany({
    where: whereClause,
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
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" as const },
            take: 10,
          },
        },
        orderBy: { order: "asc" },
      },
      notes: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" as const },
        take: 20,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Compute stats
  const totalOutput = items.reduce((s, i) => s + i.currentOutput, 0);
  const totalTarget = items.reduce((s, i) => s + i.targetOutput, 0);
  const allProcesses = items.flatMap((i) => i.processes);
  const completedProc = allProcesses.filter((p) => p.status === "COMPLETED").length;
  const inProgressProc = allProcesses.filter((p) => p.status === "IN_PROGRESS").length;
  const delayedProc = allProcesses.filter((p) => p.status === "DELAYED").length;
  const pendingProc = allProcesses.filter((p) => p.status === "NOT_STARTED").length;
  const completionPct = allProcesses.length > 0 ? Math.round((completedProc / allProcesses.length) * 100) : 0;
  const inProgressPct = allProcesses.length > 0 ? Math.round((inProgressProc / allProcesses.length) * 100) : 0;

  // Nearest deadline
  const activeItems = items.filter((i) => i.status !== "COMPLETED");
  const nearestDeadline = activeItems.length > 0
    ? activeItems.reduce((min, i) => (i.deadline < min ? i.deadline : min), activeItems[0].deadline)
    : null;

  // Distribution by status for donut chart
  const statusDist = [
    { name: "Completed", value: items.filter((i) => i.status === "COMPLETED").length },
    { name: "In Progress", value: items.filter((i) => i.status === "IN_PROGRESS").length },
    { name: "Pending", value: items.filter((i) => i.status === "PENDING").length },
  ].filter((d) => d.value > 0);

  // Trend data (simple: by item creation, get last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const trendData = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayProcs = allProcesses.filter(() => true); // All processes (simplified)
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: completedProc,
      inProgress: inProgressProc,
      pending: pendingProc,
    };
  });

  // Selected item (first item or by ID)
  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) || items[0]
    : items[0];

  return {
    user,
    items,
    selectedItem,
    stats: {
      totalItems: items.length,
      totalOutput,
      totalTarget,
      completedProc,
      inProgressProc,
      delayedProc,
      pendingProc,
      completionPct,
      inProgressPct,
      nearestDeadline,
    },
    statusDist,
    trendData,
  };
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
  searchParams: Promise<{ item?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const searchParams = await props.searchParams;
  const data = await getLineLeaderData(session.user.id, searchParams.item);
  if (!data) redirect("/login");

  const { user, items, selectedItem, stats, statusDist, trendData } = data;
  const deptName = user.department?.name || "My Department";
  const overallStatus = stats.completionPct === 100 ? "COMPLETE" : 
    stats.delayedProc > 0 ? "INCOMPLETE" : "IN PROGRESS";

  return (
    <div className="flex flex-col h-full">
      {/* Orange Header Bar */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold">{user.name}</h1>
            <p className="text-[10px] opacity-80">(line leader)</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div>
            <p className="text-[10px] opacity-80">Department</p>
            <p className="text-sm font-bold">{deptName.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] opacity-80">Current Output</p>
            <p className="text-lg font-bold">{stats.totalOutput}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] opacity-80">Target Output</p>
            <p className="text-lg font-bold">{stats.totalTarget}</p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-[10px] opacity-80">Nearest Deadline</p>
            <p className="text-sm font-bold">
              {stats.nearestDeadline
                ? new Date(stats.nearestDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
                : "N/A"}
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-xs font-bold ${
            overallStatus === "COMPLETE" ? "bg-green-700" :
            overallStatus === "INCOMPLETE" ? "bg-red-700" : "bg-blue-700"
          }`}>
            {overallStatus}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Items List */}
        <div className="w-48 border-r bg-gray-50 flex flex-col overflow-y-auto">
          <div className="px-2 py-1.5 border-b bg-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Items ({items.length})</p>
          </div>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/employee?item=${item.id}`}
              className={`block px-2 py-1.5 border-b text-[11px] hover:bg-orange-50 transition-colors ${
                selectedItem?.id === item.id ? "bg-orange-100 border-l-2 border-l-orange-500" : ""
              }`}
            >
              <p className="font-mono font-bold text-blue-600">{item.itemNumber}</p>
              <p className="text-gray-600 truncate">{item.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  item.status === "COMPLETED" ? "bg-green-500" :
                  item.status === "IN_PROGRESS" ? "bg-blue-500" :
                  "bg-yellow-500"
                }`} />
                <span className="text-[10px] text-gray-500">{item.status.replace("_", " ")}</span>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="p-3 text-center text-[10px] text-gray-400">No items</div>
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3">
          {selectedItem ? (
            <>
              {/* Selected Item Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">
                    <span className="text-blue-600 font-mono">{selectedItem.itemNumber}</span>
                    <span className="ml-2">{selectedItem.name}</span>
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Customer: {selectedItem.customer} • Type: {selectedItem.type} •
                    Output: {selectedItem.currentOutput}/{selectedItem.targetOutput}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedItem.rawMaterials === "RELEASE_TO_PRODUCTION" ? "bg-green-100 text-green-700" :
                    selectedItem.rawMaterials === "APPROVAL" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>Raw: {selectedItem.rawMaterials.replace(/_/g, " ")}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedItem.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                    selectedItem.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{selectedItem.status.replace("_", " ")}</span>
                </div>
              </div>

              {/* Process Evaluation Panels */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Cog className="w-3 h-3" />
                    Process Evaluation
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {selectedItem.processes.filter((p) => p.status === "COMPLETED").length}/{selectedItem.processes.length} complete
                  </p>
                </div>

                {selectedItem.processes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs border rounded-lg">
                    No processes defined for this item
                  </div>
                ) : (
                  selectedItem.processes.map((proc) => (
                    <div
                      key={proc.id}
                      className={`rounded-lg border-2 transition-all ${
                        proc.status === 'IN_PROGRESS' ? 'border-blue-400 bg-blue-50 shadow-md shadow-blue-100' :
                        proc.status === 'COMPLETED'   ? 'border-green-200 bg-green-50/50' :
                        proc.status === 'REJECTED'    ? 'border-red-200 bg-red-50/50' :
                        proc.status === 'DELAYED'     ? 'border-orange-200 bg-orange-50/50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="p-3 flex items-center gap-3">
                        {/* Step Number Circle */}
                        <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          proc.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                          proc.status === 'COMPLETED'   ? 'bg-green-500 text-white' :
                          proc.status === 'REJECTED'    ? 'bg-red-500 text-white' :
                          proc.status === 'DELAYED'     ? 'bg-orange-400 text-white' :
                          'bg-gray-200 text-gray-500'
                        }`}>{proc.order}</span>

                        {/* Process Name + Machine + Assigned */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-bold text-sm ${
                              proc.status === 'IN_PROGRESS' ? 'text-blue-900' :
                              proc.status === 'COMPLETED'   ? 'text-green-900' :
                              proc.status === 'REJECTED'    ? 'text-red-900' :
                              'text-gray-700'
                            }`}>{proc.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${processStatusColors[proc.status]}`}>
                              {processStatusLabels[proc.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Monitor className="w-2.5 h-2.5" />
                              {proc.machine?.name || '—'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {proc.assignedTo?.name || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons + Notes */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <ProcessStatusButton
                            processId={proc.id}
                            currentStatus={proc.status}
                            processName={proc.name}
                            prominent={proc.status === 'IN_PROGRESS' || proc.status === 'DELAYED'}
                          />
                          <ProcessNoteCell processId={proc.id} notes={(proc as any).notes || []} />
                        </div>
                      </div>

                      {/* Active process instruction */}
                      {proc.status === 'IN_PROGRESS' && (
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

              {/* Item Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-semibold">Item Progress</span>
                    <span className="text-muted-foreground">
                      {selectedItem.processes.filter((p) => p.status === "COMPLETED").length}/{selectedItem.processes.length} processes done
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                      style={{
                        width: `${selectedItem.processes.length > 0 
                          ? Math.round((selectedItem.processes.filter((p) => p.status === "COMPLETED").length / selectedItem.processes.length) * 100) 
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">
                    Deadline: {new Date(selectedItem.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No items in your department</p>
              </div>
            </div>
          )}

          {/* Bottom Charts & Stats */}
          <div className="grid grid-cols-3 gap-3">
            {/* Stats Card */}
            <Card className="border">
              <CardContent className="p-3 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Summary</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed</span>
                    <span className="font-bold text-green-600">{stats.completionPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> On-Going</span>
                    <span className="font-bold text-blue-600">{stats.inProgressPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Delayed</span>
                    <span className="font-bold text-red-600">{stats.delayedProc}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Pending</span>
                    <span className="font-bold">{stats.pendingProc}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Donut Chart */}
            <ItemDistributionChart data={statusDist} title="Status Distribution" />

            {/* Production Trend Line Chart */}
            <ProductionTrendChart data={trendData} />
          </div>
        </div>
      </div>
    </div>
  );
}
