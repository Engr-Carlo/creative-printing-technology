import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Package, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";

async function getAssignments() {
  const [totalItems, assignedItems, unassignedItems, allAssignments] = await Promise.all([
    prisma.item.count(),
    prisma.itemAssignment.count(),
    prisma.item.count({
      where: {
        assignments: {
          none: {},
        },
      },
    }),
    prisma.itemAssignment.findMany({
      include: {
        item: {
          include: {
            department: true,
          },
        },
        user: true,
      },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  return {
    totalItems,
    assignedItems,
    unassignedItems,
    allAssignments,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Item Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage item assignments to employees
          </p>
        </div>
        <Button size="lg" className="shadow-lg">
          <UserCheck className="w-5 h-5 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned</p>
                <p className="text-3xl font-bold text-green-600">{data.assignedItems}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                <p className="text-3xl font-bold text-orange-600">{data.unassignedItems}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
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

      {/* Assignments Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>Complete list of item assignments to employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Assigned To</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Item Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Assigned Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.allAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No assignments found</p>
                      <p className="text-sm mt-1">Start assigning items to employees</p>
                    </td>
                  </tr>
                ) : (
                  data.allAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                            {assignment.user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{assignment.user.name}</p>
                            <p className="text-xs text-muted-foreground">{assignment.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{assignment.item.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {assignment.item.itemNumber}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm bg-gray-100 px-2.5 py-1 rounded font-medium">
                          {assignment.item.department.name}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium">
                          {assignment.item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            Remove
                          </Button>
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
