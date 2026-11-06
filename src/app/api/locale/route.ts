import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale } from "@/config/app";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

const bodySchema = z.object({
  locale: z.string(),
  chosen: z.boolean().optional(),
});

function writeLocale(response: NextResponse, locale: string, chosen: boolean) {
  const common = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
  if (chosen) {
    response.cookies.set("locale", locale, { ...common, maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set("localeChosen", "1", { ...common, maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set("localeAuto", "", { ...common, maxAge: 0 });
  } else {
    response.cookies.set("localeAuto", locale, common);
  }
  return response;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isLocale(parsed.data.locale)) return jsonError(400, "INVALID");
  const chosen = parsed.data.chosen !== false;
  const user = await getCurrentUser();
  if (chosen && user) {
    await db.user.update({
      where: { id: user.id },
      data: { locale: parsed.data.locale, localeChosen: true },
    });
  }
  return writeLocale(NextResponse.json({ ok: true, locale: parsed.data.locale }), parsed.data.locale, chosen);
}
