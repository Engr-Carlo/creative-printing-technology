import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 import { ArrowLeft, Package, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, Building2, BoxIcon, PackageCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { RawMaterialsSelect, RawMaterialsBadge } from "@/components/RawMaterialsSelect";
import { ItemMaterialsCard } from "@/components/inventory/ItemMaterialsCard";
import { getInventoryItems, getItemMaterials } from "@/app/actions/inventory";

async function getItem(id: string) {
  return prisma.item.findUnique({
    where: { id },
    include: {
      department: true,
      processes: {
        include: {
          assignedTo: true,
          machine: true,
        },
        orderBy: { order: "asc" },
      },
      assignments: {
        include: {
          user: true,
        },
      },
    },
  });
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const processStatusConfig = {
  NOT_STARTED: { label: "Not Started", color: "bg-gray-100 text-gray-700 border-gray-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  DELAYED: { label: "Delayed", color: "bg-orange-100 text-orange-800 border-orange-300", icon: AlertCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default async function ItemDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const [item, materialUsages, inventoryItems] = await Promise.all([
    getItem(id),
    getItemMaterials(id),
    getInventoryItems(),
  ]);
  
  if (!item) {
    notFound();
  }

  const config = statusConfig[item.status as keyof typeof statusConfig];
  const StatusIcon = config?.icon || Clock;
  const progress = item.targetOutput > 0 
    ? Math.round((item.currentOutput / item.targetOutput) * 100)
    : 0;

  const completedProcesses = item.processes.filter(p => p.status === "COMPLETED").length;
  const totalProcesses = item.processes.length;
  const processProgress = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;

  return (
    <div className="space-y-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/items">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{item.name}</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {item.itemNumber}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${config?.color}`}>
          <StatusIcon className="w-4 h-4" />
          {config?.label}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Output</p>
          <p className="text-lg font-bold text-primary">{progress}%</p>
          <p className="text-[10px] text-muted-foreground">{item.currentOutput}/{item.targetOutput}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Processes</p>
          <p className="text-lg font-bold text-blue-600">{processProgress}%</p>
          <p className="text-[10px] text-muted-foreground">{completedProcesses}/{totalProcesses}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Department</p>
          <p className="text-sm font-bold">{item.department.name}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Deadline</p>
          <p className="text-sm font-bold">{new Date(item.deadline).toLocaleDateString()}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Item Details */}
        <Card className="border">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Complete information about this item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="font-semibold">{item.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-semibold">{item.customer}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                <p className="font-semibold">{item.quantity.toLocaleString()} units</p>
              </div>
              {item.color && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Color</p>
                  <p className="font-semibold">{item.color}</p>
                </div>
              )}
              {(item as any).machines && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Machine(s)</p>
                  <p className="font-semibold">{(item as any).machines}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Raw Materials</p>
                <div className="mt-1">
                  {session.user.role === "ADMIN" ? (
                    <RawMaterialsSelect itemId={item.id} currentStatus={(item as any).rawMaterials || "AVAILABLE"} />
                  ) : (
                    <RawMaterialsBadge status={(item as any).rawMaterials || "AVAILABLE"} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="font-semibold">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Production Progress</p>
                <p className="text-sm font-bold text-primary">{processProgress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-primary to-orange-600 h-4 rounded-full transition-all flex items-center justify-end px-2"
                  style={{ width: `${Math.min(processProgress, 100)}%` }}
                >
                  {processProgress > 10 && (
                    <span className="text-xs font-bold text-white">{processProgress}%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Material Requirements */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-orange-500" />
            Material Requirements
          </CardTitle>
          <CardDescription className="text-xs">
            Raw materials needed for this job — linked to inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemMaterialsCard
            itemId={item.id}
            initialUsages={materialUsages as any}
            inventoryOptions={inventoryItems as any}
            rawMaterials={(item as any).rawMaterials ?? "AVAILABLE"}
            isAdmin={session.user.role === "ADMIN"}
          />
        </CardContent>
      </Card>

      {/* Processes */}
      <Card className="border">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Production Processes</CardTitle>
          <CardDescription className="text-xs">
            {completedProcesses} of {totalProcesses} completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalProcesses === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No processes defined yet</p>
              <p className="text-sm mt-1">Processes are auto-created when an item is created</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">#</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">Process</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">Machine</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">Status</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">Started</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 text-xs uppercase">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {item.processes.map((process) => {
                    const pConfig = processStatusConfig[process.status as keyof typeof processStatusConfig];
                    const PStatusIcon = pConfig?.icon || Clock;
                    const fmt = (d: Date | null) =>
                      d ? new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
                    return (
                      <tr key={process.id} className={`border-b transition-colors ${
                        process.status === 'IN_PROGRESS' ? 'bg-blue-50' :
                        process.status === 'COMPLETED' ? 'bg-green-50/40' :
                        process.status === 'REJECTED' ? 'bg-red-50/40' :
                        process.status === 'DELAYED' ? 'bg-orange-50/40' :
                        'hover:bg-gray-50'
                      }`}>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            process.status === 'IN_PROGRESS' ? 'bg-blue-200 text-blue-800' :
                            process.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                            process.status === 'REJECTED' ? 'bg-red-200 text-red-800' :
                            'bg-gray-200 text-gray-700'
                          }`}>{process.order}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{process.name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{(item as any).machines || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${pConfig?.color}`}>
                            <PStatusIcon className="w-3 h-3" />
                            {pConfig?.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {fmt(process.startedAt) ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {fmt(process.completedAt) ?? <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
