import { NextResponse } from "next/server";
import { z } from "zod";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.object({ theme: z.enum(["pearl", "diamond", "garden"]) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parseTheme(parsed.data.theme)) return jsonError(400, "INVALID");
  await db.user.update({ where: { id: user.id }, data: { themeChoice: parsed.data.theme } });
  const response = NextResponse.json({ theme: parsed.data.theme });
  response.cookies.set(THEME_COOKIE, parsed.data.theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
