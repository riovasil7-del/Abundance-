import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { filterIdeas, proposeDecision, publicIdea } from "@/lib/idea-rules";
import { jsonError } from "@/server/http";
import { slugify } from "@/server/slug";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  const ideas = await db.idea.findMany({
    where: { status: "approved" },
    orderBy: { title: "asc" },
    include: user ? { saves: { where: { userId: user.id }, select: { id: true } } } : undefined,
  });
  const rows = ideas.map((idea) => ({
    ...idea,
    saved: "saves" in idea && Array.isArray(idea.saves) ? idea.saves.length > 0 : false,
  }));
  const savedOnly = url.searchParams.get("saved") === "1";
  const filtered = filterIdeas(savedOnly ? rows.filter((idea) => idea.saved) : rows, {
    category: url.searchParams.get("category"),
    query: url.searchParams.get("q"),
  });
  return NextResponse.json({
    ideas: filtered.map((idea) => publicIdea(idea, url.searchParams.get("locale") ?? "sk")),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "");
  const description = String(body?.description ?? "");
  const category = String(body?.category ?? "");
  const minutes = Number(body?.minutes);
  const decision = proposeDecision({
    userId: user?.id ?? null,
    title,
    description,
    category,
    minutes,
  });
  if (decision === "UNAUTHENTICATED") return jsonError(401, decision);
  if (decision !== "OK" || !user) return jsonError(400, "INVALID");
  const base = slugify(title).slice(0, 40) || "napad";
  let slug = `${base}-${user.id.slice(0, 6)}`;
  let n = 2;
  while (await db.idea.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  const idea = await db.idea.create({
    data: {
      slug,
      title: title.trim(),
      description: description.trim(),
      category,
      estimatedMinutes: minutes,
      isFree: body?.isFree !== false,
      locale: "sk",
      status: "pending",
      createdById: user.id,
    },
  });
  return NextResponse.json({ id: idea.id, status: idea.status });
}
