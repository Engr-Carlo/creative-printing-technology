import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function getMyItems(userId: string) {
  return prisma.item.findMany({
    where: {
      assignments: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      itemNumber: true,
      type: true,
      status: true,
      currentOutput: true,
      targetOutput: true,
      deadline: true,
      department: { select: { name: true } },
      processes: {
        where: { assignedToId: userId },
        select: { id: true, name: true, status: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

export default async function MyItemsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EMPLOYEE") redirect("/dashboard");

  const items = await getMyItems(session.user.id);

  return (
    <div className="space-y-3 p-2">
      <div>
        <h1 className="text-lg font-bold text-gray-900">My Items</h1>
        <p className="text-xs text-muted-foreground">Items assigned to you</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Assigned</p>
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

      {items.length === 0 ? (
        <Card className="border">
          <CardContent className="py-8 text-center text-muted-foreground text-xs">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No items assigned yet
          </CardContent>
        </Card>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Item #</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Dept</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Output</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">My Processes</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Deadline</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const config = statusConfig[item.status as keyof typeof statusConfig];
                    const progress = item.targetOutput > 0 ? Math.round((item.currentOutput / item.targetOutput) * 100) : 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono font-semibold text-blue-600">{item.itemNumber}</td>
                        <td className="py-1.5 px-2 font-medium">{item.name}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{item.department.name}</td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{item.currentOutput}/{item.targetOutput}</span>
                            <span className="text-[10px] text-muted-foreground">({progress}%)</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config?.color}`}>
                            {config?.label}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex flex-wrap gap-1">
                            {item.processes.map((proc) => (
                              <span key={proc.id} className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                                proc.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                proc.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                                proc.status === "DELAYED" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>{proc.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">
                          {item.deadline ? new Date(item.deadline).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-1.5 px-2">
                          <Link href={`/dashboard/items/${item.id}`}>
                            <Button variant="outline" size="sm" className="h-5 text-[10px] px-2">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
