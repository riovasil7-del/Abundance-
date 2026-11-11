import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { collabView, inviteCohost, respondToInvite } from "@/server/community";
import { jsonError } from "@/server/http";

const inviteSchema = z.object({
  inviteeId: z.string().trim().min(1).max(80),
});

const respondSchema = z.object({
  inviteId: z.string().trim().min(1).max(80),
  action: z.enum(["accept", "decline", "revoke"]),
  consent: z.boolean().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const view = await collabView(id, user?.id ?? null);
  if (!view) return jsonError(404, "NOT_FOUND");
  return NextResponse.json({
    maxCohosts: view.maxCohosts,
    isHost: view.isHost,
    canPublish: view.canPublish,
    pendingForMe: view.pendingForMe ? { id: view.pendingForMe.id } : null,
    invites: view.isHost || view.pendingForMe ? view.invites : view.invites.filter((invite) => invite.status === "ACCEPTED"),
    candidates: view.candidates,
    recipients: view.recipients,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const raw = await request.json().catch(() => null);
  const invite = inviteSchema.safeParse(raw);
  if (invite.success) {
    const result = await inviteCohost({ actorId: user?.id ?? null, sessionId: id, inviteeId: invite.data.inviteeId });
    if ("error" in result && result.error) {
      const status = result.error === "UNAUTHENTICATED" ? 401 : result.error === "NOT_FOUND" ? 404 : result.error === "NOT_HOST" || result.error === "BLOCKED" ? 403 : 400;
      return jsonError(status, result.error);
    }
    if (!("invite" in result) || !result.invite) return jsonError(500, "INVALID");
    return NextResponse.json({ id: result.invite.id, status: result.invite.status });
  }
  const respond = respondSchema.safeParse(raw);
  if (!respond.success) return jsonError(400, "INVALID");
  const result = await respondToInvite({
    actorId: user?.id ?? null,
    inviteId: respond.data.inviteId,
    action: respond.data.action,
    consent: Boolean(respond.data.consent),
  });
  if ("error" in result && result.error) {
    const status = result.error === "UNAUTHENTICATED" ? 401 : result.error === "NOT_FOUND" ? 404 : result.error === "NOT_HOST" || result.error === "NOT_INVITEE" ? 403 : 400;
    return jsonError(status, result.error);
  }
  if (!("invite" in result) || !result.invite) return jsonError(500, "INVALID");
  return NextResponse.json({ id: result.invite.id, status: result.invite.status });
}
