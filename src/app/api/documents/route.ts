import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/db";
import { documents, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createDocumentSchema } from "@/lib/validators";
import { requireAuth } from "@/lib/authorization";

export async function GET() {
  try {
    const session = await auth();
    const userId = requireAuth(session);

    // Get owned documents
    const ownedDocs = await db.query.documents.findMany({
      where: eq(documents.ownerId, userId),
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
      orderBy: (docs, { desc }) => [desc(docs.updatedAt)],
    });

    // Get collaborated documents
    const collabEntries = await db.query.collaborators.findMany({
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

    const sharedDocs = collabEntries.map((c) => ({
      ...c.document,
      myRole: c.role,
    }));

    return NextResponse.json({ owned: ownedDocs, shared: sharedDocs });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = requireAuth(session);

    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title } = parsed.data;

    const [doc] = await db
      .insert(documents)
      .values({
        title,
        ownerId: userId,
      })
      .returning();

    // Create owner collaborator entry
    await db.insert(collaborators).values({
      documentId: doc.id,
      userId,
      role: "owner",
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
