"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
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

  const [ydoc] = useState(() => new Y.Doc());
  const [wsProvider, setWsProvider] = useState<WebsocketProvider | null>(null);
  const [idbProvider, setIdbProvider] = useState<IndexeddbPersistence | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  useEffect(() => {
    // 1. IndexedDB persistence — local-first source of truth
    const newIdbProvider = new IndexeddbPersistence(
      `syncscribe-${documentId}`,
      ydoc
    );
    setIdbProvider(newIdbProvider);

    newIdbProvider.on("synced", () => {
      setIsLocalLoaded(true);
    });

    // 2. WebSocket provider — real-time sync when online
    const effectiveWsUrl =
      wsUrl || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";

    const newWsProvider = new WebsocketProvider(
      effectiveWsUrl,
      documentId,
      ydoc,
      {
        connect: true,
        params: token ? { token } : {},
      }
    );
    setWsProvider(newWsProvider);
    setAwareness(newWsProvider.awareness);

    // Connection status tracking
    newWsProvider.on("status", ({ status }: { status: string }) => {
      setConnectionStatus(status as ConnectionStatus);
    });

    newWsProvider.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    // Set awareness local state
    newWsProvider.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: userColor,
    });

    return () => {
      newWsProvider.destroy();
      newIdbProvider.destroy();
    };
  }, [documentId, userId, userName, userColor, wsUrl, token, ydoc]);

  const destroy = useCallback(() => {
    wsProvider?.destroy();
    idbProvider?.destroy();
    ydoc.destroy();
  }, [wsProvider, idbProvider, ydoc]);

  return {
    ydoc,
    provider: wsProvider,
    indexeddbProvider: idbProvider,
    awareness,
    connectionStatus,
    isSynced,
    isLocalLoaded,
    destroy,
  };
}

