import { NextResponse } from "next/server";
import { z } from "zod";
import { consentActive } from "@/server/age-gate";
import { audit } from "@/server/audit";
import { hashConsentToken } from "@/server/consent-token";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  action: z.enum(["approve", "revoke"]),
  parentName: z.string().trim().min(2).max(80).optional(),
  guardian: z.literal(true).optional(),
});

async function load(token: string) {
  if (!token || token.length < 20) return null;
  return db.parentalConsent.findUnique({
    where: { tokenHash: hashConsentToken(token) },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const row = await load(token);
  if (!row) return jsonError(404, "NOT_FOUND");
  return NextResponse.json({
    childName: row.user.name,
    status: consentActive(row) ? "approved" : row.revokedAt ? "revoked" : "pending",
    identityCheck: false,
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const row = await load(token);
  if (!row) return jsonError(404, "NOT_FOUND");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  if (parsed.data.action === "approve") {
    if (parsed.data.guardian !== true || !parsed.data.parentName) return jsonError(400, "INVALID");
    await db.parentalConsent.update({
      where: { id: row.id },
      data: {
        parentName: parsed.data.parentName,
        guardianConfirmed: true,
        approvedAt: new Date(),
        revokedAt: null,
      },
    });
    await audit({
      actorId: null,
      action: "GUARDIAN_APPROVED",
      entityType: "ParentalConsent",
      entityId: row.userId,
      metadata: { identityCheck: false },
    });
    return NextResponse.json({ ok: true, status: "approved", identityCheck: false });
  }
  await db.parentalConsent.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), guardianConfirmed: false },
  });
  await audit({
    actorId: null,
    action: "GUARDIAN_REVOKED",
    entityType: "ParentalConsent",
    entityId: row.userId,
    metadata: { identityCheck: false },
  });
  return NextResponse.json({ ok: true, status: "revoked", identityCheck: false });
}
