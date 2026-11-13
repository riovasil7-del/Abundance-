import { NextResponse } from "next/server";
import { z } from "zod";
import { ageAnswer } from "@/server/age-gate";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { newConsentToken } from "@/server/consent-token";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { sendGuardianEmail } from "@/server/mail";
import { messagesFor, negotiateLocale } from "@/i18n";

const bodySchema = z.object({
  parentEmail: z.string().trim().email().max(200),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  if (ageAnswer(user) !== "minor") return jsonError(403, "AGE_REQUIRED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  const { token, hash } = newConsentToken();
  await db.parentalConsent.upsert({
    where: { userId: user.id },
    create: { userId: user.id, parentEmail: parsed.data.parentEmail, tokenHash: hash },
    update: {
      parentEmail: parsed.data.parentEmail,
      tokenHash: hash,
      parentName: null,
      approvedAt: null,
      revokedAt: null,
      guardianConfirmed: false,
    },
  });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const link = `${origin}/consent/${token}`;
  const copy = messagesFor(negotiateLocale(user.locale)).guardian;
  const sent = await sendGuardianEmail({
    to: parsed.data.parentEmail,
    subject: copy.mailSubject,
    text: `${copy.mailBody}\n${link}`,
  });
  await audit({
    actorId: user.id,
    action: "GUARDIAN_LINK",
    entityType: "ParentalConsent",
    entityId: user.id,
    metadata: { sent: sent.sent, identityCheck: false },
  });
  return NextResponse.json({ ok: true, sent: sent.sent, link: sent.sent ? null : link });
}
