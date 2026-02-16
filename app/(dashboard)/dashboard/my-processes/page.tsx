import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { ProcessStatusButton } from "@/components/ProcessStatusButton";
import Link from "next/link";

async function getMyProcesses(userId: string) {
  return prisma.process.findMany({
    where: { assignedToId: userId },
    select: {
      id: true,
      name: true,
      status: true,
      order: true,
      item: {
        select: {
          id: true,
          name: true,
          itemNumber: true,
          department: { select: { name: true } },
        },
      },
      machine: { select: { name: true } },
    },
    orderBy: { order: "asc" },
    take: 50,
  });
}

const statusConfig = {
  NOT_STARTED: { label: "Not Started", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: PlayCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default async function MyProcessesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EMPLOYEE") redirect("/dashboard");

  const processes = await getMyProcesses(session.user.id);
  const stats = {
    total: processes.length,
    pending: processes.filter((p) => p.status === "NOT_STARTED").length,
    inProgress: processes.filter((p) => p.status === "IN_PROGRESS").length,
    completed: processes.filter((p) => p.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-3 p-2">
      <div>
        <h1 className="text-lg font-bold text-gray-900">My Processes</h1>
        <p className="text-xs text-muted-foreground">Processes assigned to you</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Pending</p>
          <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">In Progress</p>
          <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Completed</p>
          <p className="text-lg font-bold text-green-600">{stats.completed}</p>
        </CardContent></Card>
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Process</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Item</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Dept</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Machine</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                      No processes assigned yet
                    </td>
                  </tr>
                ) : (
                  processes.map((process) => {
                    const config = statusConfig[process.status as keyof typeof statusConfig];
                    return (
                      <tr key={process.id} className="border-b hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-semibold text-primary">{process.name}</td>
                        <td className="py-1.5 px-2">
                          <span className="font-medium">{process.item.name}</span>
                          <span className="text-muted-foreground ml-1 font-mono text-[10px]">{process.item.itemNumber}</span>
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{process.item.department.name}</td>
                        <td className="py-1.5 px-2">{process.machine?.name || <span className="text-gray-400">-</span>}</td>
                        <td className="py-1.5 px-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{process.order}</span>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${config?.color}`}>
                            {config?.label}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <ProcessStatusButton processId={process.id} currentStatus={process.status} processName={process.name} />
                            <Link href={`/dashboard/items/${process.item.id}`}>
                              <Button variant="outline" size="sm" className="h-5 text-[10px] px-2">Item</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
