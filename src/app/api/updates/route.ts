import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { listCreatorUpdates, postCreatorUpdate } from "@/server/community";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(280),
});

export async function GET(request: Request) {
  const creatorUserId = new URL(request.url).searchParams.get("creatorUserId") ?? "";
  if (!creatorUserId) return jsonError(400, "INVALID");
  const updates = await listCreatorUpdates(creatorUserId);
  return NextResponse.json({
    updates: updates.map((update) => ({ id: update.id, body: update.body, createdAt: update.createdAt })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const result = await postCreatorUpdate(user?.id ?? null, parsed.data.body);
  if ("error" in result && result.error) {
    return jsonError(result.error === "UNAUTHENTICATED" ? 401 : 403, result.error);
  }
  if (!("update" in result) || !result.update) return jsonError(500, "INVALID");
  return NextResponse.json({ id: result.update.id, status: result.status });
}
