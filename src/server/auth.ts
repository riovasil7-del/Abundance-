import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { CreatorProfile, ParentalConsent, Role, User } from "@prisma/client";
import { db } from "./db";
import { sessionSecretProblem } from "./session-secret";

export const SESSION_COOKIE = "hojnost_session";

export type SessionUser = User & { creatorProfile: CreatorProfile | null; parentalConsent: ParentalConsent | null };

function secretKey(): Uint8Array {
  if (sessionSecretProblem(process.env.AUTH_SECRET)) {
    throw new Error("AUTH_SECRET is missing");
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET!.trim());
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function readSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const userId = await readSessionUserId(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    include: { creatorProfile: true, parentalConsent: true },
  });
}

export function hasRole(user: { role: Role } | null, roles: Role[]): boolean {
  return Boolean(user && roles.includes(user.role));
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
