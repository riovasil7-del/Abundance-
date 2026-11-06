import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  userId: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  if (parsed.data.userId === user.id) return jsonError(400, "INVALID");
  await db.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.userId } },
    update: {},
    create: { blockerId: user.id, blockedId: parsed.data.userId },
  });
  await audit({
    actorId: user.id,
    action: "BLOCK_USER",
    entityType: "User",
    entityId: parsed.data.userId,
  });
  return NextResponse.json({ ok: true });
}
