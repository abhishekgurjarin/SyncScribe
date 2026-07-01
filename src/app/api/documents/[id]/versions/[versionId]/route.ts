import { NextResponse } from "next/server";
import { auth } from "../../../../../../../auth";
import { db } from "@/db";
import { documentVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, checkDocumentAccess } from "@/lib/authorization";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth();
    const userId = requireAuth(session);
    const { id, versionId } = await params;

    const access = await checkDocumentAccess(userId, id, "viewer");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const version = await db.query.documentVersions.findFirst({
      where: eq(documentVersions.id, versionId),
      with: {
        createdByUser: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Convert binary snapshot to base64 for transport
    const snapshotBase64 = version.snapshot
      ? Buffer.from(version.snapshot).toString("base64")
      : null;

    return NextResponse.json({
      ...version,
      snapshot: snapshotBase64,
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/versions/[versionId] error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
