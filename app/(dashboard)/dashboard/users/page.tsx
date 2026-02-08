import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Shield, Briefcase, User } from "lucide-react";
import prisma from "@/lib/prisma";

async function getUsers() {
  return prisma.user.findMany({
    include: {
      department: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

const roleConfig = {
  ADMIN: { label: "Administrator", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Shield },
  ENCODER: { label: "Encoder", color: "bg-blue-100 text-blue-800 border-blue-300", icon: Briefcase },
  EMPLOYEE: { label: "Employee", color: "bg-green-100 text-green-800 border-green-300", icon: User },
};

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Admin can access user management
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await getUsers();

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    encoders: users.filter((u) => u.role === "ENCODER").length,
    employees: users.filter((u) => u.role === "EMPLOYEE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage system users and their roles
          </p>
        </div>
        <Button size="lg" className="shadow-lg">
          <UserPlus className="w-5 h-5 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administrators</p>
                <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Encoders</p>
                <p className="text-3xl font-bold text-blue-600">{stats.encoders}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Employees</p>
                <p className="text-3xl font-bold text-green-600">{stats.employees}</p>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Complete list of system users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Joined</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const config = roleConfig[user.role as keyof typeof roleConfig];
                  const RoleIcon = config?.icon || User;

                  return (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config?.color}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {config?.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {user.department?.name ? (
                          <span className="text-sm bg-gray-100 px-2.5 py-1 rounded font-medium">
                            {user.department.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          {user.id !== session.user.id && (
                            <Button variant="outline" size="sm">
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
