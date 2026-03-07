"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, CalendarDays } from "lucide-react";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="bg-white border-b shadow-sm px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Creative Printing Technology</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {today}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right border-r pr-3">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
