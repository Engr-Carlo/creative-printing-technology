import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Clock, Users, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { ProductionTrendChart } from "@/components/charts/ProductionTrendChart";
import { ItemDistributionChart } from "@/components/charts/ItemDistributionChart";

async function getAnalytics() {
  // Single batch: 3 queries instead of 29
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [items, departments, totalUsers] = await Promise.all([
    // 1 query: get all items with department (replaces 8 counts + 21 trend queries + recent activity)
    prisma.item.findMany({
      select: {
        id: true,
        name: true,
        itemNumber: true,
        status: true,
        updatedAt: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // 2 query: departments
    prisma.department.findMany({ select: { id: true, name: true } }),
    // 3 query: user count
    prisma.user.count(),
  ]);

  // Compute everything in-memory from the single items fetch
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === "COMPLETED").length;
  const inProgressItems = items.filter((i) => i.status === "IN_PROGRESS").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Status counts
  const statusCounts: Record<string, number> = {};
  items.forEach((i) => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });
  const itemsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    _count: count,
  }));

  // Department counts
  const deptCounts: Record<string, number> = {};
  items.forEach((i) => { deptCounts[i.departmentId] = (deptCounts[i.departmentId] || 0) + 1; });
  const itemsByDepartment = departments.map((d) => ({
    ...d,
    _count: { items: deptCounts[d.id] || 0 },
  }));

  // Department distribution for donut chart
  const departmentDistribution = itemsByDepartment.map((dept) => ({
    name: dept.name,
    value: dept._count.items,
  }));

  // Generate 7-day trend data in-memory
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const productionTrendData = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayItems = items.filter((i) => {
      const u = new Date(i.updatedAt);
      return u >= date && u < nextDay;
    });
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: dayItems.filter((i) => i.status === "COMPLETED").length,
      inProgress: dayItems.filter((i) => i.status === "IN_PROGRESS").length,
      pending: dayItems.filter((i) => i.status === "PENDING").length,
    };
  });

  // Recent activity = first 10 items (already sorted by updatedAt desc)
  const recentActivity = items.slice(0, 10);

  return {
    totalItems,
    completedItems,
    inProgressItems,
    totalDepartments: departments.length,
    totalUsers,
    completionRate,
    itemsByDepartment,
    itemsByStatus,
    recentActivity,
    productionTrendData,
    departmentDistribution,
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
    <div className="space-y-4 p-2">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-xs text-muted-foreground">Production metrics and performance overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold text-blue-600">{analytics.totalItems}</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-green-600">{analytics.completedItems}</p>
                <p className="text-[10px] text-muted-foreground">{analytics.completionRate}%</p>
              </div>
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold text-orange-600">{analytics.inProgressItems}</p>
              </div>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Users</p>
                <p className="text-xl font-bold text-purple-600">{analytics.totalUsers}</p>
              </div>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductionTrendChart data={analytics.productionTrendData} />
        <ItemDistributionChart 
          data={analytics.departmentDistribution} 
          title="Department Distribution" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Items by Department */}
        <Card className="border">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-primary" />
              Items by Department
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {analytics.itemsByDepartment.map((dept) => {
                const percentage = analytics.totalItems > 0 
                  ? Math.round((dept._count.items / analytics.totalItems) * 100)
                  : 0;
                return (
                  <div key={dept.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-muted-foreground">{dept._count.items} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-primary to-orange-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Items by Status */}
        <Card className="border">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              Items by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {analytics.itemsByStatus.map((status) => {
                const percentage = analytics.totalItems > 0 
                  ? Math.round((status._count / analytics.totalItems) * 100)
                  : 0;
                const statusConfig: Record<string, { label: string; color: string }> = {
                  PENDING: { label: "Pending", color: "from-yellow-500 to-yellow-600" },
                  IN_PROGRESS: { label: "In Progress", color: "from-blue-500 to-blue-600" },
                  COMPLETED: { label: "Completed", color: "from-green-500 to-green-600" },
                };
                const config = statusConfig[status.status] || { label: status.status, color: "from-gray-500 to-gray-600" };
                return (
                  <div key={status.status} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-muted-foreground">{status._count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`bg-gradient-to-r ${config.color} h-1.5 rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-1">
            {analytics.recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-[11px]">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-primary" />
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.department.name} • {item.itemNumber}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                    item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{item.status.replace("_", " ")}</span>
                  <span className="text-muted-foreground text-[10px]">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
