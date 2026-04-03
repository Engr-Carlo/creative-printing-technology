import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";
import prisma from "@/lib/prisma";
import { ProductionTrendChart } from "@/components/charts/ProductionTrendChart";
import { ItemDistributionChart } from "@/components/charts/ItemDistributionChart";

async function getAnalytics() {
  // Single batch: 3 queries instead of 29
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [items, departments] = await Promise.all([
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
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);

  const totalItems = items.length;

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

  return {
    totalItems,
    totalDepartments: departments.length,
    itemsByDepartment,
    itemsByStatus,
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Production Trend — wider */}
        <Card className="border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              7-Day Production Trend
            </CardTitle>
            <CardDescription className="text-xs">Items by status over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <ProductionTrendChart data={analytics.productionTrendData} />
          </CardContent>
        </Card>

        {/* Department Distribution — narrower */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              By Department
            </CardTitle>
            <CardDescription className="text-xs">Item distribution across departments</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <ItemDistributionChart
              data={analytics.departmentDistribution}
              title="Department Distribution"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Items by Department */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Items by Department
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {analytics.itemsByDepartment.map((dept) => {
              const percentage = analytics.totalItems > 0
                ? Math.round((dept._count.items / analytics.totalItems) * 100)
                : 0;
              return (
                <div key={dept.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{dept.name}</span>
                    <span className="text-muted-foreground font-medium">{dept._count.items} <span className="text-gray-400">({percentage}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Items by Status */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Items by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {analytics.itemsByStatus.map((status) => {
              const percentage = analytics.totalItems > 0
                ? Math.round((status._count / analytics.totalItems) * 100)
                : 0;
              const statusConfig: Record<string, { label: string; bar: string; badge: string }> = {
                PENDING:     { label: "Pending",     bar: "from-yellow-400 to-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
                IN_PROGRESS: { label: "In Progress", bar: "from-blue-400 to-blue-500",    badge: "bg-blue-100 text-blue-700" },
                COMPLETED:   { label: "Completed",   bar: "from-green-400 to-green-500",  badge: "bg-green-100 text-green-700" },
                REJECTED:    { label: "Rejected",    bar: "from-red-400 to-red-500",      badge: "bg-red-100 text-red-700" },
              };
              const cfg = statusConfig[status.status] ?? { label: status.status, bar: "from-gray-400 to-gray-500", badge: "bg-gray-100 text-gray-700" };
              return (
                <div key={status.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-muted-foreground font-medium">{status._count} <span className="text-gray-400">({percentage}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${cfg.bar} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
