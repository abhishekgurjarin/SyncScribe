import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-2xl border shadow-sm text-center">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="w-10 h-10" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
          <p className="text-muted-foreground text-sm">
            {error === "Configuration"
              ? "There is a problem with the server configuration. (Missing environment variables for an authentication provider)"
              : error === "AccessDenied"
              ? "You do not have permission to sign in."
              : error === "Verification"
              ? "The verification token has expired or has already been used."
              : "An unexpected authentication error occurred. Please try again."}
          </p>
        </div>
        <div className="pt-4">
          <Link
            href="/auth/signin"
            className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 h-10 px-4 py-2 text-sm font-medium transition-colors"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
