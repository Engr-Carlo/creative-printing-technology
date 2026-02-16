import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

async function getDashboardData() {
  // Single query to get items + compute stats in memory
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      itemNumber: true,
      status: true,
      targetOutput: true,
      deadline: true,
      createdAt: true,
      department: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const now = new Date();
  const stats = {
    totalItems: items.length,
    inProgressItems: items.filter((i) => i.status === "IN_PROGRESS").length,
    completedItems: items.filter((i) => i.status === "COMPLETED").length,
    delayedItems: items.filter((i) => i.deadline && i.deadline < now && i.status !== "COMPLETED").length,
  };

  return { stats, recentItems: items.slice(0, 5) };
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
    { title: "In Progress", value: stats.inProgressItems, icon: Clock, color: "text-orange-600", bg: "bg-primary" },
    { title: "Completed", value: stats.completedItems, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-600" },
    { title: "Delayed", value: stats.delayedItems, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500" },
  ];

  return (
    <div className="space-y-4 p-2">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-xs text-muted-foreground">Real-time production monitoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Item #</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Department</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold text-muted-foreground">Target</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/20 text-[11px]">
                    <td className="py-1.5 px-3 font-mono font-semibold text-blue-600">{item.itemNumber}</td>
                    <td className="py-1.5 px-3 font-medium">{item.name}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{item.department.name}</td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                        item.status === "DELAYED" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{item.status.replace("_", " ")}</span>
                    </td>
                    <td className="py-1.5 px-3 font-semibold">{item.targetOutput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
