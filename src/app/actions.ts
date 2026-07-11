"use server";

import { db } from "@/db";
import { documents, collaborators } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createDocumentAction(title: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // 1. Insert the new document
  const [newDoc] = await db
    .insert(documents)
    .values({
      title: title || "Untitled Document",
      ownerId: session.user.id,
    })
    .returning();

  // 2. Add the owner as a collaborator with "owner" role
  await db.insert(collaborators).values({
    documentId: newDoc.id,
    userId: session.user.id,
    role: "owner",
  });

  // 3. Revalidate the dashboard path so data is fresh
  revalidatePath("/dashboard");

  // Return the new document ID so the client can navigate to it
  return { id: newDoc.id };
}
