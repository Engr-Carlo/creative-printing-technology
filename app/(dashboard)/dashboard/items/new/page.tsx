import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { CreateItemForm } from "@/components/CreateItemForm";

async function getDepartments() {
  return prisma.department.findMany({
    orderBy: { name: "asc" },
  });
}

export default async function NewItemPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Only Admin and Encoder can create items
  if (session.user.role !== "ADMIN" && session.user.role !== "ENCODER") {
    redirect("/dashboard");
  }

  const departments = await getDepartments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/items">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Item</h1>
          <p className="text-muted-foreground mt-1">
            Add a new production item to the system
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Item Details
          </CardTitle>
          <CardDescription>
            Fill in all required information for the new item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateItemForm departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
