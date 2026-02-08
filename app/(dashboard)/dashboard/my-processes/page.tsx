import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle } from "lucide-react";
import prisma from "@/lib/prisma";

async function getMyProcesses(userId: string) {
  return prisma.process.findMany({
    where: {
      assignedToId: userId,
    },
    include: {
      item: {
        include: {
          department: true,
        },
      },
      machine: true,
      assignedTo: true,
    },
    orderBy: { order: "asc" },
  });
}

const statusConfig = {
  NOT_STARTED: { label: "Not Started", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300", icon: PlayCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default async function MyProcessesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Employee can access this page
  if (session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const processes = await getMyProcesses(session.user.id);

  const stats = {
    total: processes.length,
    pending: processes.filter((p) => p.status === "NOT_STARTED").length,
    inProgress: processes.filter((p) => p.status === "IN_PROGRESS").length,
    completed: processes.filter((p) => p.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Processes</h1>
        <p className="text-muted-foreground mt-1">
          All processes assigned to you across different items
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Processes</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processes Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>All My Processes</CardTitle>
          <CardDescription>Complete list of processes assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Process</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Machine</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No processes assigned yet</p>
                      <p className="text-sm mt-1">You don't have any processes assigned to you at the moment</p>
                    </td>
                  </tr>
                ) : (
                  processes.map((process) => {
                    const config = statusConfig[process.status as keyof typeof statusConfig];
                    const StatusIcon = config?.icon || Clock;

                    return (
                      <tr key={process.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-semibold text-primary">{process.name}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{process.item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {process.item.itemNumber}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm bg-gray-100 px-2.5 py-1 rounded font-medium">
                            {process.item.department.name}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {process.machine ? (
                            <span className="text-sm">{process.machine.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                            {process.order}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config?.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config?.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {process.status === "NOT_STARTED" && (
                              <Button size="sm" className="text-xs">
                                Start Process
                              </Button>
                            )}
                            {process.status === "IN_PROGRESS" && (
                              <Button size="sm" variant="outline" className="text-xs">
                                Update Status
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-xs">
                              View Details
                            </Button>
                          </div>
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
