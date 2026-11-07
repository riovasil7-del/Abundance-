import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { staffVerificationDecision } from "@/server/money";
import { verificationBody } from "@/server/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const existing = await db.creatorProfile.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "NOT_FOUND");
  const decision = staffVerificationDecision(user, existing.userId);
  if (decision === "UNAUTHENTICATED") return jsonError(401, "UNAUTHENTICATED");
  if (decision === "FORBIDDEN") return jsonError(403, "FORBIDDEN");
  if (decision === "SELF_REVIEW") return jsonError(403, "SELF_REVIEW");
  const parsed = verificationBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const creator = await db.creatorProfile.update({
    where: { id },
    data: { verificationStatus: parsed.data.status },
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
