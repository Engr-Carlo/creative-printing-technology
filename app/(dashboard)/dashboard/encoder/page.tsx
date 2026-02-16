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
  const [totalItems, pendingItems, inProgressItems, completedItems, departments] =
    await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: "PENDING" } }),
      prisma.item.count({ where: { status: "IN_PROGRESS" } }),
      prisma.item.count({ where: { status: "COMPLETED" } }),
      prisma.department.count(),
    ]);

  return { totalItems, pendingItems, inProgressItems, completedItems, departments };
}

async function getItemsByDepartment(departmentType: string) {
  return prisma.item.findMany({
    where: {
      department: {
        type: departmentType as any,
      },
    },
    include: {
      department: true,
      assignments: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getAllDepartmentItems() {
  const results: Record<string, any[]> = {};
  for (const cat of DEPARTMENT_CATEGORIES) {
    results[cat.type] = await getItemsByDepartment(cat.type);
  }
  return results;
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
  const stats = await getEncoderStats();
  const allItems = await getAllDepartmentItems();
  const activeCategory = category || "CARDBOARD";
  const activeItems = allItems[activeCategory] || [];
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
    <div className="space-y-6">
      {/* Header - matches the orange bar from the screenshot */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium opacity-90">Welcome back,</p>
            <h2 className="text-2xl font-bold">{session.user.name}</h2>
            <p className="text-sm opacity-80 mt-1">Encoder — Production Monitoring System</p>
          </div>
          <Link href="/dashboard/items/new">
            <Button
              size="lg"
              className="gap-2 bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              Create New Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Main Content: Department Sidebar + Database Table */}
      <div className="flex gap-6">
        {/* Left Sidebar - Department Categories */}
        <div className="w-56 flex-shrink-0 space-y-4">
          <Card className="border-2 overflow-hidden">
            <CardHeader className="bg-orange-500 py-3 px-4">
              <div className="flex items-center gap-2 text-white">
                <Package className="w-5 h-5" />
                <CardTitle className="text-sm font-bold">ITEMS</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {DEPARTMENT_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.type;
                const itemCount = allItems[cat.type]?.length || 0;
                return (
                  <Link
                    key={cat.type}
                    href={`/dashboard/encoder?category=${cat.type}`}
                  >
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        isActive
                          ? "bg-orange-500 text-white shadow-md"
                          : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {itemCount}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-2">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-bold text-gray-700">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <Link href="/dashboard/items/new">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <PlusCircle className="w-4 h-4" />
                  New Item
                </div>
              </Link>
              <Link href="/dashboard/assignments">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <Users className="w-4 h-4" />
                  Assignments
                </div>
              </Link>
              <Link href="/dashboard/items">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <Package className="w-4 h-4" />
                  All Items
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Database Table */}
        <div className="flex-1 min-w-0">
          <Card className="border-2 overflow-hidden">
            {/* Category Header */}
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 py-3 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white">
                  {activeCategoryConfig?.label || "Items"}
                </CardTitle>
                <span className="text-sm text-white/80 font-medium">
                  {activeItems.length} item{activeItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            {/* Database Table Header */}
            <div className="bg-orange-100 border-b-2 border-orange-200">
              <div className="px-4 py-1 text-center">
                <span className="text-sm font-bold text-orange-800 tracking-wider">
                  DATABASE
                </span>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orange-50 border-b-2 border-orange-200">
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Item Number
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Name
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Quantity
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Color
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Customer
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Target Output
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Deadline
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Raw Materials
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-center py-2.5 px-3 font-bold text-xs text-orange-900 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-16 text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-semibold text-gray-500">
                            No items in {activeCategoryConfig?.label}
                          </p>
                          <p className="text-sm mt-1 text-gray-400">
                            Create a new item to get started
                          </p>
                          <Link href="/dashboard/items/new" className="mt-4 inline-block">
                            <Button size="sm" className="mt-4">
                              <PlusCircle className="w-4 h-4 mr-2" />
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
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-xs font-bold text-blue-600">
                                {item.itemNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 border">
                                {TYPE_LABELS[item.type] || item.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-gray-700">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">
                              {item.color || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-gray-700 font-medium">
                              {item.customer}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-gray-700">
                              {item.targetOutput.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs">
                                  {new Date(item.deadline).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <RawMaterialsSelect
                                itemId={item.id}
                                currentStatus={item.rawMaterials}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Link href={`/dashboard/items/${item.id}`}>
                                <Button variant="outline" size="sm" className="text-xs h-7">
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
