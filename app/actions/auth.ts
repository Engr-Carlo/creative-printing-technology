"use server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth.schema";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: { error: string | null } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validatedFields = loginSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    return {
      error: "Invalid email or password format",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}
