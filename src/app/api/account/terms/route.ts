import { NextResponse } from "next/server";
import { TERMS_VERSION } from "@/config/app";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const body = await request.json().catch(() => null);
  if (!body || body.acceptTerms !== true) return jsonError(400, "TERMS_REQUIRED");
  await db.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
  });
  return NextResponse.json({ ok: true, termsVersion: TERMS_VERSION });
}
