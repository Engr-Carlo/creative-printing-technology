import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, User, Bell, Lock, Shield, Building2 } from "lucide-react";
import { ProfileForm } from "@/components/ProfileForm";
import { PasswordForm } from "@/components/PasswordForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-3 p-2">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your account and {isAdmin ? "system" : "personal"} preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Settings Navigation */}
        <Card className="border lg:col-span-1">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Settings Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3 pt-0">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
              <User className="w-4 h-4" />
              Profile
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors">
              <Lock className="w-4 h-4" />
              Security
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors">
              <Bell className="w-4 h-4" />
              Notifications
            </button>
            {isAdmin && (
              <>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors">
                  <Building2 className="w-4 h-4" />
                  Departments
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors">
                  <Shield className="w-4 h-4" />
                  System Settings
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="border lg:col-span-2">
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-3 pt-0">
            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{session.user.name}</h3>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
                <p className="text-[10px] text-primary font-semibold mt-0.5">
                  {session.user.role === "ADMIN" ? "Administrator" : 
                   session.user.role === "ENCODER" ? "Encoder" : "Employee"}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-4 mb-4">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  defaultValue={
                    session.user.role === "ADMIN" ? "Administrator" : 
                    session.user.role === "ENCODER" ? "Encoder" : "Employee"
                  }
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">
                  Contact an administrator to change your role
                </p>
              </div>
              
              <ProfileForm 
                userName={session.user.name || ""} 
                userEmail={session.user.email || ""}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card className="border">
        <CardHeader className="p-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Password & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <PasswordForm />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <Building2 className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Manage Departments</h3>
                <p className="text-sm text-muted-foreground">
                  Add, edit, or remove departments
                </p>
              </div>
              <div className="p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <Settings className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Manage Machines</h3>
                <p className="text-sm text-muted-foreground">
                  Configure production machines
                </p>
              </div>
              <div className="p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <Bell className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Notification Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure system notifications
                </p>
              </div>
              <div className="p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <Shield className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  Manage role permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
