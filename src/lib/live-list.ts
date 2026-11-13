/** A row the public "who is live" list is allowed to see. No room name and no token. */
export type LiveListRow = {
  status: string;
  contentCategory: string | null;
};

/**
 * Who appears under "Kto je teraz naživo".
 * The list is everyone currently LIVE. It does not look at the viewer, their language,
 * who they follow, or a low-data setting.
 * A broadcast with no category is a general one: a category chip must not hide it.
 * A chip still hides a broadcast that was filed under a different category.
 */
export function visibleLiveSessions<T extends LiveListRow>(sessions: readonly T[], category: string | null): T[] {
  return sessions.filter((session) => {
    if (session.status !== "LIVE") return false;
    if (!category) return true;
    return session.contentCategory == null || session.contentCategory === category;
  });
}

export type PublicLiveCard = {
  id: string;
  title: string;
  circle: boolean;
  contentCategory: string | null;
  hostName: string;
  hostAvatar: string;
};

export function toPublicLiveCard(session: {
  id: string;
  title: string;
  circleId: string | null;
  contentCategory: string | null;
  host: { displayName: string; avatarUrl: string };
}): PublicLiveCard {
  return {
    id: session.id,
    title: session.title,
    circle: Boolean(session.circleId),
    contentCategory: session.contentCategory,
    hostName: session.host.displayName,
    hostAvatar: session.host.avatarUrl,
  };
}
