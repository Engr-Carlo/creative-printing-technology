import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function getMyItems(userId: string) {
  return prisma.item.findMany({
    where: {
      assignments: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      department: true,
      processes: {
        where: {
          assignedToId: userId,
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
  DELAYED: { label: "Delayed", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default async function MyItemsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Employee can access this page
  if (session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const items = await getMyItems(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Items</h1>
        <p className="text-muted-foreground mt-1">
          Items assigned to you for production
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assigned</p>
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

      {/* Items Grid */}
      {items.length === 0 ? (
        <Card className="border-2">
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No items assigned yet</h3>
              <p className="text-sm">You don't have any items assigned to you at the moment.</p>
              <p className="text-sm">Check back later or contact your supervisor.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            const StatusIcon = config?.icon || Clock;
            const progress = item.targetOutput > 0 
              ? Math.round((item.currentOutput / item.targetOutput) * 100)
              : 0;

            return (
              <Card key={item.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {item.itemNumber}
                      </CardDescription>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config?.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config?.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-semibold">{item.department.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-semibold">{item.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-semibold">
                        {item.currentOutput.toLocaleString()} / {item.targetOutput.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">My Processes</span>
                      <span className="font-semibold">{item.processes.length}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary to-orange-600 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {item.deadline && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="font-semibold">
                        {new Date(item.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <Link href={`/dashboard/items/${item.id}`}>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
