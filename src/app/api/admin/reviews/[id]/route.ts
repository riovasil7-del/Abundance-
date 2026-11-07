import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { resolveAccountReview } from "@/server/reviews";

const bodySchema = z.object({
  action: z.enum(["restore", "release", "retain"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const { id } = await context.params;
  const result = await resolveAccountReview({
    actor: user ? { id: user.id, role: user.role } : null,
    reviewId: id,
    action: parsed.data.action,
  });
  if (!result.ok) {
    const status = result.error === "NOT_FOUND" ? 404 : result.error === "UNAUTHENTICATED" ? 401 : 403;
    return jsonError(status, result.error);
  }
  return NextResponse.json(result);
}
