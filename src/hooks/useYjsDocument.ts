"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import type { Awareness } from "y-protocols/awareness";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface YjsDocumentOptions {
  documentId: string;
  userId: string;
  userName: string;
  userColor: string;
  wsUrl?: string;
  token?: string;
}

interface YjsDocumentReturn {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  awareness: Awareness | null;
  connectionStatus: ConnectionStatus;
  isSynced: boolean;
  isLocalLoaded: boolean;
  destroy: () => void;
}

/**
 * React hook for managing a Yjs document with:
 * - IndexedDB persistence (local-first, survives offline)
 * - WebSocket provider (real-time collaboration when online)
 * - Awareness (cursor positions, user presence)
 */
export function useYjsDocument({
  documentId,
  userId,
  userName,
  userColor,
  wsUrl,
  token,
}: YjsDocumentOptions): YjsDocumentReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [isSynced, setIsSynced] = useState(false);
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const idbProviderRef = useRef<IndexeddbPersistence | null>(null);

  // Create doc once
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  useEffect(() => {
    const ydoc = ydocRef.current!;

    // 1. IndexedDB persistence — local-first source of truth
    const idbProvider = new IndexeddbPersistence(
      `syncscribe-${documentId}`,
      ydoc
    );
    idbProviderRef.current = idbProvider;

    idbProvider.on("synced", () => {
      setIsLocalLoaded(true);
    });

    // 2. WebSocket provider — real-time sync when online
    const effectiveWsUrl =
      wsUrl || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";

    const wsProvider = new WebsocketProvider(
      effectiveWsUrl,
      documentId,
      ydoc,
      {
        connect: true,
        params: token ? { token } : {},
      }
    );
    wsProviderRef.current = wsProvider;

    // Connection status tracking
    wsProvider.on("status", ({ status }: { status: string }) => {
      setConnectionStatus(status as ConnectionStatus);
    });

    wsProvider.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    // Set awareness local state
    wsProvider.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: userColor,
    });

    return () => {
      wsProvider.destroy();
      idbProvider.destroy();
      wsProviderRef.current = null;
      idbProviderRef.current = null;
    };
  }, [documentId, userId, userName, userColor, wsUrl, token]);

  const destroy = useCallback(() => {
    wsProviderRef.current?.destroy();
    idbProviderRef.current?.destroy();
    ydocRef.current?.destroy();
    ydocRef.current = null;
    wsProviderRef.current = null;
    idbProviderRef.current = null;
  }, []);

  return {
    ydoc: ydocRef.current,
    provider: wsProviderRef.current,
    indexeddbProvider: idbProviderRef.current,
    awareness: wsProviderRef.current?.awareness ?? null,
    connectionStatus,
    isSynced,
    isLocalLoaded,
    destroy,
  };
}
