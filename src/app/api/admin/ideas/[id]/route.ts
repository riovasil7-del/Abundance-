import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { moderateIdeaDecision } from "@/lib/idea-rules";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  const decision = moderateIdeaDecision(user?.role ?? null, status);
  if (decision === "FORBIDDEN") return jsonError(403, "FORBIDDEN");
  if (decision !== "OK" || !user) return jsonError(400, "INVALID");
  const { id } = await context.params;
  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return jsonError(404, "NOT_FOUND");
  await db.idea.update({ where: { id }, data: { status } });
  await audit({
    actorId: user.id,
    action: status === "approved" ? "IDEA_APPROVED" : "IDEA_PENDING",
    entityType: "Idea",
    entityId: id,
  });
  return NextResponse.json({ ok: true, status });
}
