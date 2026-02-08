import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Clock, Users, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";

async function getAnalytics() {
  const [
    totalItems,
    completedItems,
    inProgressItems,
    totalDepartments,
    totalUsers,
    itemsByDepartment,
    itemsByStatus,
    recentActivity,
  ] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { status: "COMPLETED" } }),
    prisma.item.count({ where: { status: "IN_PROGRESS" } }),
    prisma.department.count(),
    prisma.user.count(),
    prisma.department.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.item.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.item.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { department: true },
    }),
  ]);

  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    completedItems,
    inProgressItems,
    totalDepartments,
    totalUsers,
    completionRate,
    itemsByDepartment,
    itemsByStatus,
    recentActivity,
  };
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Admin can access analytics
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive overview of production metrics and performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalItems}</p>
                <p className="text-xs text-muted-foreground mt-1">All production items</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{analytics.completedItems}</p>
                <p className="text-xs text-muted-foreground mt-1">{analytics.completionRate}% completion rate</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.inProgressItems}</p>
                <p className="text-xs text-muted-foreground mt-1">Active production</p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">Active team members</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items by Department */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Items by Department
            </CardTitle>
            <CardDescription>Distribution of items across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.itemsByDepartment.map((dept) => {
                const percentage = analytics.totalItems > 0 
                  ? Math.round((dept._count.items / analytics.totalItems) * 100)
                  : 0;

                return (
                  <div key={dept.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-muted-foreground">
                        {dept._count.items} items ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-primary to-orange-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Items by Status */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Items by Status
            </CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.itemsByStatus.map((status) => {
                const percentage = analytics.totalItems > 0 
                  ? Math.round((status._count / analytics.totalItems) * 100)
                  : 0;

                const statusConfig: Record<string, { label: string; color: string }> = {
                  PENDING: { label: "Pending", color: "from-yellow-500 to-yellow-600" },
                  IN_PROGRESS: { label: "In Progress", color: "from-blue-500 to-blue-600" },
                  COMPLETED: { label: "Completed", color: "from-green-500 to-green-600" },
                  CANCELLED: { label: "Cancelled", color: "from-red-500 to-red-600" },
                };

                const config = statusConfig[status.status] || { label: status.status, color: "from-gray-500 to-gray-600" };

                return (
                  <div key={status.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-muted-foreground">
                        {status._count} items ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`bg-gradient-to-r ${config.color} h-2.5 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates to production items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.department.name} • {item.itemNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.status.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
