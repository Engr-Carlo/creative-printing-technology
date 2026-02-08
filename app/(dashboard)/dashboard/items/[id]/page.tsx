import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, User, Building2 } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

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
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const processStatusConfig = {
  NOT_STARTED: { label: "Not Started", color: "bg-gray-100 text-gray-800 border-gray-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const item = await getItem(params.id);
  
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/items">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Output Progress</p>
                <p className="text-2xl font-bold text-primary">{progress}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.currentOutput.toLocaleString()} / {item.targetOutput.toLocaleString()}
                </p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Process Progress</p>
                <p className="text-2xl font-bold text-blue-600">{processProgress}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedProcesses} / {totalProcesses} completed
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-lg font-bold">{item.department.name}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                <p className="text-sm font-bold">
                  {new Date(item.deadline).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.deadline).toLocaleTimeString()}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Details */}
        <Card className="border-2 lg:col-span-2">
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
                <p className="text-sm font-bold text-primary">{progress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-primary to-orange-600 h-4 rounded-full transition-all flex items-center justify-end px-2"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                >
                  {progress > 10 && (
                    <span className="text-xs font-bold text-white">{progress}%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Assigned Users
            </CardTitle>
            <CardDescription>
              {item.assignments.length} {item.assignments.length === 1 ? "user" : "users"} assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {item.assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No users assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {item.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      {assignment.user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{assignment.user.name}</p>
                      <p className="text-xs text-muted-foreground">{assignment.user.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processes */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Production Processes</CardTitle>
          <CardDescription>
            Sequential workflow for this item ({completedProcesses} of {totalProcesses} completed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalProcesses === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No processes defined yet</p>
              <p className="text-sm mt-1">Add processes to track production workflow</p>
            </div>
          ) : (
            <div className="space-y-3">
              {item.processes.map((process) => {
                const pConfig = processStatusConfig[process.status as keyof typeof processStatusConfig];
                const PStatusIcon = pConfig?.icon || Clock;

                return (
                  <div
                    key={process.id}
                    className="flex items-center gap-4 p-4 rounded-lg border-2 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                      {process.order}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{process.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {process.machine && (
                          <span>Machine: {process.machine.name}</span>
                        )}
                        {process.assignedTo && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {process.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${pConfig?.color}`}>
                        <PStatusIcon className="w-3.5 h-3.5" />
                        {pConfig?.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
