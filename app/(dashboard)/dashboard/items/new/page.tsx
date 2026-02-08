import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { createItem } from "@/app/actions/items";

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
          <form action={createItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Number */}
              <div className="space-y-2">
                <Label htmlFor="itemNumber" className="text-sm font-semibold">
                  Item Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="itemNumber"
                  name="itemNumber"
                  placeholder="e.g., ITEM-2024-001"
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Unique identifier for this item</p>
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Corrugated Box 12x12x8"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold">
                  Item Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="type"
                  name="type"
                  placeholder="e.g., Box, Label, Manual"
                  required
                />
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-semibold">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer"
                  name="customer"
                  placeholder="e.g., ABC Corporation"
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="departmentId" className="text-sm font-semibold">
                  Department <span className="text-red-500">*</span>
                </Label>
                <select
                  id="departmentId"
                  name="departmentId"
                  required
                  className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-semibold">
                  Color (Optional)
                </Label>
                <Input
                  id="color"
                  name="color"
                  placeholder="e.g., White, Brown, Custom"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="e.g., 1000"
                  required
                />
                <p className="text-xs text-muted-foreground">Total units to produce</p>
              </div>

              {/* Target Output */}
              <div className="space-y-2">
                <Label htmlFor="targetOutput" className="text-sm font-semibold">
                  Target Output <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="targetOutput"
                  name="targetOutput"
                  type="number"
                  min="1"
                  placeholder="e.g., 1000"
                  required
                />
                <p className="text-xs text-muted-foreground">Expected production target</p>
              </div>

              {/* Deadline */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="deadline" className="text-sm font-semibold">
                  Deadline <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="datetime-local"
                  required
                />
                <p className="text-xs text-muted-foreground">Target completion date and time</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" size="lg" className="min-w-[150px]">
                <Package className="w-4 h-4 mr-2" />
                Create Item
              </Button>
              <Link href="/dashboard/items">
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
