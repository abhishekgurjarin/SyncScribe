import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// Custom bytea type for binary Yjs snapshots
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ============================================
// Auth.js Required Tables
// ============================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// ============================================
// Application Tables
// ============================================

export const documents = pgTable(
  "documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull().default("Untitled Document"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").notNull().default(false),
    // Store the latest Yjs state for server-side persistence
    yjsState: bytea("yjs_state"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("documents_owner_id_idx").on(table.ownerId),
    index("documents_updated_at_idx").on(table.updatedAt),
  ]
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull().default("Untitled Snapshot"),
    description: text("description"),
    // Binary Yjs state snapshot
    snapshot: bytea("snapshot").notNull(),
    snapshotSize: integer("snapshot_size").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("document_versions_document_id_idx").on(table.documentId),
    index("document_versions_created_at_idx").on(table.createdAt),
  ]
);

export const collaborators = pgTable(
  "collaborators",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "editor" | "viewer">().notNull(),
    invitedAt: timestamp("invited_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("collaborators_document_id_idx").on(table.documentId),
    index("collaborators_user_id_idx").on(table.userId),
    index("collaborators_document_user_idx").on(table.documentId, table.userId),
  ]
);

export const syncLog = pgTable(
  "sync_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action")
      .$type<"connect" | "disconnect" | "sync" | "snapshot" | "restore">()
      .notNull(),
    payloadSize: integer("payload_size"),
    metadata: text("metadata"), // JSON string for additional context
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("sync_log_document_id_idx").on(table.documentId),
    index("sync_log_created_at_idx").on(table.createdAt),
  ]
);

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  collaborations: many(collaborators),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  versions: many(documentVersions),
  collaborators: many(collaborators),
  syncLogs: many(syncLog),
}));

export const documentVersionsRelations = relations(
  documentVersions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentVersions.documentId],
      references: [documents.id],
    }),
    createdByUser: one(users, {
      fields: [documentVersions.createdBy],
      references: [users.id],
    }),
  })
);

export const collaboratorsRelations = relations(collaborators, ({ one }) => ({
  document: one(documents, {
    fields: [collaborators.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [collaborators.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
