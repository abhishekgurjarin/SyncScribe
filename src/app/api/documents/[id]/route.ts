import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/db";
import { documents, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateDocumentSchema } from "@/lib/validators";
import { requireAuth, checkDocumentAccess } from "@/lib/authorization";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id } = await params;

    const access = await checkDocumentAccess(userId, id, "viewer");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
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
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ ...doc, myRole: access.role });
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id } = await params;

    const access = await checkDocumentAccess(userId, id, "editor");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(documents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id } = await params;

    const access = await checkDocumentAccess(userId, id, "owner");
    if (!access.allowed || !access.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can delete a document" },
        { status: 403 }
      );
    }

    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
