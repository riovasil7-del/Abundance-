import { isIdeaCategory, type IdeaCategory } from "../config/app";

export function filterIdeas<T extends { category: string; title: string; titleEn?: string | null; description: string; descriptionEn?: string | null; status?: string }>(
  ideas: readonly T[],
  input: { category?: string | null; query?: string | null },
): T[] {
  const category = input.category && isIdeaCategory(input.category) ? input.category : null;
  const query = input.query?.trim().toLowerCase() ?? "";
  return ideas.filter((idea) => {
    if (category && idea.category !== category) return false;
    if (!query) return true;
    const haystack = [idea.title, idea.titleEn, idea.description, idea.descriptionEn].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function proposeDecision(input: {
  userId: string | null;
  title: string;
  description: string;
  category: string;
  minutes: number;
}): "UNAUTHENTICATED" | "INVALID" | "OK" {
  if (!input.userId) return "UNAUTHENTICATED";
  if (!isIdeaCategory(input.category)) return "INVALID";
  if (input.title.trim().length < 3 || input.title.trim().length > 120) return "INVALID";
  if (input.description.trim().length < 8 || input.description.trim().length > 600) return "INVALID";
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 180) return "INVALID";
  return "OK";
}

export function moderateIdeaDecision(role: string | null, status: string): "FORBIDDEN" | "INVALID" | "OK" {
  if (role !== "MODERATOR" && role !== "ADMIN") return "FORBIDDEN";
  if (status !== "approved" && status !== "pending") return "INVALID";
  return "OK";
}

export function publicIdea(
  idea: {
    id: string;
    slug: string;
    title: string;
    description: string;
    titleEn: string | null;
    descriptionEn: string | null;
    category: string;
    estimatedMinutes: number;
    isFree: boolean;
    status: string;
    saved?: boolean;
  },
  locale: string,
) {
  const english = locale !== "sk";
  return {
    id: idea.id,
    slug: idea.slug,
    title: english && idea.titleEn ? idea.titleEn : idea.title,
    description: english && idea.descriptionEn ? idea.descriptionEn : idea.description,
    category: idea.category as IdeaCategory,
    estimatedMinutes: idea.estimatedMinutes,
    isFree: idea.isFree,
    status: idea.status,
    saved: Boolean(idea.saved),
  };
}
