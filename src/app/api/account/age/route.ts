import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  adult: z.literal(true),
});

/** Records a self-declaration only. It does not verify age or identity. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  if (!user.adultAttestedAt) {
    await db.user.update({ where: { id: user.id }, data: { adultAttestedAt: new Date() } });
    await audit({
      actorId: user.id,
      action: "ADULT_ATTESTED",
      entityType: "User",
      entityId: user.id,
      metadata: { identityCheck: false },
    });
  }
  return NextResponse.json({ ok: true, identityCheck: false });
}
