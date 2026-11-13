import { NextResponse } from "next/server";
import { z } from "zod";
import { adultFromBirthDate } from "@/server/age-gate";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.union([
  z.object({ adult: z.literal(true) }),
  z.object({ minor: z.literal(true) }),
  z.object({ birthDate: z.string().trim().min(8).max(10) }),
]);

/** Records a self-declaration only. It does not verify age or identity. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  let adult = false;
  let birthDate: Date | null = null;
  if ("birthDate" in parsed.data) {
    const decision = adultFromBirthDate(parsed.data.birthDate);
    if (decision === null) return jsonError(400, "INVALID");
    adult = decision;
    const [year, month, day] = parsed.data.birthDate.split("-").map(Number);
    birthDate = new Date(Date.UTC(year, month - 1, day));
  } else if ("adult" in parsed.data) {
    adult = true;
  }

  await db.user.update({
    where: { id: user.id },
    data: adult
      ? { adultAttestedAt: user.adultAttestedAt ?? new Date(), minorDeclaredAt: null, ...(birthDate ? { birthDate } : {}) }
      : { adultAttestedAt: null, minorDeclaredAt: user.minorDeclaredAt ?? new Date(), ...(birthDate ? { birthDate } : {}) },
  });
  await audit({
    actorId: user.id,
    action: adult ? "ADULT_ATTESTED" : "MINOR_DECLARED",
    entityType: "User",
    entityId: user.id,
    metadata: { identityCheck: false },
  });
  return NextResponse.json({ ok: true, adult, identityCheck: false });
}
