import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Clock,
  CheckCircle2,
  PlusCircle,
  Users,
  Calendar,
} from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { RawMaterialsSelect } from "@/components/RawMaterialsSelect";
import { ProductionTrendChart } from "@/components/charts/ProductionTrendChart";
import { ItemDistributionChart } from "@/components/charts/ItemDistributionChart";

// Department category config matching the sidebar from the screenshot
const DEPARTMENT_CATEGORIES = [
  { type: "CARDBOARD", label: "Card Board", color: "bg-orange-500" },
  { type: "MANUAL", label: "Manuals", color: "bg-orange-500" },
  { type: "LABEL", label: "Labels / Sticker", color: "bg-orange-500" },
  { type: "BOOKBIND", label: "Bookbind", color: "bg-orange-500" },
  { type: "OTHER_ITEMS", label: "Other Items", color: "bg-orange-500" },
];

const TYPE_LABELS: Record<string, string> = {
  FOLDED: "Folded",
  SHEETED: "Sheeted",
  STITCHING: "Stitching",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300" },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800 border-red-300" },
};

async function getEncoderStats() {
  const [totalItems, pendingItems, inProgressItems, completedItems] =
    await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: "PENDING" } }),
      prisma.item.count({ where: { status: "IN_PROGRESS" } }),
      prisma.item.count({ where: { status: "COMPLETED" } }),
    ]);

  return { totalItems, pendingItems, inProgressItems, completedItems };
}

async function getItemsByDepartment(departmentType: string) {
  return prisma.item.findMany({
    where: {
      department: {
        type: departmentType as any,
      },
    },
    select: {
      id: true,
      itemNumber: true,
      name: true,
      type: true,
      quantity: true,
      customer: true,
      deadline: true,
      status: true,
      rawMaterials: true,
      createdAt: true,
      department: {
        select: { name: true },
      },
      assignments: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to 100 items for performance
  });
}

async function getChartData() {
  const [itemsByStatus, itemsByDepartment] = await Promise.all([
    prisma.item.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.department.findMany({
      select: {
        name: true,
        _count: {
          select: { items: true },
        },
      },
    }),
  ]);

  const statusData = [
    { date: "Today", completed: 0, inProgress: 0, pending: 0 },
  ];
  
  itemsByStatus.forEach((s) => {
    if (s.status === "COMPLETED") statusData[0].completed = s._count;
    if (s.status === "IN_PROGRESS") statusData[0].inProgress = s._count;
    if (s.status === "PENDING") statusData[0].pending = s._count;
  });

  const deptData = itemsByDepartment.map((d) => ({
    name: d.name,
    value: d._count.items,
  }));

  return { statusData, deptData };
}

export default async function EncoderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { category } = await searchParams;
  const activeCategory = category || "CARDBOARD";
  
  const [stats, activeItems, chartData] = await Promise.all([
    getEncoderStats(),
    getItemsByDepartment(activeCategory),
    getChartData(),
  ]);
  
  const activeCategoryConfig = DEPARTMENT_CATEGORIES.find((c) => c.type === activeCategory);

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
      title: "Completed",
      value: stats.completedItems,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-gradient-to-br from-green-500/10 to-green-600/5",
      iconBg: "bg-green-500",
      shadow: "shadow-green-500/20",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-xl font-bold">{session.user.name}</h2>
            <p className="text-xs opacity-80">Encoder — Production Monitoring</p>
          </div>
          <Link href="/dashboard/items/new">
            <Button
              size="sm"
              className="gap-1 bg-white text-orange-600 hover:bg-orange-50 font-semibold text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Create Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`${stat.bgColor} border-0 shadow-sm hover:shadow-md transition-all`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground/60">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div
                  className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center`}
                >
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts - Compact Side by Side */}
      <div className="grid gap-3 md:grid-cols-2 h-[180px]">
        <ProductionTrendChart data={chartData.statusData} />
        <ItemDistributionChart data={chartData.deptData} title="Items by Department" />
      </div>

      {/* Main Content: Department Sidebar + Database Table */}
      <div className="flex gap-4">
        {/* Left Sidebar - Compact Department Categories */}
        <div className="w-48 flex-shrink-0 space-y-3">
          <Card className="border-2 overflow-hidden">
            <CardHeader className="bg-orange-500 py-2 px-3">
              <div className="flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                <CardTitle className="text-xs font-bold">DEPARTMENTS</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-1.5 space-y-0.5">
              {DEPARTMENT_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.type;
                return (
                  <Link
                    key={cat.type}
                    href={`/dashboard/encoder?category=${cat.type}`}
                  >
                    <div
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-orange-500 text-white"
                          : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions - Compact */}
          <Card className="border-2">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-bold text-gray-700">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 space-y-0.5">
              <Link href="/dashboard/items/new">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <PlusCircle className="w-3 h-3" />
                  New Item
                </div>
              </Link>
              <Link href="/dashboard/assignments">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <Users className="w-3 h-3" />
                  Assignments
                </div>
              </Link>
              <Link href="/dashboard/items">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <Package className="w-3 h-3" />
                  All Items
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Database Table */}
        <div className="flex-1 min-w-0">
          <Card className="border-2 overflow-hidden">
            {/* Category Header - Compact */}
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 py-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-white">
                  {activeCategoryConfig?.label || "Items"}
                </CardTitle>
                <span className="text-xs text-white/80 font-medium">
                  {activeItems.length} item{activeItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[calc(100vh-480px)]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-orange-50 border-b border-orange-200">
                    <tr>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Item #
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Name
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Type
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Qty
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Customer
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Deadline
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Raw Materials
                      </th>
                      <th className="text-left py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-center py-1.5 px-2 font-semibold text-orange-900 whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-semibold text-gray-500">
                            No items in {activeCategoryConfig?.label}
                          </p>
                          <Link href="/dashboard/items/new" className="mt-2 inline-block">
                            <Button size="sm" className="mt-2 text-xs">
                              <PlusCircle className="w-3 h-3 mr-1" />
                              Create Item
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      activeItems.map((item: any, index: number) => {
                        const statusConfig =
                          STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                        return (
                          <tr
                            key={item.id}
                            className={`border-b hover:bg-orange-50/50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="py-1.5 px-2">
                              <span className="font-mono text-[11px] font-semibold text-blue-600">
                                {item.itemNumber}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-medium text-gray-900 max-w-[150px] truncate">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700 border">
                                {TYPE_LABELS[item.type] || item.type}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-semibold text-gray-700">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-gray-700 font-medium truncate max-w-[120px]">
                              {item.customer}
                            </td>
                            <td className="py-1.5 px-2 text-gray-600 whitespace-nowrap">
                              <span className="text-[11px]">
                                {new Date(item.deadline).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-1.5 px-2">
                              <RawMaterialsSelect
                                itemId={item.id}
                                currentStatus={item.rawMaterials}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold border ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <Link href={`/dashboard/items/${item.id}`}>
                                <Button variant="outline" size="sm" className="text-[11px] h-6 px-2">
                                  View
                                </Button>
                              </Link>
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
      </div>
    </div>
  );
}
