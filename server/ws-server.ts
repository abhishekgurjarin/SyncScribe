/**
 * SyncScribe WebSocket Collaboration Server
 *
 * Standalone Node.js WebSocket server for real-time document collaboration.
 * Complies with the standard y-websocket protocol (sync, awareness).
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "1234", 10);
const MAX_PAYLOAD_SIZE = 1_048_576; // 1MB
const MAX_MESSAGES_PER_SECOND = 100;
const MAX_DOCUMENT_SIZE = 52_428_800; // 50MB
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

interface WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
}

const docs = new Map<string, WSSharedDoc>();

function send(doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) {
  if (conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, { binary: true });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: WSSharedDoc, conn: WebSocket) {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null
      );
    }
  }
  try {
    conn.close();
  } catch {}
}

function getOrCreateDoc(docName: string): WSSharedDoc {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new Y.Doc() as WSSharedDoc;
    doc.name = docName;
    doc.conns = new Map();
    doc.awareness = new awarenessProtocol.Awareness(doc);
    doc.awareness.setLocalState(null);

    doc.on("update", (update: Uint8Array) => {
      if (Y.encodeStateAsUpdate(doc!).byteLength > MAX_DOCUMENT_SIZE) {
        console.warn(`[SECURITY] Document ${doc!.name} exceeds size limit`);
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      doc!.conns.forEach((_, conn) => send(doc!, conn, message));
    });

    doc.awareness.on(
      "update",
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(doc!.awareness, changedClients)
        );
        const message = encoding.toUint8Array(encoder);
        doc!.conns.forEach((_, conn) => send(doc!, conn, message));
      }
    );

    docs.set(docName, doc);
    console.log(`[DOC] Created document room: ${docName}`);
  }
  return doc;
}

// Rate limiter per connection
const rateLimiters = new Map<WebSocket, { count: number; resetAt: number }>();

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

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SyncScribe y-websocket Server\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const docName = url.pathname.slice(1).split("?")[0] || "default";

  console.log(`[WS] Client connected to document room: ${docName}`);

  const doc = getOrCreateDoc(docName);
  doc.conns.set(ws, new Set());

  ws.binaryType = "arraybuffer";

  // Send initial sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(doc, ws, encoding.toUint8Array(encoder));

  // Send current awareness states
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        doc.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    send(doc, ws, encoding.toUint8Array(awarenessEncoder));
  }

  let idleTimer = setTimeout(() => {
    console.log(`[WS] Idle timeout for client on: ${docName}`);
    closeConn(doc, ws);
  }, IDLE_TIMEOUT_MS);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      closeConn(doc, ws);
    }, IDLE_TIMEOUT_MS);
  };

  ws.on("message", (raw: ArrayBuffer | Buffer) => {
    resetIdleTimer();

    const data = new Uint8Array(raw);

    if (data.byteLength > MAX_PAYLOAD_SIZE) {
      console.warn(`[SECURITY] Oversized payload rejected: ${data.byteLength} bytes`);
      return;
    }

    if (!checkRateLimit(ws)) {
      return;
    }

    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        const replyEncoder = encoding.createEncoder();
        encoding.writeVarUint(replyEncoder, messageSync);
        syncProtocol.readSyncMessage(decoder, replyEncoder, doc, ws);
        if (encoding.length(replyEncoder) > 1) {
          send(doc, ws, encoding.toUint8Array(replyEncoder));
        }
      } else if (messageType === messageAwareness) {
        const awarenessUpdate = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, awarenessUpdate, ws);
      } else if (messageType === messageQueryAwareness) {
        const replyEncoder = encoding.createEncoder();
        encoding.writeVarUint(replyEncoder, messageAwareness);
        encoding.writeVarUint8Array(
          replyEncoder,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(doc.awareness.getStates().keys())
          )
        );
        send(doc, ws, encoding.toUint8Array(replyEncoder));
      }
    } catch (error) {
      console.error(`[ERROR] Malformed protocol message on ${docName}:`, error);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected from room: ${docName}`);
    clearTimeout(idleTimer);
    rateLimiters.delete(ws);
    closeConn(doc, ws);
  });

  ws.on("error", (error) => {
    console.error(`[ERROR] WebSocket error on ${docName}:`, error);
    closeConn(doc, ws);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 SyncScribe y-websocket Server`);
  console.log(`   Listening on ws://localhost:${PORT}`);
  console.log(`   Max payload: ${MAX_PAYLOAD_SIZE / 1024}KB`);
  console.log(`   Rate limit: ${MAX_MESSAGES_PER_SECOND} msg/s\n`);
});

process.on("SIGINT", () => {
  console.log("\n[SHUTDOWN] Closing WebSocket server...");
  wss.close(() => {
    server.close(() => {
      console.log("[SHUTDOWN] Server closed");
      process.exit(0);
    });
  });
});
