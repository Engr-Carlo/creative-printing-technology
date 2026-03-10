import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Shield, Briefcase, User } from "lucide-react";
import prisma from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";

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
  EMPLOYEE: { label: "Line Leader", color: "bg-green-100 text-green-800 border-green-300", icon: User },
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
    <div className="space-y-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Button size="sm" className="h-7 text-xs">
          <UserPlus className="w-3.5 h-3.5 mr-1" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-blue-600">{stats.total}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Admins</p>
          <p className="text-lg font-bold text-purple-600">{stats.admins}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Encoders</p>
          <p className="text-lg font-bold text-blue-600">{stats.encoders}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-2">
          <p className="text-[10px] text-muted-foreground">Line Leaders</p>
          <p className="text-lg font-bold text-green-600">{stats.employees}</p>
        </CardContent></Card>
      </div>

      {/* Users Table */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Department</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Joined</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const config = roleConfig[user.role as keyof typeof roleConfig];
                  const RoleIcon = config?.icon || User;

                  return (
                    <tr key={user.id} className="border-b hover:bg-muted/20">
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground">{user.email}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${config?.color}`}>
                          {config?.label}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        {user.department?.name ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {user.department.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-5 text-[10px] px-2">
                            Edit
                          </Button>
                          {user.id !== session.user.id && (
                            <DeleteButton id={user.id} type="user" name={user.name} />
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
