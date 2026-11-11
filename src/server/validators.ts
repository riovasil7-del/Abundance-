import { z } from "zod";
import { CRAFT_KEYS, DEED_KINDS, FAMILY_TIERS_CENTS, REPORT_REASONS } from "../config/app";

export const registerBody = z.object({
  acceptTerms: z.literal(true),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
  role: z.enum(["SUPPORTER", "CREATOR"]),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  craftKey: z.enum(CRAFT_KEYS).optional(),
});

export const loginBody = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

export const giftBody = z.object({
  giftSlug: z.string().trim().min(1).max(40),
  videoId: z.string().trim().min(1).max(80).optional(),
  circleId: z.string().trim().min(1).max(80).optional(),
  anonymous: z.boolean().optional(),
  payItForwardFromId: z.string().trim().min(1).max(80).nullable().optional(),
  token: z.string().trim().min(8).max(80).regex(/^[A-Za-z0-9_.:-]+$/).optional(),
  recipientCreatorId: z.string().trim().min(1).max(80).optional(),
});

export const commentBody = z.object({
  body: z.string().trim().min(1).max(280),
});

export const reportBody = z.object({
  targetType: z.enum(["VIDEO", "COMMENT", "USER", "ENCOURAGEMENT", "UPDATE"]),
  targetId: z.string().trim().min(1).max(80),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional().or(z.literal("")),
});

export const familyBody = z.object({
  creatorId: z.string().trim().min(1).max(80),
  tierCents: z.number().int().refine((value): value is (typeof FAMILY_TIERS_CENTS)[number] =>
    (FAMILY_TIERS_CENTS as readonly number[]).includes(value),
  ),
  anonymous: z.boolean().optional(),
});

export const circleBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(800),
});

export const verificationBody = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "UNVERIFIED"]),
});

export const moderationBody = z.object({
  status: z.enum(["VISIBLE", "HIDDEN", "REMOVED", "FLAGGED"]),
});

export const reportReviewBody = z.object({
  status: z.enum(["REVIEWED", "DISMISSED", "OPEN"]),
});

export const deedKind = z.enum(DEED_KINDS);
