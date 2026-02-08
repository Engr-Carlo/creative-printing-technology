"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Settings,
  BarChart3,
  Users,
  Building2,
} from "lucide-react";

interface DashboardSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const navigation = [
  // Admin navigation
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { name: "Items", href: "/dashboard/items", icon: Package, roles: ["ADMIN"] },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["ADMIN"] },
  { name: "Users", href: "/dashboard/users", icon: Users, roles: ["ADMIN"] },
  
  // Encoder navigation
  { name: "Dashboard", href: "/dashboard/encoder", icon: LayoutDashboard, roles: ["ENCODER"] },
  { name: "Items", href: "/dashboard/items", icon: Package, roles: ["ENCODER"] },
  { name: "Assignments", href: "/dashboard/assignments", icon: Users, roles: ["ENCODER"] },
  
  // Employee navigation
  { name: "Dashboard", href: "/dashboard/employee", icon: LayoutDashboard, roles: ["EMPLOYEE"] },
  { name: "My Items", href: "/dashboard/my-items", icon: Package, roles: ["EMPLOYEE"] },
  { name: "My Processes", href: "/dashboard/my-processes", icon: LayoutDashboard, roles: ["EMPLOYEE"] },
  
  // Common for all
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "ENCODER", "EMPLOYEE"] },
];

export default function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const userRole = user.role || "EMPLOYEE";

  const filteredNav = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">CPT</h2>
            <p className="text-xs text-gray-400">Production System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/30"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
              <Icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110 relative z-10",
                isActive ? "text-white" : "text-gray-400 group-hover:text-white"
              )} />
              <span className="font-semibold relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {user.role?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
