import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { circlePublisherDecision } from "@/server/money";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const decision = circlePublisherDecision(user);
  if (decision !== "OK" || !user?.creatorProfile) return jsonError(decision === "UNAUTHENTICATED" ? 401 : 403, decision);
  const { id } = await context.params;
  const circle = await db.blessingCircle.findUnique({ where: { id } });
  if (!circle || circle.status !== "OPEN") return jsonError(404, "NOT_FOUND");

  await db.circleParticipant.upsert({
    where: { circleId_creatorId: { circleId: id, creatorId: user.creatorProfile.id } },
    update: {},
    create: { circleId: id, creatorId: user.creatorProfile.id },
  });
  await audit({
    actorId: user.id,
    action: "CIRCLE_JOIN",
    entityType: "BlessingCircle",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
