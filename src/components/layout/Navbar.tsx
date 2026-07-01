"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import {
  FileText,
  LogOut,
  User,
  Wifi,
  WifiOff,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { getInitials } from "@/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const { isOnline } = useConnectionStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={session ? "/dashboard" : "/"}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center transition-transform group-hover:scale-110">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              SyncScribe
            </span>
          </Link>

          {/* Desktop nav items */}
          <div className="hidden md:flex items-center gap-4">
            {/* Connection Status */}
            <div
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{
                background: isOnline
                  ? "oklch(0.45 0.15 155 / 0.15)"
                  : "oklch(0.55 0.2 25 / 0.15)",
              }}
            >
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span
                className={isOnline ? "text-emerald-400" : "text-red-400"}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      getInitials(session.user.name || "U")
                    )}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs px-3 py-2">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span className={isOnline ? "text-emerald-400" : "text-red-400"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-secondary text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium px-3 py-2 rounded-md bg-primary text-primary-foreground text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
