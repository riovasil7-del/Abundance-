import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { saveIdea } from "@/server/ideas";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const { id } = await context.params;
  const result = await saveIdea(user.id, id);
  if (result === "NOT_FOUND") return jsonError(404, "NOT_FOUND");
  return NextResponse.json({ saved: result === "SAVED" });
}
