import { FileText, Code, Globe } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                SyncScribe
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              A local-first collaborative document editor with offline
              synchronization, CRDT-based conflict resolution, and AI-powered
              features.
            </p>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Built With</h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Next.js 16",
                "React 19",
                "TypeScript",
                "Yjs CRDT",
                "Tiptap",
                "PostgreSQL",
                "Drizzle ORM",
                "Tailwind CSS",
                "Auth.js",
                "Vercel AI SDK",
              ].map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Developer Info */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Developer</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Abhishek
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="https://github.com/abhishek"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub Profile"
              >
                <Code className="w-4 h-4" />
                <span>GitHub</span>
              </Link>
              <Link
                href="https://linkedin.com/in/abhishek"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn Profile"
              >
                <Globe className="w-4 h-4" />
                <span>LinkedIn</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SyncScribe — House of Edtech
            Assignment
          </p>
          <p className="text-xs text-muted-foreground">
            Made with ♥ using Next.js 16 & Yjs
          </p>
        </div>
      </div>
    </footer>
  );
}
