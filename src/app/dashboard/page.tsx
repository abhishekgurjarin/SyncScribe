"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";
import {
  Plus,
  FileText,
  Users,
  Clock,
  Loader2,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime, getInitials, type Role } from "@/lib/utils";
import { toast } from "sonner";

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  isPublic: boolean;
  owner: { id: string; name: string | null; email: string | null; image: string | null };
  collaborators: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  }[];
  myRole?: string;
}

function DashboardContent() {
  const { status } = useSession();
  const router = useRouter();
  const [ownedDocs, setOwnedDocs] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setOwnedDocs(data.owned || []);
        setSharedDocs(data.shared || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchDocuments();
    }
  }, [status]);

  const createDocument = async () => {
    setIsCreating(true);
    try {
      // Use the new Server Action instead of the API route
      const { createDocumentAction } = await import("@/app/actions");
      const doc = await createDocumentAction(newTitle);
      
      router.push(`/editor/${doc.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
      setShowCreateDialog(false);
      setNewTitle("");
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Document deleted");
        setOwnedDocs((prev) => prev.filter((d) => d.id !== docId));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const seenIds = new Set<string>();
  const allDocs = [
    ...ownedDocs.map((d) => ({ ...d, myRole: "owner" as Role })),
    ...sharedDocs,
  ].filter((doc) => {
    if (seenIds.has(doc.id)) return false;
    seenIds.add(doc.id);
    return true;
  });

  const filteredDocs = search
    ? allDocs.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase())
      )
    : allDocs;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {allDocs.length} document{allDocs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Documents Grid */}
        {filteredDocs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? "No documents found" : "No documents yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? "Try a different search term"
                : "Create your first document to get started"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Create Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="group glass rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(doc.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        doc.myRole === "owner"
                          ? "bg-primary/20 text-primary"
                          : doc.myRole === "editor"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {doc.myRole}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Collaborator avatars */}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <div className="flex -space-x-1.5">
                      {doc.collaborators?.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-violet-500 border border-card flex items-center justify-center text-[8px] font-bold text-white"
                          title={c.user.name || c.user.email || "User"}
                        >
                          {getInitials(c.user.name || c.user.email || "U")}
                        </div>
                      ))}
                      {(doc.collaborators?.length || 0) > 4 && (
                        <div className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                          +{doc.collaborators.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/editor/${doc.id}`, "_blank");
                      }}
                      className="p-1 rounded hover:bg-secondary transition-colors"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {doc.myRole === "owner" && (
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="p-1 rounded hover:bg-destructive/20 transition-colors"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Document Dialog */}
        {showCreateDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDialog(false)}
          >
            <div
              className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4">Create New Document</h2>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Document title..."
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") createDocument();
                }}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewTitle("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createDocument}
                  disabled={isCreating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  );
}
