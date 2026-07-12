import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/db";
import { collaborators, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { inviteCollaboratorSchema } from "@/lib/validators";
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

    const collabs = await db.query.collaborators.findMany({
      where: eq(collaborators.documentId, id),
      with: {
        user: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(collabs);
  } catch (error) {
    console.error("GET /api/documents/[id]/collaborators error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id } = await params;

    // Only owners and editors can invite
    const access = await checkDocumentAccess(userId, id, "editor");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteCollaboratorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Find user by email
    const invitee = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, name: true, email: true },
    });

    if (!invitee) {
      return NextResponse.json(
        { error: "User not found. They must register first." },
        { status: 404 }
      );
    }

    // Check if already a collaborator
    const existing = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.documentId, id),
        eq(collaborators.userId, invitee.id)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already a collaborator" },
        { status: 409 }
      );
    }

    const [collab] = await db
      .insert(collaborators)
      .values({
        documentId: id,
        userId: invitee.id,
        role,
      })
      .returning();

    return NextResponse.json(collab, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents/[id]/collaborators error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id } = await params;

    const access = await checkDocumentAccess(userId, id, "owner");
    if (!access.allowed || !access.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can remove collaborators" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get("collaboratorId");

    if (!collaboratorId) {
      return NextResponse.json(
        { error: "collaboratorId is required" },
        { status: 400 }
      );
    }

    await db
      .delete(collaborators)
      .where(eq(collaborators.id, collaboratorId));

    return NextResponse.json({ message: "Collaborator removed" });
  } catch (error) {
    console.error("DELETE /api/documents/[id]/collaborators error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
