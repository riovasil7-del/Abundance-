import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { readLiveKitCredentials } from "@/server/live-access";
import { openLiveSession } from "@/server/live-sessions";

const bodySchema = z.object({
  title: z.string().trim().max(120).optional(),
  circleId: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.creatorProfile) return jsonError(403, "CREATOR_ONLY");
  if (!readLiveKitCredentials()) return jsonError(503, "LIVE_NOT_CONFIGURED");

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "INVALID");

  try {
    const session = await openLiveSession({
      host: user.creatorProfile,
      title: parsed.data.title,
      circleId: parsed.data.circleId,
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
