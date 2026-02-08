import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle2, AlertTriangle, PlusCircle, Users } from "lucide-react";
import prisma from "@/lib/prisma";

async function getEncoderStats() {
  const [totalItems, pendingItems, inProgressItems, departments] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { status: "PENDING" } }),
    prisma.item.count({ where: { status: "IN_PROGRESS" } }),
    prisma.department.count(),
  ]);

  return {
    totalItems,
    pendingItems,
    inProgressItems,
    departments,
  };
}

async function getRecentItems() {
  return prisma.item.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      department: true,
      assignments: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

async function getUnassignedItems() {
  return prisma.item.findMany({
    where: {
      assignments: {
        none: {},
      },
    },
    include: {
      department: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export default async function EncoderDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const stats = await getEncoderStats();
  const recentItems = await getRecentItems();
  const unassignedItems = await getUnassignedItems();

  const statCards = [
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Pending",
      value: stats.pendingItems,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-gradient-to-br from-yellow-500/10 to-yellow-600/5",
      iconBg: "bg-yellow-500",
      shadow: "shadow-yellow-500/20",
    },
    {
      title: "In Progress",
      value: stats.inProgressItems,
      icon: CheckCircle2,
      color: "text-orange-600",
      bgColor: "bg-gradient-to-br from-orange-500/10 to-orange-600/5",
      iconBg: "bg-primary",
      shadow: "shadow-primary/20",
    },
    {
      title: "Departments",
      value: stats.departments,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-500/10 to-purple-600/5",
      iconBg: "bg-purple-500",
      shadow: "shadow-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Encoder Dashboard</h2>
          <p className="text-muted-foreground">
            Manage items, assignments, and production workflow
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <PlusCircle className="w-5 h-5" />
          Create New Item
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unassigned Items Alert */}
      {unassignedItems.length > 0 && (
        <Card className="shadow-lg border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader className="border-b bg-orange-100/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Items Needing Assignment ({unassignedItems.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                Assign All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {unassignedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-md transition-all"
                >
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
                  <Button size="sm" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Items */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">All Items</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {recentItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-medium">
                  No items yet. Create your first item to get started.
                </p>
              </div>
            ) : (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-all hover:border-primary/50"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs font-medium">
                        {item.itemNumber}
                      </span>
                      <span>•</span>
                      <span className="font-medium">{item.department.name}</span>
                      {item.assignments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-xs">
                            {item.assignments.length} assigned
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        item.status === "COMPLETED"
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          : item.status === "IN_PROGRESS"
                          ? "bg-gradient-to-r from-orange-500 to-primary text-white"
                          : item.status === "PENDING"
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                          : item.status === "DELAYED"
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Target: <span className="font-bold text-foreground">{item.targetOutput}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-lg border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <button className="flex items-center justify-center gap-3 p-5 border-2 border-border rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 hover:shadow-lg group">
              <PlusCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">New Item</span>
            </button>
            <button className="flex items-center justify-center gap-3 p-5 border-2 border-border rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 hover:shadow-lg group">
              <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Manage Assignments</span>
            </button>
            <button className="flex items-center justify-center gap-3 p-5 border-2 border-border rounded-xl hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 hover:shadow-lg group">
              <Package className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">View All Items</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
