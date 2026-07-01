# SyncScribe — Local-First Collaborative Document Editor

A production-grade, local-first collaborative document editor with offline synchronization, CRDT-based deterministic conflict resolution, granular version control, role-based access control, and AI-powered writing assistance.

**Built for the House of Edtech Fullstack Developer Assignment — June 2026**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-blue?logo=tailwindcss)

## ✨ Key Features

### 🔌 Local-First Architecture
- **Zero network dependency**: All edits happen against local state via Yjs CRDTs
- **IndexedDB persistence**: Documents survive offline, tab close, and browser restart
- **Instant UI**: No loading spinners — the UI updates at 0ms latency

### 🔄 Background Sync Engine
- **WebSocket real-time sync**: Binary-efficient Yjs protocol for live collaboration
- **Automatic reconnection**: Exponential backoff with seamless state reconciliation
- **Offline queue**: Changes accumulate in the CRDT and sync automatically on reconnect

### 🌿 CRDT Conflict Resolution
- **Deterministic merges**: Yjs CRDTs guarantee identical document state across all clients
- **No data loss**: Concurrent edits from multiple users are mathematically merged
- **No conflict dialogs**: Users never see "merge conflict" prompts

### ⏳ Version History & Time Travel
- **Named snapshots**: Capture document state at any point with a title and description
- **Timeline view**: Browse all versions chronologically with author attribution
- **Safe restore**: Restoring a version auto-saves a backup first — no data corruption

### 👥 Real-Time Collaboration
- **Live cursors**: See other users' cursor positions and selections in real-time
- **User presence**: Colored avatars show who's actively editing
- **Role-based access**: Owner, Editor, and Viewer roles with granular permissions

### 🤖 AI-Powered Features (Gemini via Vercel AI SDK)
- Summarize, Continue Writing, Improve, Fix Grammar, Explain, Outline, Translate
- Rate-limited (10 requests/minute/user) with input validation

### 🔒 Security
- **Authentication**: Auth.js v5 with GitHub, Google OAuth, and email/password
- **Authorization**: Granular role enforcement on every API route and WebSocket connection
- **Payload validation**: Zod schemas on all inputs, max 1MB WebSocket payloads
- **Anti-OOM**: Rate limiting, document size limits (50MB), idle connection timeouts
- **Database security**: Drizzle ORM with scoped queries (user-filtered WHERE clauses)

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| UI | **Tailwind CSS v4** + **shadcn/ui** |
| Editor | **Tiptap v3** (ProseMirror-based) |
| CRDT Engine | **Yjs** (deterministic conflict resolution) |
| Local Storage | **IndexedDB** via y-indexeddb |
| Real-time Sync | **y-websocket** (binary protocol) |
| Database | **PostgreSQL** (Neon Serverless) |
| ORM | **Drizzle ORM** |
| Auth | **Auth.js v5** (JWT strategy) |
| AI | **Vercel AI SDK** + **Google Gemini** |
| Deployment | **Vercel** (frontend) + **Railway** (WebSocket server) |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- Google Gemini API key (optional, for AI features)

### Setup

```bash
# Clone the repository
git clone https://github.com/abhishek/syncscribe.git
cd syncscribe

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your database URL, auth secrets, etc.

# Push database schema
npm run db:push

# Start the WebSocket server (terminal 1)
npm run ws:server

# Start the Next.js dev server (terminal 2)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm run ws:server` | Start the WebSocket collaboration server |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migration files |
| `npm run db:studio` | Open Drizzle Studio |

## 📁 Project Structure

```
├── server/
│   └── ws-server.ts          # WebSocket collaboration server
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── auth/              # Sign in / Sign up pages
│   │   ├── dashboard/         # Document management
│   │   ├── editor/            # Collaborative editor
│   │   └── api/               # REST API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── layout/            # Navbar, Footer
│   ├── db/
│   │   └── schema.ts          # Drizzle ORM schema
│   ├── hooks/                 # React hooks (Yjs, connection)
│   └── lib/                   # Utils, validators, auth
├── auth.ts                    # Auth.js configuration
├── middleware.ts              # Route protection
└── drizzle.config.ts          # Database config
```

## 🔐 Security Architecture

```
Client → [Size Check: max 1MB] → [Rate Limiter: 100 msg/s] →
  [Binary Validation] → [Yjs Update] → [Doc Size Check: max 50MB] → Accept/Reject
```

- All API routes validate auth via `auth()` and check role permissions
- WebSocket payloads are size-limited and rate-limited
- Zod validation on every request body with `maxLength` constraints
- Idle WebSocket connections timeout after 30 minutes

## 👤 Developer

- **Name**: Abhishek Gurjar
- **GitHub**: [github.com/abhishekgurjarin](https://github.com/abhishekgurjarin)
- **LinkedIn**: [linkedin.com/in/abhishekgurjarin](https://www.linkedin.com/in/abhishekgurjarin/)
- **Portfolio**: [abhishekgurjar.boad.in](https://abhishekgurjar.boad.in/)

---

Built with ♥ for the House of Edtech Fullstack Developer Assignment
