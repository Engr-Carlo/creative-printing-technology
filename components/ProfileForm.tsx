"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/actions/users";
import { useEffect } from "react";

const initialState = {
  error: "",
};

export function ProfileForm({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  useEffect(() => {
    if ((state as any).success) {
      alert("Profile updated successfully!");
    } else if (state.error) {
      alert(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={userName}
          placeholder="John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={userEmail}
          placeholder="john@example.com"
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Save Changes
      </Button>
    </form>
  );
}
