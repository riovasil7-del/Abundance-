import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import {
  hideCreator,
  parseLanguages,
  parseRegion,
  parseTopic,
  preferenceDecision,
  readTaste,
  resetTaste,
  setLanguages,
  setRegion,
  setTopic,
  unhideCreator,
} from "@/server/taste";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("topic"), topic: z.string().trim().min(1).max(40), interested: z.boolean() }),
  z.object({ action: z.literal("hide"), creatorId: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal("unhide"), creatorId: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal("languages"), languages: z.array(z.string().trim().min(2).max(8)).max(4) }),
  z.object({ action: z.literal("region"), regionCode: z.string().trim().max(2).nullable() }),
]);

export async function GET() {
  const user = await getCurrentUser();
  if (preferenceDecision(user) !== "OK" || !user) return jsonError(401, "UNAUTHENTICATED");
  return NextResponse.json(await readTaste(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (preferenceDecision(user) !== "OK" || !user) return jsonError(401, "UNAUTHENTICATED");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "INVALID");
  const body = parsed.data;
  if (body.action === "topic") {
    const topic = parseTopic(body.topic);
    if (!topic) return jsonError(400, "INVALID");
    await setTopic(user.id, topic, body.interested);
  } else if (body.action === "hide") {
    const result = await hideCreator(user.id, body.creatorId);
    if ("error" in result && result.error) return jsonError(404, result.error);
  } else if (body.action === "unhide") {
    await unhideCreator(user.id, body.creatorId);
  } else if (body.action === "languages") {
    const languages = parseLanguages(body.languages);
    if (!languages) return jsonError(400, "INVALID");
    await setLanguages(user.id, languages);
  } else {
    const region = parseRegion(body.regionCode);
    if (region === "INVALID") return jsonError(400, "INVALID");
    await setRegion(user.id, region);
  }
  return NextResponse.json(await readTaste(user.id));
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (preferenceDecision(user) !== "OK" || !user) return jsonError(401, "UNAUTHENTICATED");
  await resetTaste(user.id);
  return NextResponse.json(await readTaste(user.id));
}
