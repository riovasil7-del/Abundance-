import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser, hasRole } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { moderationBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasRole(user, ["MODERATOR", "ADMIN"])) return jsonError(403, "FORBIDDEN");
  const parsed = moderationBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const { id } = await context.params;
  await db.video.update({ where: { id }, data: { moderationStatus: parsed.data.status } });
  await audit({
    actorId: user!.id,
    action: "MODERATE_VIDEO",
    entityType: "Video",
    entityId: id,
    metadata: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
