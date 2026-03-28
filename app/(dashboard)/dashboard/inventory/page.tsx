import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Package, ArrowLeft } from "lucide-react";
import { getInventoryItems } from "@/app/actions/inventory";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import Link from "next/link";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const items = await getInventoryItems();

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="rounded-lg border p-2 hover:bg-gray-50">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Inventory Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage raw materials and track stock levels
            </p>
          </div>
        </div>
      </div>

      <InventoryClient initialItems={items} />
    </div>
  );
}
