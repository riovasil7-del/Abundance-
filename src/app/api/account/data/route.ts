import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { mediaPublishDecision } from "@/lib/low-data";

const bodySchema = z.object({ lowData: z.boolean() });

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    lowData: Boolean(user?.lowData),
    photo: mediaPublishDecision(),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  await db.user.update({ where: { id: user.id }, data: { lowData: parsed.data.lowData } });
  return NextResponse.json({ lowData: parsed.data.lowData, photo: mediaPublishDecision() });
}
