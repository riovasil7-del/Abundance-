import { capTail } from "./gift-guard";

export const VISIBLE_CHAT_LINES = 6;
export const CHAT_RATE_LIMIT = 8;
export const CHAT_RATE_WINDOW_MS = 60_000;

export type RoomLine = {
  id: string;
  kind: "chat" | "gift" | "join";
  author: string;
  authorId: string;
  body: string;
  createdAt: string;
};

/** The same lines reach the host and every viewer, except people they have blocked. */
export function deliverRoomLines(input: {
  lines: readonly RoomLine[];
  blockedAuthorIds?: readonly string[];
  paused?: boolean;
  incoming?: RoomLine | null;
}): RoomLine[] {
  const blocked = new Set(input.blockedAuthorIds ?? []);
  const base = input.lines.filter((line) => !blocked.has(line.authorId));
  const withIncoming =
    input.incoming && !input.paused && !blocked.has(input.incoming.authorId) && !base.some((line) => line.id === input.incoming!.id)
      ? [...base, input.incoming]
      : base;
  return capTail(withIncoming, VISIBLE_CHAT_LINES);
}

export function canModerateChat(input: { isHost: boolean; isCohost?: boolean; role: string | null | undefined }): boolean {
  return input.isHost || Boolean(input.isCohost) || input.role === "MODERATOR" || input.role === "ADMIN";
}

/** Personal blocks hide lines only for that viewer. A room mute hides them for everyone. */
export function linesForViewer(
  lines: readonly RoomLine[],
  input: { personalBlockedIds?: readonly string[]; roomMutedIds?: readonly string[] },
): RoomLine[] {
  const personal = new Set(input.personalBlockedIds ?? []);
  const muted = new Set(input.roomMutedIds ?? []);
  return lines.filter((line) => !personal.has(line.authorId) && !muted.has(line.authorId));
}

export const CHAT_REPORT_REASONS = ["harassment", "spam", "inappropriate", "other"] as const;
export const CHAT_REPORT_LIMIT = 10;
export const CHAT_REPORT_WINDOW_MS = 60 * 60 * 1000;

export function chatReportRecord(input: { messageId: string; messageBody: string; reason: (typeof CHAT_REPORT_REASONS)[number]; note?: string }) {
  const note = input.note?.trim();
  return {
    targetType: "LIVE_CHAT" as const,
    targetId: input.messageId,
    reason: input.reason,
    details: [`message: ${input.messageBody}`, note ? `note: ${note}` : ""].filter(Boolean).join("\n"),
  };
}

export function giftRoomLine(input: { id: string; author: string; authorId: string; gift: string; createdAt: string }): RoomLine {
  return {
    id: `gift-${input.id}`,
    kind: "gift",
    author: input.author,
    authorId: input.authorId,
    body: input.gift,
    createdAt: input.createdAt,
  };
}

export function joinRoomLine(input: { id: string; author: string; authorId: string; createdAt: string }): RoomLine {
  return {
    id: input.id,
    kind: "join",
    author: input.author,
    authorId: input.authorId,
    body: "",
    createdAt: input.createdAt,
  };
}

export function translateConfigured(env: { key?: string; url?: string }): boolean {
  return Boolean(env.key && env.url);
}
