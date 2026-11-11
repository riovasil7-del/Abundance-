import { db } from "./db";

export { filterIdeas, moderateIdeaDecision, proposeDecision, publicIdea } from "../lib/idea-rules";

export async function saveIdea(userId: string, ideaId: string): Promise<"NOT_FOUND" | "SAVED" | "REMOVED"> {
  const idea = await db.idea.findUnique({ where: { id: ideaId } });
  if (!idea || idea.status !== "approved") return "NOT_FOUND";
  const existing = await db.ideaSave.findUnique({ where: { userId_ideaId: { userId, ideaId } } });
  if (existing) {
    await db.ideaSave.delete({ where: { id: existing.id } });
    return "REMOVED";
  }
  await db.ideaSave.create({ data: { userId, ideaId } });
  return "SAVED";
}
