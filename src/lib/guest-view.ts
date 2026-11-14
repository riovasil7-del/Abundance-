/** Anonymous viewers may join a room to watch. They cannot publish picture, sound, or room data. */
export const GUEST_LIVE_TOKEN_LIMIT = 12;
export const GUEST_LIVE_TOKEN_WINDOW_MS = 10 * 60 * 1000;

export function isGuestIdentity(userId: string | null | undefined): boolean {
  return !userId || userId.startsWith("guest_");
}
