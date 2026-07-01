import { z } from "zod";

// ============================================
// Document Validators
// ============================================

export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be under 255 characters")
    .trim(),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be under 255 characters")
    .trim()
    .optional(),
  isPublic: z.boolean().optional(),
});

// ============================================
// Version Validators
// ============================================

export const createVersionSchema = z.object({
  title: z
    .string()
    .min(1, "Version title is required")
    .max(255, "Title must be under 255 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be under 1000 characters")
    .optional(),
  // Base64 encoded Yjs state — max 5MB after decode
  snapshot: z
    .string()
    .max(7_000_000, "Snapshot too large (max ~5MB)"),
});

// ============================================
// Collaborator Validators
// ============================================

export const inviteCollaboratorSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["editor", "viewer"], {
    errorMap: () => ({ message: "Role must be 'editor' or 'viewer'" }),
  }),
});

export const updateCollaboratorSchema = z.object({
  role: z.enum(["editor", "viewer"], {
    errorMap: () => ({ message: "Role must be 'editor' or 'viewer'" }),
  }),
});

// ============================================
// AI Validators
// ============================================

export const aiActionSchema = z.object({
  action: z.enum([
    "summarize",
    "continue",
    "improve",
    "translate",
    "explain",
    "outline",
    "fix-grammar",
  ]),
  text: z
    .string()
    .min(1, "Text is required")
    .max(10_000, "Text must be under 10,000 characters"),
  language: z.string().max(50).optional(), // for translate action
});

// ============================================
// Auth Validators
// ============================================

export const signUpSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============================================
// WebSocket Payload Validators
// ============================================

export const MAX_WS_PAYLOAD_SIZE = 1_048_576; // 1MB
export const MAX_MESSAGES_PER_SECOND = 100;
export const MAX_DOCUMENT_SIZE = 52_428_800; // 50MB
export const WS_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================
// Type Exports
// ============================================

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type AIActionInput = z.infer<typeof aiActionSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
