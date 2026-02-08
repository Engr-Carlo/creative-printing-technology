"use client";

import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import { authenticate } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Building2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" className="w-full" disabled={pending} size="lg">
      {pending ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          Signing in...
        </>
      ) : (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </>
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(authenticate, { error: null });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-500/5"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-2xl shadow-2xl shadow-primary/30 mb-4 transform hover:scale-105 transition-transform">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-orange-600 to-primary bg-clip-text text-transparent mb-2">
            Creative Printing Technology
          </h1>
          <p className="text-muted-foreground font-medium">Production Monitoring System</p>
        </div>

        <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/80">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              
              {state?.error && (
                <div className="bg-destructive/10 border-2 border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {state.error}
                  </div>
                </div>
              )}
              
              <SubmitButton />
            </form>

            {/* Demo Accounts */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Demo Accounts
              </p>
              <div className="space-y-2 text-xs bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-lg border">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="font-semibold text-foreground">Admin:</span>
                  <code className="bg-background px-2.5 py-1 rounded border font-mono">admin@cpt.com</code>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="font-semibold text-foreground">Line Leader:</span>
                  <code className="bg-background px-2.5 py-1 rounded border font-mono">lineleader@cpt.com</code>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="font-semibold text-foreground">Encoder:</span>
                  <code className="bg-background px-2.5 py-1 rounded border font-mono">encoder@cpt.com</code>
                </div>
                <div className="pt-3 border-t border-border mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Password (all):</span>
                    <code className="bg-background px-2.5 py-1 rounded border font-mono">password123</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 font-medium">
          © 2026 Creative Printing Technology Philippines Inc.
        </p>
      </div>
    </div>
  );
}
