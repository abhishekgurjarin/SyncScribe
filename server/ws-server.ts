/**
 * SyncScribe WebSocket Collaboration Server
 *
 * Standalone Node.js WebSocket server for real-time document collaboration.
 * Uses y-websocket for Yjs CRDT synchronization.
 *
 * Security features:
 * - Payload size limits (1MB per message)
 * - Rate limiting (100 messages/second per client)
 * - Connection timeout (30 min idle)
 * - Document size monitoring
 *
 * Run: npx tsx server/ws-server.ts
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import * as Y from "yjs";

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "1234", 10);
const MAX_PAYLOAD_SIZE = 1_048_576; // 1MB
const MAX_MESSAGES_PER_SECOND = 100;
const MAX_DOCUMENT_SIZE = 52_428_800; // 50MB
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// In-memory document store
const docs = new Map<string, Y.Doc>();

// Rate limiter per connection
const rateLimiters = new Map<
  WebSocket,
  { count: number; resetAt: number }
>();

function checkRateLimit(ws: WebSocket): boolean {
  const now = Date.now();
  let limiter = rateLimiters.get(ws);

  if (!limiter || limiter.resetAt < now) {
    limiter = { count: 1, resetAt: now + 1000 };
    rateLimiters.set(ws, limiter);
    return true;
  }

  if (limiter.count >= MAX_MESSAGES_PER_SECOND) {
    return false;
  }

  limiter.count++;
  return true;
}

function getOrCreateDoc(docName: string): Y.Doc {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docName, doc);
    console.log(`[DOC] Created document: ${docName}`);
  }
  return doc;
}

// Track connections per document
const docConnections = new Map<string, Set<WebSocket>>();

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SyncScribe WebSocket Server\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const docName = url.pathname.slice(1) || "default";

  console.log(`[WS] Client connected to document: ${docName}`);

  const doc = getOrCreateDoc(docName);

  // Track connection
  if (!docConnections.has(docName)) {
    docConnections.set(docName, new Set());
  }
  docConnections.get(docName)!.add(ws);

  // Send initial state
  const initialState = Y.encodeStateAsUpdate(doc);
  if (initialState.byteLength > 0) {
    ws.send(initialState, { binary: true });
  }

  // Idle timeout
  let idleTimer = setTimeout(() => {
    console.log(`[WS] Idle timeout for client on: ${docName}`);
    ws.close(1000, "Idle timeout");
  }, IDLE_TIMEOUT_MS);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      ws.close(1000, "Idle timeout");
    }, IDLE_TIMEOUT_MS);
  };

  ws.on("message", (data: Buffer) => {
    resetIdleTimer();

    // Payload size check
    if (data.byteLength > MAX_PAYLOAD_SIZE) {
      console.warn(
        `[SECURITY] Oversized payload rejected: ${data.byteLength} bytes from ${docName}`
      );
      ws.send(
        JSON.stringify({ error: "Payload too large", maxSize: MAX_PAYLOAD_SIZE })
      );
      return;
    }

    // Rate limiting
    if (!checkRateLimit(ws)) {
      console.warn(`[SECURITY] Rate limit exceeded for client on: ${docName}`);
      ws.send(JSON.stringify({ error: "Rate limit exceeded" }));
      return;
    }

    try {
      // Apply update to the shared doc
      const update = new Uint8Array(data);
      Y.applyUpdate(doc, update);

      // Check document size after update
      const docState = Y.encodeStateAsUpdate(doc);
      if (docState.byteLength > MAX_DOCUMENT_SIZE) {
        console.warn(
          `[SECURITY] Document ${docName} exceeds size limit: ${docState.byteLength} bytes`
        );
        // Don't broadcast, but don't crash either
        return;
      }

      // Broadcast to all other clients on the same document
      const connections = docConnections.get(docName);
      if (connections) {
        connections.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: true });
          }
        });
      }
    } catch (error) {
      console.error(`[ERROR] Failed to process update for ${docName}:`, error);
      // Don't crash the server on malformed data
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected from: ${docName}`);
    clearTimeout(idleTimer);
    rateLimiters.delete(ws);

    const connections = docConnections.get(docName);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        // Keep the doc in memory for a while for reconnections
        // In production, you'd save to DB and garbage collect
        console.log(
          `[DOC] No more clients for ${docName}, keeping in memory`
        );
      }
    }
  });

  ws.on("error", (error) => {
    console.error(`[ERROR] WebSocket error on ${docName}:`, error);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 SyncScribe WebSocket Server`);
  console.log(`   Listening on ws://localhost:${PORT}`);
  console.log(`   Max payload: ${MAX_PAYLOAD_SIZE / 1024}KB`);
  console.log(`   Rate limit: ${MAX_MESSAGES_PER_SECOND} msg/s`);
  console.log(`   Max doc size: ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`);
  console.log(`   Idle timeout: ${IDLE_TIMEOUT_MS / 60000} min\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[SHUTDOWN] Closing WebSocket server...");
  wss.close(() => {
    server.close(() => {
      console.log("[SHUTDOWN] Server closed");
      process.exit(0);
    });
  });
});
