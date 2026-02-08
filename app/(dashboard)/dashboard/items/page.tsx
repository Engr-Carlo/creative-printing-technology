import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

async function getItems() {
  return prisma.item.findMany({
    include: {
      department: true,
      _count: {
        select: {
          processes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default async function ItemsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Admin and Encoder can access this page
  if (session.user.role !== "ADMIN" && session.user.role !== "ENCODER") {
    redirect("/dashboard");
  }

  const items = await getItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Items Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all production items and their status
          </p>
        </div>
        <Link href="/dashboard/items/new">
          <Button size="lg" className="shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New Item
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {items.filter((i) => i.status === "PENDING").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {items.filter((i) => i.status === "IN_PROGRESS").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {items.filter((i) => i.status === "COMPLETED").length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>
            Complete list of all production items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Item Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Progress</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Processes</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No items found</p>
                      <p className="text-sm mt-1">Create your first item to get started</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const config = statusConfig[item.status as keyof typeof statusConfig];
                    const StatusIcon = config?.icon || Clock;
                    const progress = item.targetOutput > 0 
                      ? Math.round((item.currentOutput / item.targetOutput) * 100)
                      : 0;

                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm font-semibold text-blue-600">
                            {item.itemNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.type}</td>
                        <td className="py-3 px-4">
                          <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {item.department.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="font-semibold">{item.currentOutput.toLocaleString()}</span>
                          <span className="text-gray-500"> / {item.targetOutput.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className="bg-gradient-to-r from-primary to-orange-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 min-w-[40px]">
                              {progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config?.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {item._count.processes}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/items/${item.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
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
  );
}
