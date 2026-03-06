import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { RawMaterialsSelect } from "@/components/RawMaterialsSelect";

async function getItems() {
  return prisma.item.findMany({
    select: {
      id: true,
      itemNumber: true,
      name: true,
      type: true,
      status: true,
      currentOutput: true,
      targetOutput: true,
      rawMaterials: true,
      department: { select: { name: true } },
      _count: { select: { processes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
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
    <div className="space-y-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Items Management</h1>
          <p className="text-xs text-muted-foreground">Manage production items</p>
        </div>
        <Link href="/dashboard/items/new">
          <Button size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />New Item</Button>
        </Link>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{items.length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Pending</p>
          <p className="text-lg font-bold text-yellow-600">{items.filter((i) => i.status === "PENDING").length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">In Progress</p>
          <p className="text-lg font-bold text-blue-600">{items.filter((i) => i.status === "IN_PROGRESS").length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Completed</p>
          <p className="text-lg font-bold text-green-600">{items.filter((i) => i.status === "COMPLETED").length}</p>
        </CardContent></Card>
      </div>

      {/* Items Table */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Item #</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Dept</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Output</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Progress</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Raw Mat.</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Proc.</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground text-xs">No items found</td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const config = statusConfig[item.status as keyof typeof statusConfig];
                    const StatusIcon = config?.icon || Clock;
                    const progress = item.targetOutput > 0 
                      ? Math.round((item.currentOutput / item.targetOutput) * 100)
                      : 0;

                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono font-semibold text-blue-600">{item.itemNumber}</td>
                        <td className="py-1.5 px-2 font-medium">{item.name}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{item.type}</td>
                        <td className="py-1.5 px-2"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{item.department.name}</span></td>
                        <td className="py-1.5 px-2">
                          <span className="font-semibold">{item.currentOutput}</span>
                          <span className="text-muted-foreground">/{item.targetOutput}</span>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[60px]">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <RawMaterialsSelect itemId={item.id} currentStatus={(item as any).rawMaterials || "SHORT"} />
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${config?.color}`}>
                            <StatusIcon className="w-2.5 h-2.5" />{config?.label}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{item._count.processes}</span>
                        </td>
                        <td className="py-1.5 px-2">
                          <Link href={`/dashboard/items/${item.id}`}>
                            <Button variant="outline" size="sm" className="h-5 text-[10px] px-2">View</Button>
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
