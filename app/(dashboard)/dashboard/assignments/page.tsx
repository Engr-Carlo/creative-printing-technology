import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Package, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import { CreateAssignmentDialog } from "@/components/CreateAssignmentDialog";

async function getAssignments() {
  // Optimize: Combine queries and use counts from the main query
  const [allAssignments, items, users] = await Promise.all([
    prisma.itemAssignment.findMany({
      select: {
        id: true,
        assignedAt: true,
        item: {
          select: {
            id: true,
            itemNumber: true,
            name: true,
            status: true,
            department: {
              select: { name: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 50, // Limit to recent 50 assignments for performance
    }),
    prisma.item.findMany({
      select: {
        id: true,
        itemNumber: true,
        name: true,
      },
      where: {
        status: { not: "COMPLETED" }, // Only show items that aren't completed
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit for performance
    }),
    prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculate counts from the data we already have
  const assignedItems = allAssignments.length;
  const totalItems = items.length;
  const unassignedItems = totalItems - assignedItems;

  return {
    totalItems,
    assignedItems,
    unassignedItems,
    allAssignments,
    items,
    users,
  };
}

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Encoder can access this page
  if (session.user.role !== "ENCODER") {
    redirect("/dashboard");
  }

  const data = await getAssignments();

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Item Assignments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage item assignments to employees
          </p>
        </div>
        <CreateAssignmentDialog items={data.items} users={data.users} />
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalItems}</p>
              </div>
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold text-green-600">{data.assignedItems}</p>
              </div>
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">{data.unassignedItems}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {data.unassignedItems > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  {data.unassignedItems} {data.unassignedItems === 1 ? "item needs" : "items need"} assignment
                </h3>
                <p className="text-sm text-orange-800">
                  Some items don't have employees assigned yet. Assign them to keep production on track.
                </p>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Assign Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments Table - Compact */}
      <Card className="border-2">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Recent Assignments</CardTitle>
          <CardDescription className="text-xs">Item assignments to employees (showing last 50)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[calc(100vh-420px)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Assigned To</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Item</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Department</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Assigned Date</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.allAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs font-medium">No assignments found</p>
                    </td>
                  </tr>
                ) : (
                  data.allAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                            {assignment.user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[11px]">{assignment.user.name}</p>
                            <p className="text-[10px] text-muted-foreground">{assignment.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-[11px]">{assignment.item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {assignment.item.itemNumber}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                          {assignment.item.department.name}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[11px] font-medium">
                          {assignment.item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-gray-600">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/items/${assignment.item.id}`}>
                            <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
                              View
                            </Button>
                          </Link>
                          <DeleteButton id={assignment.id} type="assignment" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
