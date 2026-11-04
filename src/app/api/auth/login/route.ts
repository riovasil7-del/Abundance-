import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { setSessionCookie, verifyPassword } from "@/server/auth";
import { sessionSecretProblem } from "@/server/session-secret";
import { db } from "@/server/db";
import { jsonError, requestIp } from "@/server/http";
import { memoryRateLimiter } from "@/server/ratelimit";
import { loginBody } from "@/server/validators";

export async function POST(request: Request) {
  const limit = memoryRateLimiter.consume(`login:${requestIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  if (sessionSecretProblem(process.env.AUTH_SECRET)) {
    return jsonError(503, "AUTH_NOT_CONFIGURED");
  }

  const parsed = loginBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError(401, "INVALID_LOGIN");
  }
  try {
    await setSessionCookie(user.id);
  } catch (error) {
    console.error(error);
    return jsonError(503, "AUTH_NOT_CONFIGURED");
  }
  await audit({ actorId: user.id, action: "LOGIN", entityType: "User", entityId: user.id }).catch(() => undefined);
  return NextResponse.json({ ok: true, role: user.role });
}
