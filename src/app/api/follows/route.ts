import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { followCreator, listFollowing, unfollowCreator } from "@/server/community";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  creatorUserId: z.string().trim().min(1).max(80),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const rows = await listFollowing(user.id);
  return NextResponse.json({
    following: rows.flatMap((row) =>
      row.creator.creatorProfile
        ? [{ userId: row.creatorId, slug: row.creator.creatorProfile.slug, name: row.creator.creatorProfile.displayName }]
        : [],
    ),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const result = await followCreator(user?.id ?? null, parsed.data.creatorUserId);
  if ("error" in result && result.error) {
    const status = result.error === "UNAUTHENTICATED" ? 401 : result.error === "BLOCKED" ? 403 : 400;
    return jsonError(status, result.error);
  }
  if (!("follow" in result) || !result.follow) return jsonError(500, "INVALID");
  return NextResponse.json({ ok: true, id: result.follow.id });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  const creatorUserId = new URL(request.url).searchParams.get("creatorUserId") ?? "";
  const parsed = bodySchema.safeParse({ creatorUserId });
  if (!parsed.success) return jsonError(400, "INVALID");
  const result = await unfollowCreator(user?.id ?? null, parsed.data.creatorUserId);
  if ("error" in result && result.error) return jsonError(401, result.error);
  return NextResponse.json({ ok: true });
}
