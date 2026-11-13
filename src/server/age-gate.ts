/** Self-declared age and a parent's approval. Neither one is an identity check. */

export type AgeAnswer = "unanswered" | "adult" | "minor";

export type PublishDecision = "UNAUTHENTICATED" | "CREATOR_ONLY" | "AGE_REQUIRED" | "PARENT_REQUIRED" | "OK";

export type BroadcastDecision = PublishDecision | "MINOR_NO_LIVE";

export type GiftReceiveDecision = "OK" | "AGE_REQUIRED" | "MINOR_NO_GIFTS";

type AgeUser = {
  adultAttestedAt: Date | null;
  minorDeclaredAt: Date | null;
  creatorProfile?: unknown;
};

type ConsentStamp = { approvedAt: Date | null; revokedAt: Date | null } | null;

export function ageAnswer(user: { adultAttestedAt: Date | null; minorDeclaredAt: Date | null } | null): AgeAnswer {
  if (!user) return "unanswered";
  if (user.adultAttestedAt) return "adult";
  if (user.minorDeclaredAt) return "minor";
  return "unanswered";
}

/** Calendar age. A future or impossible date returns null. */
export function adultFromBirthDate(iso: string, now = new Date()): boolean | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  if (birth.getTime() > now.getTime()) return null;
  let age = now.getUTCFullYear() - year;
  const monthDelta = now.getUTCMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < day)) age -= 1;
  if (age > 120 || age < 0) return null;
  return age >= 18;
}

export function consentActive(consent: ConsentStamp): boolean {
  if (!consent?.approvedAt) return false;
  if (consent.revokedAt && consent.revokedAt.getTime() >= consent.approvedAt.getTime()) return false;
  return true;
}

/** Upload and post. A minor with a current parent approval may post. */
export function publishDecision(user: (AgeUser & { consent?: ConsentStamp }) | null): PublishDecision {
  if (!user) return "UNAUTHENTICATED";
  if (!user.creatorProfile) return "CREATOR_ONLY";
  const answer = ageAnswer(user);
  if (answer === "unanswered") return "AGE_REQUIRED";
  if (answer === "adult") return "OK";
  return consentActive(user.consent ?? null) ? "OK" : "PARENT_REQUIRED";
}

/** Public live stays closed until a self-declared 18+. */
export function broadcastDecision(user: (AgeUser & { consent?: ConsentStamp }) | null): BroadcastDecision {
  const publish = publishDecision(user);
  if (publish !== "OK") return publish;
  if (user && ageAnswer(user) === "minor") return "MINOR_NO_LIVE";
  return "OK";
}

/** Only a self-declared 18+ creator can be paid a gift. */
export function giftReceiveDecision(user: { adultAttestedAt: Date | null; minorDeclaredAt: Date | null } | null): GiftReceiveDecision {
  if (!user) return "AGE_REQUIRED";
  if (user.adultAttestedAt) return "OK";
  if (user.minorDeclaredAt) return "MINOR_NO_GIFTS";
  return "AGE_REQUIRED";
}
