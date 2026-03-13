import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800" },
};

async function getDashboardData() {
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      itemNumber: true,
      status: true,
      targetOutput: true,
      currentOutput: true,
      deadline: true,
      customer: true,
      rawMaterials: true,
      createdAt: true,
      department: { select: { name: true } },
      processes: {
        select: { id: true, status: true, name: true, order: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const stats = {
    totalItems: items.length,
    pendingItems: items.filter((i) => i.status === "PENDING").length,
    inProgressItems: items.filter((i) => i.status === "IN_PROGRESS").length,
    completedItems: items.filter((i) => i.status === "COMPLETED").length,
    rejectedItems: items.filter((i) => i.status === "REJECTED").length,
  };

  return { stats, recentItems: items.slice(0, 20) };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = session.user.role;
  if (userRole === "ENCODER") redirect("/dashboard/encoder");
  if (userRole === "EMPLOYEE") redirect("/dashboard/employee");

  const { stats, recentItems } = await getDashboardData();

  const statCards = [
    { title: "Total Items", value: stats.totalItems, icon: Package, color: "text-blue-600", bg: "bg-blue-600" },
    { title: "Pending", value: stats.pendingItems, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-500" },
    { title: "In Progress", value: stats.inProgressItems, icon: Clock, color: "text-orange-600", bg: "bg-primary" },
    { title: "Completed", value: stats.completedItems, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-600" },
    { title: "Rejected", value: stats.rejectedItems, icon: XCircle, color: "text-red-600", bg: "bg-red-600" },
  ];

  return (
    <div className="space-y-4 p-2">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-xs text-muted-foreground">Real-time production monitoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border">
        <CardHeader className="py-2 px-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold">Recent Items</CardTitle>
            <Link href="/dashboard/items"><Button variant="outline" size="sm" className="h-6 text-[10px]">View All</Button></Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">No items yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Item #</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Raw Materials</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Progress</th>
                    <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => {
                    const doneProc = item.processes.filter((p) => p.status === "COMPLETED").length;
                    const totalProc = item.processes.length;
                    const pct = totalProc > 0 ? Math.round((doneProc / totalProc) * 100) : 0;
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/20 text-[11px]">
                        <td className="py-1.5 px-3 font-mono font-semibold text-blue-600">
                          <Link href={`/dashboard/items/${item.id}`} className="hover:underline">{item.itemNumber}</Link>
                        </td>
                        <td className="py-1.5 px-3 font-medium">{item.name}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{item.customer}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                        </td>
                        <td className="py-1.5 px-3">
                          <span className={`text-[10px] font-medium ${
                            item.rawMaterials === "RELEASE_TO_PRODUCTION" ? "text-green-600" :
                            item.rawMaterials === "APPROVAL" ? "text-yellow-600" : "text-red-500"
                          }`}>
                            {item.rawMaterials === "RELEASE_TO_PRODUCTION" ? "✓ Released" : item.rawMaterials === "APPROVAL" ? "⏳ Approval" : "✗ N/A"}
                          </span>
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 font-semibold">{doneProc}/{totalProc}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 font-semibold">{item.currentOutput}/{item.targetOutput}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
