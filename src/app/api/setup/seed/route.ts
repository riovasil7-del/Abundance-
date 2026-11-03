import { NextResponse } from "next/server";
import { jsonError } from "@/server/http";
import { seedDatabase } from "../../../../../prisma/seed";

export async function POST(request: Request) {
  const expected = process.env.SEED_SECRET?.trim();
  if (!expected) return jsonError(404, "SEED_DISABLED");
  const given = request.headers.get("x-seed-secret")?.trim();
  if (!given || given !== expected) return jsonError(401, "INVALID");
  try {
    await seedDatabase({ reset: false });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SEEDED") {
      return jsonError(409, "ALREADY_SEEDED");
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
