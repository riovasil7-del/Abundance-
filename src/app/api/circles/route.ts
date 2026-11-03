import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { circleBody } from "@/server/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const parsed = circleBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  const circle = await db.blessingCircle.create({
    data: {
      hostId: user.creatorProfile.id,
      title: parsed.data.title,
      description: parsed.data.description,
      participants: { create: [{ creatorId: user.creatorProfile.id }] },
    },
  });
  await audit({
    actorId: user.id,
    action: "CIRCLE_CREATE",
    entityType: "BlessingCircle",
    entityId: circle.id,
  });
  return NextResponse.json({ id: circle.id });
}
