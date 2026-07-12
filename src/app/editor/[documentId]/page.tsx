"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Providers } from "@/components/providers";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Undo,
  Redo,
  Wifi,
  WifiOff,
  Loader2,
  Save,
  History,
  Sparkles,
  Share2,
  ChevronLeft,
  X,
  Send,
} from "lucide-react";
import { getCursorColor, getInitials, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface VersionItem {
  id: string;
  versionNumber: number;
  title: string;
  description?: string;
  snapshot?: string;
  createdAt: string;
  createdBy: string;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface CollabItem {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

// Helper for converting Uint8Array to base64
const uint8ArrayToBase64 = (buffer: Uint8Array) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Toolbar button component
const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-colors ${
      isActive
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    } disabled:opacity-30 disabled:cursor-not-allowed`}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
);

function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Core state — ydoc and awareness are stable singletons for this editor session
  const [ydoc] = useState(() => new Y.Doc());
  const [awareness] = useState(() => new Awareness(ydoc));
  const [, setWsProvider] = useState<WebsocketProvider | null>(null);
  const [, setIdbProvider] = useState<IndexeddbPersistence | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [, setIsSynced] = useState(false);
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);

  // Document metadata
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [docRole, setDocRole] = useState<string>("viewer");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Panels
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Version history
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionTitle, setVersionTitle] = useState("");
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // AI
  const [aiAction, setAiAction] = useState("summarize");
  const [aiResult, setAiResult] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Share
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [collabs, setCollabs] = useState<CollabItem[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Online collaborators from awareness
  const [onlineUsers, setOnlineUsers] = useState<
    { id: string; name: string; color: string }[]
  >([]);

  const isReadOnly = docRole === "viewer";

  // Fetch document metadata
  useEffect(() => {
    if (authStatus !== "authenticated" || !documentId) return;

    fetch(`/api/documents/${documentId}`)
      .then((res) => {
        if (res.status === 403) {
          toast.error("Access denied");
          router.push("/dashboard");
          return null;
        }
        if (res.status === 404) {
          toast.error("Document not found");
          router.push("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setDocTitle(data.title);
          setDocRole(data.myRole || "viewer");
        }
      })
      .catch(console.error);
  }, [authStatus, documentId, router]);

  // Initialize Yjs providers
  useEffect(() => {
    if (!documentId) return;

    // Global error recovery if local IndexedDB cache contains a corrupt/truncated Yjs update
    const handleCorruptIDB = (event: PromiseRejectionEvent | ErrorEvent) => {
      const msg =
        ("reason" in event && event.reason && (event.reason.message || String(event.reason))) ||
        ("message" in event && event.message) ||
        "";
      if (
        msg.includes("Unexpected end of array") ||
        msg.includes("Integer out of Range") ||
        msg.includes("Invalid typed array length") ||
        msg.includes("RangeError") ||
        msg.includes("Caught error while handling a Yjs update") ||
        msg.includes("decoding")
      ) {
        console.warn("[IndexedDB] Corrupt Yjs history detected in browser storage. Clearing IDB cache and reloading...");
        try {
          indexedDB.deleteDatabase(`syncscribe-${documentId}`);
        } catch {}
        const recoveryKey = `idb_recovered_${documentId}`;
        if (!sessionStorage.getItem(recoveryKey)) {
          sessionStorage.setItem(recoveryKey, "true");
          window.location.reload();
        }
      }
    };
    window.addEventListener("unhandledrejection", handleCorruptIDB);
    window.addEventListener("error", handleCorruptIDB);

    // IndexedDB persistence with error recovery for stale/corrupt Yjs data
    let idb: IndexeddbPersistence;
    try {
      idb = new IndexeddbPersistence(`syncscribe-${documentId}`, ydoc);
      setIdbProvider(idb);

      idb.on("synced", () => {
        setIsLocalLoaded(true);
      });

      idb.on("error" as "synced", (err: unknown) => {
        console.warn("[IndexedDB] Corrupt data, clearing and reloading:", err);
        idb.clearData().then(() => window.location.reload());
      });
    } catch (err) {
      console.warn("[IndexedDB] Failed to initialize:", err);
      setIsLocalLoaded(true);
      idb = { destroy: () => {} } as IndexeddbPersistence;
      setIdbProvider(null);
    }

    // WebSocket provider — share the same awareness instance the editor uses
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const wsUrl = isLocalhost
      ? "ws://localhost:1234"
      : process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
    const ws = new WebsocketProvider(wsUrl, documentId, ydoc, {
      connect: true,
      awareness,
    });
    setWsProvider(ws);

    ws.on("status", ({ status }: { status: string }) => {
      setConnectionStatus(status as ConnectionStatus);
    });

    ws.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    // Set awareness state using the stable awareness instance
    if (session?.user) {
      const colorIndex = Math.floor(Math.random() * 10);
      awareness.setLocalStateField("user", {
        id: session.user.id,
        name: session.user.name || session.user.email || "Anonymous",
        color: getCursorColor(colorIndex),
      });
    }

    // Track online users
    const updateUsers = () => {
      const states = awareness.getStates();
      const users: { id: string; name: string; color: string }[] = [];
      states.forEach((state, clientId) => {
        if (state.user && clientId !== ydoc.clientID) {
          users.push(state.user);
        }
      });
      setOnlineUsers(users);
    };

    awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      window.removeEventListener("unhandledrejection", handleCorruptIDB);
      window.removeEventListener("error", handleCorruptIDB);
      awareness.off("change", updateUsers);
      ws.destroy();
      idb.destroy();
    };
  }, [documentId, session?.user, ydoc, awareness]);

  // Tiptap editor — created EXACTLY ONCE. Awareness is stable so no deps change.
  const editor = useEditor({
    immediatelyRender: false,
    editable: !isReadOnly,
    extensions: [
      StarterKit.configure({
        // Tiptap v3 includes undoRedo by default; disable it — Collaboration handles history
        undoRedo: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      Placeholder.configure({
        placeholder: isReadOnly
          ? "This document is view-only"
          : "Start writing...",
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
    ],
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
    },
  }, []); // Empty deps — this editor instance lives forever

  // Sync editable state reactively without rebuilding the editor
  useEffect(() => {
    if (editor && editor.isEditable !== !isReadOnly) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  // Title update with debounce
  useEffect(() => {
    if (!docTitle || isReadOnly) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: docTitle }),
        });
        setLastSaved(new Date());
      } catch { /* silent fail for title update */ }
      finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [docTitle, documentId, isReadOnly]);

  // Save version
  const saveVersion = async () => {
    if (!versionTitle.trim()) {
      toast.error("Please enter a version title");
      return;
    }

    setIsCreatingVersion(true);
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      const snapshot = uint8ArrayToBase64(state);

      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: versionTitle,
          snapshot,
        }),
      });

      if (res.ok) {
        toast.success("Version saved!");
        setVersionTitle("");
        fetchVersions();
        setLastSaved(new Date());
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save version");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch {
      console.error("Failed to fetch versions");
    }
  }, [documentId]);

  // Restore version
  const restoreVersion = async (versionId: string) => {
    if (!confirm("Restore this version? A new version will be created from the current state first.")) return;

    try {
      // First save current state as a backup
      const currentState = Y.encodeStateAsUpdate(ydoc);
      await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Auto-backup before restore",
          snapshot: uint8ArrayToBase64(currentState),
        }),
      });

      // Fetch the version to restore
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`);
      if (!res.ok) throw new Error("Failed to fetch version");

      const version = await res.json();
      const snapshotData = Uint8Array.from(atob(version.snapshot), (c) => c.charCodeAt(0));

      // Create a temporary Y.Doc to parse the old state
      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, snapshotData);

      // Extract content using a headless editor instance
      const tempEditor = new Editor({
        extensions: [
          StarterKit,
          Collaboration.configure({ document: tempDoc }),
          TaskList,
          TaskItem.configure({ nested: true }),
          TextAlign.configure({ types: ["heading", "paragraph"] }),
          Typography,
        ],
      });
      
      const restoredJson = tempEditor.getJSON();
      tempEditor.destroy();

      // Replace current editor content
      if (editor) {
        editor.commands.setContent(restoredJson);
      }

      toast.success("Version restored successfully!");
      fetchVersions();
    } catch {
      toast.error("Failed to restore version");
    }
  };

  // Fetch collaborators
  const fetchCollabs = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollabs(data);
      }
    } catch {
      console.error("Failed to fetch collaborators");
    }
  }, [documentId]);

  // Invite collaborator
  const inviteCollab = async () => {
    if (!shareEmail.trim()) return;
    setIsInviting(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail, role: shareRole }),
      });

      if (res.ok) {
        toast.success("Collaborator invited!");
        setShareEmail("");
        fetchCollabs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to invite");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsInviting(false);
    }
  };

  // AI action
  const runAI = async () => {
    if (!editor) return;

    const selectedText = editor.state.selection.empty
      ? editor.getText()
      : editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          " "
        );

    if (!selectedText.trim()) {
      toast.error("Select text or write something first");
      return;
    }

    setIsAiLoading(true);
    setAiResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aiAction, text: selectedText }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.result);
      } else {
        const data = await res.json();
        toast.error(data.error || "AI request failed");
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Insert AI result
  const insertAIResult = () => {
    if (!editor || !aiResult) return;

    if (aiAction === "improve" || aiAction === "fix-grammar" || aiAction === "translate") {
      // Replace selection
      if (!editor.state.selection.empty) {
        editor.chain().focus().deleteSelection().insertContent(aiResult).run();
      } else {
        editor.chain().focus().setContent(aiResult).run();
      }
    } else {
      // Insert at cursor
      editor.chain().focus().insertContent("\n\n" + aiResult).run();
    }

    setAiResult("");
    toast.success("AI content inserted");
  };

  useEffect(() => {
    if (showVersionPanel) fetchVersions();
  }, [showVersionPanel, fetchVersions]);

  useEffect(() => {
    if (showShareDialog) fetchCollabs();
  }, [showShareDialog, fetchCollabs]);


  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="text-sm font-semibold bg-transparent border-none outline-none max-w-[200px] sm:max-w-xs focus:ring-1 focus:ring-primary/50 rounded px-1"
              disabled={isReadOnly}
              aria-label="Document title"
            />
            {isReadOnly && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                View Only
              </span>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Save Status indicator */}
            {(isSaving || lastSaved) && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {isSaving
                  ? "Saving..."
                  : lastSaved
                  ? `Saved ${formatRelativeTime(lastSaved.toISOString())}`
                  : ""}
              </span>
            )}

            {/* Connection status */}
            <div
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
              style={{
                background:
                  connectionStatus === "connected"
                    ? "oklch(0.45 0.15 155 / 0.15)"
                    : connectionStatus === "connecting"
                    ? "oklch(0.7 0.15 80 / 0.15)"
                    : "oklch(0.55 0.2 25 / 0.15)",
              }}
            >
              {connectionStatus === "connected" ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : connectionStatus === "connecting" ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span
                className={
                  connectionStatus === "connected"
                    ? "text-emerald-400"
                    : connectionStatus === "connecting"
                    ? "text-amber-400"
                    : "text-red-400"
                }
              >
                {connectionStatus === "connected"
                  ? "Synced"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>

            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div className="flex -space-x-1.5">
                {onlineUsers.slice(0, 3).map((u, i) => (
                  <div
                    key={u.id || i}
                    className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: u.color }}
                    title={u.name}
                  >
                    {getInitials(u.name)}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <button
              onClick={() => setShowShareDialog(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Share"
              aria-label="Share document"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowVersionPanel(!showVersionPanel);
                setShowAIPanel(false);
              }}
              className={`p-1.5 rounded-md transition-colors ${
                showVersionPanel
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title="Version History"
              aria-label="Toggle version history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowAIPanel(!showAIPanel);
                setShowVersionPanel(false);
              }}
              className={`p-1.5 rounded-md transition-colors ${
                showAIPanel
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title="AI Assistant"
              aria-label="Toggle AI assistant"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {editor && !isReadOnly && (
          <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-border overflow-x-auto">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive("highlight")}
              title="Highlight"
            >
              <Highlighter className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive("taskList")}
              title="Task List"
            >
              <ListTodo className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-4">
            {!isLocalLoaded ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Loading document...
                  </p>
                </div>
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>

        {/* Side panels */}
        {(showVersionPanel || showAIPanel) && (
          <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm overflow-y-auto animate-slide-in-right">
            {/* Version History Panel */}
            {showVersionPanel && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Version History
                  </h3>
                  <button
                    onClick={() => setShowVersionPanel(false)}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Create version */}
                {!isReadOnly && (
                  <div className="mb-4 p-3 rounded-lg bg-secondary/50">
                    <input
                      type="text"
                      value={versionTitle}
                      onChange={(e) => setVersionTitle(e.target.value)}
                      placeholder="Version title..."
                      className="w-full px-3 py-2 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 mb-2"
                    />
                    <button
                      onClick={saveVersion}
                      disabled={isCreatingVersion}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isCreatingVersion ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save Snapshot
                    </button>
                  </div>
                )}

                {/* Version list */}
                <div className="space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No versions yet
                    </p>
                  ) : (
                    versions.map((v: VersionItem) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {v.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              v{v.versionNumber} •{" "}
                              {formatRelativeTime(v.createdAt)}
                            </p>
                            {v.createdByUser && (
                              <p className="text-[10px] text-muted-foreground">
                                by {v.createdByUser.name || v.createdByUser.email}
                              </p>
                            )}
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => restoreVersion(v.id)}
                              className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* AI Panel */}
            {showAIPanel && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Assistant
                  </h3>
                  <button
                    onClick={() => setShowAIPanel(false)}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground mb-3">
                  Select text in the editor, or use the full document content.
                </p>

                {/* Action selector */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {[
                    { value: "summarize", label: "Summarize" },
                    { value: "continue", label: "Continue" },
                    { value: "improve", label: "Improve" },
                    { value: "fix-grammar", label: "Fix Grammar" },
                    { value: "explain", label: "Explain" },
                    { value: "outline", label: "Outline" },
                    { value: "translate", label: "Translate" },
                  ].map((action) => (
                    <button
                      key={action.value}
                      onClick={() => setAiAction(action.value)}
                      className={`text-[11px] py-1.5 px-2 rounded-md transition-colors ${
                        aiAction === action.value
                          ? "bg-primary/20 text-primary font-medium"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={runAI}
                  disabled={isAiLoading}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isAiLoading ? "Processing..." : "Run AI"}
                </button>

                {/* AI Result */}
                {aiResult && (
                  <div className="animate-fade-in">
                    <div className="p-3 rounded-lg bg-secondary/50 mb-3">
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {aiResult}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={insertAIResult}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity"
                      >
                        <Send className="w-3 h-3" />
                        Insert
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiResult);
                          toast.success("Copied!");
                        }}
                        className="flex-1 py-1.5 rounded-md bg-secondary text-[11px] font-medium hover:bg-secondary/80 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShareDialog(false)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Document
            </h2>

            {/* Invite form */}
            {(docRole === "owner" || docRole === "editor") && (
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <select
                  value={shareRole}
                  onChange={(e) =>
                    setShareRole(e.target.value as "editor" | "viewer")
                  }
                  className="px-2 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={inviteCollab}
                  disabled={isInviting}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Invite"
                  )}
                </button>
              </div>
            )}

            {/* Collaborator list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {collabs.map((c: CollabItem) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {getInitials(c.user?.name || c.user?.email || "U")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {c.user?.name || c.user?.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.user?.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      c.role === "owner"
                        ? "bg-primary/20 text-primary"
                        : c.role === "editor"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.role}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShareDialog(false)}
              className="w-full mt-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPageWrapper() {
  return (
    <Providers>
      <EditorPage />
    </Providers>
  );
}
