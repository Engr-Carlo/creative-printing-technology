"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b shadow-sm px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
            Production Dashboard
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Welcome back, <span className="text-foreground font-semibold">{user.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="outline" size="icon" className="relative hover:bg-muted/50">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </Button>

          {/* Logout */}
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hover:bg-destructive hover:text-white hover:border-destructive transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
