import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { listPrivateNotes, sendEncouragement } from "@/server/community";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  toUserId: z.string().trim().min(1).max(80),
  kind: z.enum(["THANKS", "HELPFUL"]),
  body: z.string().trim().max(280).optional().or(z.literal("")),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const notes = await listPrivateNotes(user.id);
  return NextResponse.json({
    notes: notes.map((note) => ({
      id: note.id,
      kind: note.kind,
      body: note.body,
      fromName: note.fromUser.name,
      createdAt: note.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  if (parsed.data.kind === "THANKS" && !parsed.data.body?.trim()) return jsonError(400, "INVALID");
  const result = await sendEncouragement({
    fromUserId: user?.id ?? null,
    toUserId: parsed.data.toUserId,
    kind: parsed.data.kind,
    body: parsed.data.body ?? "",
  });
  if ("error" in result && result.error) {
    const status =
      result.error === "UNAUTHENTICATED" ? 401 : result.error === "RATE_LIMITED" ? 429 : result.error === "BLOCKED" || result.error === "HELD" ? 403 : 400;
    return jsonError(status, result.error);
  }
  if (!("note" in result) || !result.note) return jsonError(500, "INVALID");
  return NextResponse.json({ id: result.note.id });
}
