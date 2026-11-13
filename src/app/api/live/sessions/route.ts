import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { broadcastDecision } from "@/server/age-gate";
import { jsonError } from "@/server/http";
import { readLiveKitCredentials } from "@/server/live-access";
import { openLiveSession } from "@/server/live-sessions";
import { isContentCategory } from "@/config/app";
import { termsDecision } from "@/server/terms";
import { db } from "@/server/db";
import { toPublicLiveCard, visibleLiveSessions } from "@/lib/live-list";

export async function GET(request: Request) {
  const categoryParam = new URL(request.url).searchParams.get("category");
  const category = isContentCategory(categoryParam) ? categoryParam : null;
  const rows = await db.liveSession.findMany({
    where: { status: "LIVE" },
    include: { host: true },
    orderBy: { startedAt: "desc" },
  });
  const sessions = visibleLiveSessions(rows, category).map(toPublicLiveCard);
  return NextResponse.json({ sessions }, { headers: { "cache-control": "no-store" } });
}

const bodySchema = z.object({
  title: z.string().trim().max(120).optional(),
  circleId: z.string().trim().min(1).max(80).optional(),
  contentCategory: z.string().trim().max(40).optional(),
  ideaSlug: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  const liveGate = broadcastDecision({ ...user, consent: user.parentalConsent });
  if (liveGate !== "OK") return jsonError(403, liveGate);
  if (termsDecision(user) === "TERMS_REQUIRED") return jsonError(403, "TERMS_REQUIRED");
  if (!readLiveKitCredentials()) return jsonError(503, "LIVE_NOT_CONFIGURED");

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "INVALID");

  try {
    const session = await openLiveSession({
      host: user.creatorProfile,
      title: parsed.data.title,
      circleId: parsed.data.circleId,
      contentCategory: isContentCategory(parsed.data.contentCategory) ? parsed.data.contentCategory : null,
      ideaSlug: parsed.data.ideaSlug ?? null,
    });
    await audit({
      actorId: user.id,
      action: "LIVE_SESSION_OPEN",
      entityType: "LiveSession",
      entityId: session.id,
      metadata: { roomName: session.roomName, circleId: session.circleId },
    });
    return NextResponse.json({ id: session.id, roomName: session.roomName, configured: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_IN_CIRCLE") return jsonError(403, "NOT_IN_CIRCLE");
    throw error;
  }
}
