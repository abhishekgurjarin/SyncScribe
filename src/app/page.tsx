import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import {
  FileText,
  Wifi,
  WifiOff,
  GitBranch,
  Users,
  Sparkles,
  Shield,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                SyncScribe
              </span>
            </div>
            <Link
              href="/auth/signin"
              className="text-sm font-medium px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Animated gradient background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-violet-500/10 animate-gradient" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
            <div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-float"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-fade-in">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>Local-First • Offline-Ready • AI-Powered</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Write Together,
                <br />
                <span className="bg-gradient-to-r from-primary via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Even Apart
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                A collaborative document editor that works{" "}
                <strong className="text-foreground">without internet</strong>.
                Real-time sync when online, deterministic CRDT-based conflict
                resolution, granular version history, and AI-powered writing
                assistance.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signin"
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-all hover:scale-105 animate-pulse-glow"
                >
                  Start Writing
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="https://github.com/abhishek"
                  target="_blank"
                  className="flex items-center gap-2 px-8 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                >
                  View on GitHub
                </Link>
              </div>
            </div>

            {/* Editor Preview */}
            <div
              className="mt-16 max-w-4xl mx-auto animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="glass rounded-2xl p-1 shadow-2xl shadow-primary/5">
                <div className="rounded-xl bg-card overflow-hidden">
                  {/* Mock toolbar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <span className="text-xs text-muted-foreground px-3 py-1 rounded-md bg-secondary">
                        Project Proposal.md
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Wifi className="w-3 h-3" /> Online
                      </span>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center text-[10px] font-bold text-white">
                          A
                        </div>
                        <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-[10px] font-bold text-white">
                          B
                        </div>
                        <div className="w-6 h-6 rounded-full bg-violet-500 border-2 border-card flex items-center justify-center text-[10px] font-bold text-white">
                          C
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Mock content */}
                  <div className="p-6 text-left">
                    <h2 className="text-2xl font-bold mb-2">
                      Project Proposal: SyncScribe
                    </h2>
                    <p className="text-muted-foreground mb-3">
                      SyncScribe is a local-first collaborative document editor
                      designed to provide a seamless writing experience
                      regardless of network conditions.
                    </p>
                    <h3 className="text-lg font-semibold mb-2">
                      Key Features
                    </h3>
                    <ul className="text-muted-foreground space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Offline-first editing with zero loading spinners
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Real-time collaboration with CRDT conflict resolution
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Version history with time-travel and safe restore
                      </li>
                      <li className="flex items-center gap-2 relative">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        AI-powered writing assistance
                        {/* Fake cursor */}
                        <span className="inline-block w-0.5 h-5 bg-violet-400 animate-pulse ml-1" />
                        <span className="text-[10px] text-violet-400 bg-violet-400/20 px-1 rounded absolute -top-3 right-0">
                          User B typing...
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Built for the{" "}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                  Real World
                </span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Not just another document editor. SyncScribe solves complex
                distributed systems problems in the browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: WifiOff,
                  title: "Offline-First Architecture",
                  desc: "Edit documents with zero network requests. IndexedDB stores your data locally. No spinners, no waiting.",
                  gradient: "from-emerald-500/20 to-teal-500/20",
                  iconColor: "text-emerald-400",
                },
                {
                  icon: GitBranch,
                  title: "CRDT Conflict Resolution",
                  desc: "Yjs CRDTs ensure deterministic merges. Concurrent edits from multiple users never cause data loss.",
                  gradient: "from-blue-500/20 to-cyan-500/20",
                  iconColor: "text-blue-400",
                },
                {
                  icon: Clock,
                  title: "Version Time Travel",
                  desc: "Capture snapshots, browse history, preview past versions, and safely restore — without corrupting shared state.",
                  gradient: "from-violet-500/20 to-purple-500/20",
                  iconColor: "text-violet-400",
                },
                {
                  icon: Users,
                  title: "Real-Time Collaboration",
                  desc: "See collaborators' cursors, selections, and online status. Granular role-based access: Owner, Editor, Viewer.",
                  gradient: "from-orange-500/20 to-amber-500/20",
                  iconColor: "text-orange-400",
                },
                {
                  icon: Sparkles,
                  title: "AI Writing Assistant",
                  desc: "Summarize, improve, continue, translate, and fix grammar using Google Gemini — all from within the editor.",
                  gradient: "from-pink-500/20 to-rose-500/20",
                  iconColor: "text-pink-400",
                },
                {
                  icon: Shield,
                  title: "Security & Validation",
                  desc: "JWT auth, payload size limits, rate limiting, RLS-inspired access control, and OOM-safe WebSocket handling.",
                  gradient: "from-red-500/20 to-orange-500/20",
                  iconColor: "text-red-400",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group glass rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-20 sm:py-28 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                How It{" "}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  step: "01",
                  title: "Edit Locally",
                  desc: "All changes go to your local Yjs document first. Zero latency, zero network dependency.",
                  icon: Zap,
                },
                {
                  step: "02",
                  title: "Persist in IndexedDB",
                  desc: "Your document is automatically saved in the browser's IndexedDB — survives tab close and refresh.",
                  icon: FileText,
                },
                {
                  step: "03",
                  title: "Sync via WebSocket",
                  desc: "When online, binary state diffs are synced in real-time. When offline, changes queue automatically.",
                  icon: Wifi,
                },
                {
                  step: "04",
                  title: "Merge Deterministically",
                  desc: "Yjs CRDTs merge concurrent edits mathematically. No conflict dialogs, no data loss, ever.",
                  icon: GitBranch,
                },
              ].map((step, i) => (
                <div
                  key={step.step}
                  className="relative glass rounded-2xl p-6 text-center"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="text-4xl font-black text-primary/20 mb-3">
                    {step.step}
                  </div>
                  <step.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                  {i < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-28 border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to{" "}
              <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Start Writing?
              </span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Create your first document in seconds. No credit card required. Works
              even without internet.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-all hover:scale-105"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
