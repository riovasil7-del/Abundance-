import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser, hasRole } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { verificationBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasRole(user, ["MODERATOR", "ADMIN"])) return jsonError(403, "FORBIDDEN");
  const parsed = verificationBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const { id } = await context.params;
  const creator = await db.creatorProfile.update({
    where: { id },
    data: {
      verificationStatus: parsed.data.status,
      kycProvider: parsed.data.status === "VERIFIED" ? "manual" : undefined,
    },
  });
  await audit({
    actorId: user!.id,
    action: "SET_VERIFICATION",
    entityType: "CreatorProfile",
    entityId: creator.id,
    metadata: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
