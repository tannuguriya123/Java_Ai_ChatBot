"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AlertCircle, FolderGit2 } from "lucide-react";

import { BrandMark } from "@/components/layout/app-shell";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/use-auth";
import { getGitHubLoginUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

function LoginContent() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");
  const next = params.get("next") || "/dashboard";
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [user, isLoading, next, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(from_var(--primary)_l_c_h/0.1),transparent_50%)]" />
      <header className="relative z-10 flex h-14 items-center justify-between px-4">
        <Link href="/">
          <BrandMark />
        </Link>
        <ModeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FolderGit2 className="size-6" />
            </div>
            <h1 className="font-heading text-xl font-semibold">Sign in to DevPilot</h1>
            <p className="text-sm text-muted-foreground">
              Use GitHub to access your public and private repositories.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Authentication failed</AlertTitle>
                <AlertDescription>
                  Could not complete GitHub sign-in ({error}). Please try again.
                </AlertDescription>
              </Alert>
            )}
            <a
              href={getGitHubLoginUrl()}
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex w-full items-center justify-center gap-1.5"
              )}
            >
              <FolderGit2 className="size-4" />
              Continue with GitHub
            </a>
            <p className="text-center text-xs text-muted-foreground">
              Scopes requested: <code>read:user</code>, <code>repo</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
