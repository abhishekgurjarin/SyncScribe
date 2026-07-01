import { db } from "@/db";
import { documents, collaborators } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { type Role, ROLE_HIERARCHY } from "./utils";

export interface AccessCheckResult {
  allowed: boolean;
  role: Role | null;
  isOwner: boolean;
}

/**
 * Check if a user has the required access level for a document.
 * Returns the user's role and whether access is granted.
 */
export async function checkDocumentAccess(
  userId: string,
  documentId: string,
  requiredRole: Role = "viewer"
): Promise<AccessCheckResult> {
  // Check if user is the document owner
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    columns: { ownerId: true, isPublic: true },
  });

  if (!doc) {
    return { allowed: false, role: null, isOwner: false };
  }

  // Owner always has full access
  if (doc.ownerId === userId) {
    return { allowed: true, role: "owner", isOwner: true };
  }

  // Check collaborator role
  const collab = await db.query.collaborators.findFirst({
    where: and(
      eq(collaborators.documentId, documentId),
      eq(collaborators.userId, userId)
    ),
    columns: { role: true },
  });

  if (collab) {
    const userRole = collab.role as Role;
    const hasAccess = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
    return { allowed: hasAccess, role: userRole, isOwner: false };
  }

  // Public documents allow viewer access
  if (doc.isPublic && requiredRole === "viewer") {
    return { allowed: true, role: "viewer", isOwner: false };
  }

  return { allowed: false, role: null, isOwner: false };
}

/**
 * Get all documents accessible by a user (owned + collaborated)
 */
export async function getUserDocuments(userId: string) {
  const ownedDocs = await db.query.documents.findMany({
    where: eq(documents.ownerId, userId),
    with: {
      collaborators: {
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      },
      owner: {
        columns: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: (docs, { desc }) => [desc(docs.updatedAt)],
  });

  const collabDocs = await db.query.collaborators.findMany({
    where: eq(collaborators.userId, userId),
    with: {
      document: {
        with: {
          owner: {
            columns: { id: true, name: true, email: true, image: true },
          },
          collaborators: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
  });

  return {
    owned: ownedDocs,
    shared: collabDocs.map((c) => ({
      ...c.document,
      myRole: c.role as Role,
    })),
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(session: { user?: { id?: string } } | null): string {
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }
  return session.user.id;
}
