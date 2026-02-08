"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/actions/users";
import { useEffect, useRef } from "react";

const initialState = {
  error: "",
};

export function PasswordForm() {
  const [state, formAction] = useFormState(updatePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if ((state as any).success) {
      alert("Password updated successfully!");
      formRef.current?.reset();
    } else if (state.error) {
      alert(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
        />
      </div>

      <Button type="submit" className="w-full">
        Update Password
      </Button>
    </form>
  );
}
