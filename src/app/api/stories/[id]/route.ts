import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { deleteStory, parseVisibility, readStory, updateStory } from "@/server/stories";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const found = await readStory(user?.id ?? null, id);
  if ("error" in found) return jsonError(404, "NOT_FOUND");
  return NextResponse.json({
    id: found.story.id,
    title: found.story.title,
    caption: found.story.caption,
    visibility: found.story.visibility,
    mediaKind: found.story.mediaKind,
    playbackUrl: found.access === "PUBLIC" || found.access === "OWNER" ? found.story.playbackUrl : null,
    peopleNote: found.story.peopleNote,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const visibility = body?.visibility == null ? undefined : parseVisibility(String(body.visibility));
  if (body?.visibility != null && !visibility) return jsonError(400, "INVALID");
  const title = body?.title == null ? undefined : String(body.title);
  const caption = body?.caption == null ? undefined : String(body.caption);
  if ((title != null && (title.trim().length < 2 || title.trim().length > 120)) || (caption != null && (caption.trim().length < 2 || caption.trim().length > 800))) {
    return jsonError(400, "INVALID");
  }
  const updated = await updateStory(user.id, id, { title, caption, visibility: visibility ?? undefined });
  if ("error" in updated && updated.error) return jsonError(updated.error === "FORBIDDEN" ? 403 : 404, updated.error);
  return NextResponse.json({ id: updated.story.id, visibility: updated.story.visibility, status: updated.story.moderationStatus });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED");
  const { id } = await context.params;
  const removed = await deleteStory(user.id, id);
  if ("error" in removed && removed.error) return jsonError(removed.error === "FORBIDDEN" ? 403 : 404, removed.error);
  return NextResponse.json({ ok: true });
}
