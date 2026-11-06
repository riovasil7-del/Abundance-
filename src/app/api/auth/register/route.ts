import { NextResponse } from "next/server";
import { CRAFT_KEYS, payoutHoldDays } from "@/config/app";
import { audit } from "@/server/audit";
import { hashPassword, setSessionCookie } from "@/server/auth";
import { sessionSecretProblem } from "@/server/session-secret";
import { db } from "@/server/db";
import { jsonError, requestIp } from "@/server/http";
import { memoryRateLimiter } from "@/server/ratelimit";
import { slugify } from "@/server/slug";
import { registerBody } from "@/server/validators";

export async function POST(request: Request) {
  const limit = memoryRateLimiter.consume(`register:${requestIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED");

  const parsed = registerBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const body = parsed.data;
  const phone = body.phone?.trim() || null;

  if (sessionSecretProblem(process.env.AUTH_SECRET)) {
    return jsonError(503, "AUTH_NOT_CONFIGURED");
  }

  if (body.role === "CREATOR") {
    if (!body.displayName?.trim() || !body.city?.trim() || !body.bio?.trim() || !body.craftKey) {
      return jsonError(400, "CREATOR_FIELDS");
    }
    if (!(CRAFT_KEYS as readonly string[]).includes(body.craftKey)) return jsonError(400, "INVALID");
  }

  let user;
  try {
    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash: await hashPassword(body.password),
          name: body.name.trim(),
          role: body.role,
          phone,
        },
      });
      if (body.role === "CREATOR") {
        const base = slugify(body.displayName!.trim());
        let slug = base;
        let n = 2;
        while (await tx.creatorProfile.findUnique({ where: { slug } })) {
          slug = `${base.slice(0, 34)}-${n}`;
          n += 1;
        }
        await tx.creatorProfile.create({
          data: {
            userId: created.id,
            slug,
            displayName: body.displayName!.trim(),
            bio: body.bio!.trim(),
            city: body.city!.trim(),
            avatarUrl: "/avatars/new.svg",
            craftKey: body.craftKey!,
            verificationStatus: "PENDING",
            payoutHoldDays: payoutHoldDays(),
          },
        });
      }
      return created;
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return jsonError(409, "ACCOUNT_EXISTS");
    }
    console.error(error);
    return jsonError(500, "SERVER");
  }

  await audit({
    actorId: user.id,
    action: "REGISTER",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role },
  }).catch(() => undefined);

  try {
    await setSessionCookie(user.id);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: true, needsLogin: true, error: "SESSION_NOT_STARTED" });
  }
  return NextResponse.json({ ok: true });
}
