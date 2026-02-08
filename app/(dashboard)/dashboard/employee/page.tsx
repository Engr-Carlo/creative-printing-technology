import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, ListTodo } from "lucide-react";
import prisma from "@/lib/prisma";

async function getEmployeeStats(userId: string) {
  const [assignedItems, pendingProcesses, completedProcesses] = await Promise.all([
    prisma.itemAssignment.count({
      where: { userId },
    }),
    prisma.process.count({
      where: {
        assignedToId: userId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      },
    }),
    prisma.process.count({
      where: {
        assignedToId: userId,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    assignedItems,
    pendingProcesses,
    completedProcesses,
  };
}

async function getMyAssignedItems(userId: string) {
  return prisma.item.findMany({
    where: {
      assignments: {
        some: { userId },
      },
    },
    include: {
      department: true,
      processes: {
        where: { assignedToId: userId },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

async function getMyProcesses(userId: string) {
  return prisma.process.findMany({
    where: {
      assignedToId: userId,
      status: { not: "COMPLETED" },
    },
    include: {
      item: {
        include: {
          department: true,
        },
      },
      machine: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export default async function EmployeeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const stats = await getEmployeeStats(session.user.id);
  const myItems = await getMyAssignedItems(session.user.id);
  const myProcesses = await getMyProcesses(session.user.id);

  const statCards = [
    {
      title: "Assigned Items",
      value: stats.assignedItems,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingProcesses,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-gradient-to-br from-orange-500/10 to-orange-600/5",
      iconBg: "bg-primary",
      shadow: "shadow-primary/20",
    },
    {
      title: "Completed",
      value: stats.completedProcesses,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-gradient-to-br from-green-500/10 to-green-600/5",
      iconBg: "bg-green-500",
      shadow: "shadow-green-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
        <p className="text-muted-foreground">
          Your assigned items and processes
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`${stat.bgColor} border-0 shadow-lg ${stat.shadow} hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                {stat.title}
              </CardTitle>
              <div
                className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Active Processes */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            My Active Processes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {myProcesses.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-medium">
                  No active processes assigned to you.
                </p>
              </div>
            ) : (
              myProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-all hover:border-primary/50"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base">
                        {process.item.name}
                      </p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {process.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs font-medium">
                        {process.item.itemNumber}
                      </span>
                      <span>•</span>
                      <span className="font-medium">
                        {process.item.department.name}
                      </span>
                      {process.machine && (
                        <>
                          <span>•</span>
                          <span>{process.machine.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        process.status === "COMPLETED"
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          : process.status === "IN_PROGRESS"
                          ? "bg-gradient-to-r from-orange-500 to-primary text-white"
                          : process.status === "NOT_STARTED"
                          ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                          : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      }`}
                    >
                      {process.status.replace("_", " ")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Assigned Items */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            My Assigned Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {myItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-medium">
                  No items assigned to you yet.
                </p>
              </div>
            ) : (
              myItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-all hover:border-primary/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-base">{item.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs font-medium">
                          {item.itemNumber}
                        </span>
                        <span>•</span>
                        <span className="font-medium">{item.department.name}</span>
                      </div>
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        item.status === "COMPLETED"
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          : item.status === "IN_PROGRESS"
                          ? "bg-gradient-to-r from-orange-500 to-primary text-white"
                          : item.status === "PENDING"
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                          : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </div>
                  </div>

                  {/* Processes for this item */}
                  {item.processes.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        My Processes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.processes.map((proc) => (
                          <div
                            key={proc.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              proc.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : proc.status === "IN_PROGRESS"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {proc.name}: {proc.status.replace("_", " ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
