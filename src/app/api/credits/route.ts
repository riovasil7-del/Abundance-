import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { beginPackPurchase, CreditError } from "@/server/credits";
import { jsonError } from "@/server/http";
import { clientKey, memoryRateLimiter } from "@/server/ratelimit";

const bodySchema = z.object({
  packSlug: z.string().trim().min(1).max(40),
  token: z.string().trim().min(8).max(80),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const limit = memoryRateLimiter.consume(clientKey(request, "lights", user.id), 8, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  try {
    const result = await beginPackPurchase({
      userId: user.id,
      packSlug: parsed.data.packSlug,
      token: parsed.data.token,
      origin,
    });
    if (result.mode === "demo" && !result.replayed) {
      await audit({
        actorId: user.id,
        action: "LIGHT_PACK",
        entityType: "User",
        entityId: user.id,
        metadata: { packSlug: parsed.data.packSlug, lights: result.lights, mode: "demo" },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CreditError) return jsonError(400, error.code);
    throw error;
  }
}
