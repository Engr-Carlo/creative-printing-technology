"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserX } from "lucide-react";
import { deleteUser } from "@/app/actions/users";
import { removeAssignment } from "@/app/actions/assignments";

interface DeleteButtonProps {
  id: string;
  type: "user" | "assignment";
  name?: string;
}

export function DeleteButton({ id, type, name }: DeleteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    const confirmMessage = type === "user" 
      ? `Are you sure you want to delete ${name || "this user"}? This action cannot be undone.`
      : "Are you sure you want to remove this assignment?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = type === "user" 
        ? await deleteUser(id)
        : await removeAssignment(id);

      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (error) {
      alert(`Failed to delete ${type}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isLoading}
      className="border-red-300 text-red-700 hover:bg-red-50"
    >
      {isLoading ? (
        <div className="w-3 h-3 border-2 border-red-700 border-t-transparent rounded-full animate-spin mr-2" />
      ) : type === "user" ? (
        <Trash2 className="w-3 h-3 mr-1" />
      ) : (
        <UserX className="w-3 h-3 mr-1" />
      )}
      {type === "user" ? "Delete" : "Remove"}
    </Button>
  );
}
