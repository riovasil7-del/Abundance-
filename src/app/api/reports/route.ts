import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { CHAT_REPORT_LIMIT, CHAT_REPORT_WINDOW_MS } from "@/lib/live-chat";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";
import { reportBody } from "@/server/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "report", user.id), CHAT_REPORT_LIMIT, CHAT_REPORT_WINDOW_MS);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");
  const parsed = reportBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details?.trim() || null,
    },
  });
  await audit({
    actorId: user.id,
    action: "REPORT",
    entityType: parsed.data.targetType,
    entityId: parsed.data.targetId,
    metadata: { reason: parsed.data.reason, reportId: report.id },
  });
  return NextResponse.json({ ok: true });
}
