import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/db";
import { documentVersions, documents } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { createVersionSchema } from "@/lib/validators";
import { requireAuth, checkDocumentAccess } from "@/lib/authorization";

export async function GET(
  request: Request,
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

    const versions = await db.query.documentVersions.findMany({
      where: eq(documentVersions.documentId, id),
      columns: {
        id: true,
        versionNumber: true,
        title: true,
        description: true,
        snapshotSize: true,
        createdAt: true,
        createdBy: true,
      },
      with: {
        createdByUser: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: [desc(documentVersions.versionNumber)],
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error("GET /api/documents/[id]/versions error:", error);
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

    const access = await checkDocumentAccess(userId, id, "editor");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createVersionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, description, snapshot } = parsed.data;

    // Decode base64 snapshot
    const snapshotBuffer = Buffer.from(snapshot, "base64");

    // Enforce size limit (5MB)
    if (snapshotBuffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Snapshot too large (max 5MB)" },
        { status: 413 }
      );
    }

    // Get next version number
    const [versionCount] = await db
      .select({ count: count() })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id));

    const versionNumber = (versionCount?.count || 0) + 1;

    const [version] = await db
      .insert(documentVersions)
      .values({
        documentId: id,
        versionNumber,
        title,
        description,
        snapshot: snapshotBuffer,
        snapshotSize: snapshotBuffer.length,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents/[id]/versions error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
