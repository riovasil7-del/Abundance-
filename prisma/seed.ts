import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { pathToFileURL } from "node:url";
import { GIFT_CATALOG } from "../src/config/app";
import { allocateEvenly, splitDonation } from "../src/server/fees";

const prisma = new PrismaClient();
const passwordHash = hashSync("DobrySkutok-1", 10);

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysAhead(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function seedDatabase(options: { reset?: boolean } = {}) {
  const reset = options.reset !== false;
  if (!reset) {
    const existing = await prisma.user.count();
    if (existing > 0) throw new Error("ALREADY_SEEDED");
  }
  await prisma.payoutRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.blessing.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.liveMessage.deleteMany();
  await prisma.ledgerAllocation.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.familyMembership.deleteMany();
  await prisma.circleParticipant.deleteMany();
  await prisma.video.deleteMany();
  await prisma.blessingCircle.deleteMany();
  await prisma.gift.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.user.deleteMany();

  const elena = await prisma.user.create({
    data: { email: "elena@hojnost.local", passwordHash, name: "Elena Horváthová", role: "SUPPORTER", locale: "sk" },
  });
  const admin = await prisma.user.create({
    data: { email: "admin@hojnost.local", passwordHash, name: "Mira Adminová", role: "ADMIN", locale: "sk" },
  });
  await prisma.user.create({
    data: { email: "mod@hojnost.local", passwordHash, name: "Adam Moderátor", role: "MODERATOR", locale: "sk" },
  });

  const creators = {
    amina: await prisma.user.create({
      data: {
        email: "amina@hojnost.local",
        passwordHash,
        name: "Amina Otieno",
        role: "CREATOR",
        creatorProfile: {
          create: {
            slug: "amina",
            displayName: "Amina Otieno",
            city: "Nairobi",
            countryCode: "KE",
            craftKey: "weaving",
            avatarUrl: "/avatars/amina.svg",
            verificationStatus: "VERIFIED",
            payoutHoldDays: 7,
            bio: "V Nairobi pletiem košíky a učím susedky, ktoré chcú mať vlastnú prácu. Každý košík ide do nejakej domácnosti.",
            bioEn: "In Nairobi I weave baskets and teach neighbours who want work of their own. Every basket goes to a home.",
          },
        },
      },
      include: { creatorProfile: true },
    }),
    joseph: await prisma.user.create({
      data: {
        email: "joseph@hojnost.local",
        passwordHash,
        name: "Joseph Kamau",
        role: "CREATOR",
        creatorProfile: {
          create: {
            slug: "joseph",
            displayName: "Joseph Kamau",
            city: "Kisumu",
            countryCode: "KE",
            craftKey: "garden",
            avatarUrl: "/avatars/joseph.svg",
            verificationStatus: "VERIFIED",
            payoutHoldDays: 7,
            bio: "Pri Kisumu pestujeme zeleninu a nosíme ju rodinám, ktoré práve nemajú dosť. Záhrada patrí štvrti.",
            bioEn: "Near Kisumu we grow vegetables and carry them to families who are short this week. The garden belongs to the neighbourhood.",
          },
        },
      },
      include: { creatorProfile: true },
    }),
    grace: await prisma.user.create({
      data: {
        email: "grace@hojnost.local",
        passwordHash,
        name: "Grace Wanjiku",
        role: "CREATOR",
        creatorProfile: {
          create: {
            slug: "grace",
            displayName: "Grace Wanjiku",
            city: "Mombasa",
            countryCode: "KE",
            craftKey: "song",
            avatarUrl: "/avatars/grace.svg",
            verificationStatus: "VERIFIED",
            payoutHoldDays: 7,
            bio: "Spievam večer na dvore v Mombase. Pieseň je poďakovanie, nie vystúpenie.",
            bioEn: "I sing in the evening in a Mombasa courtyard. The song is thanks, not a show.",
          },
        },
      },
      include: { creatorProfile: true },
    }),
    daniel: await prisma.user.create({
      data: {
        email: "daniel@hojnost.local",
        passwordHash,
        name: "Daniel Okello",
        role: "CREATOR",
        creatorProfile: {
          create: {
            slug: "daniel",
            displayName: "Daniel Okello",
            city: "Kisumu",
            countryCode: "KE",
            craftKey: "kitchen",
            avatarUrl: "/avatars/daniel.svg",
            verificationStatus: "PENDING",
            payoutHoldDays: 7,
            kycProvider: null,
            bio: "Varím pre susedov, ktorí sa vrátia neskoro z práce. Ešte čakám na overenie.",
            bioEn: "I cook for neighbours who get home late from work. I am still waiting to be verified.",
          },
        },
      },
      include: { creatorProfile: true },
    }),
  };

  const profile = {
    amina: creators.amina.creatorProfile!,
    joseph: creators.joseph.creatorProfile!,
    grace: creators.grace.creatorProfile!,
    daniel: creators.daniel.creatorProfile!,
  };

  const gifts = Object.fromEntries(
    await Promise.all(
      GIFT_CATALOG.map((gift) =>
        prisma.gift
          .create({
            data: {
              slug: gift.slug,
              nameSk: gift.nameSk,
              nameEn: gift.nameEn,
              priceCents: gift.priceCents,
              symbol: gift.symbol,
              sortOrder: gift.sortOrder,
            },
          })
          .then((row) => [gift.slug, row] as const),
      ),
    ),
  );

  const circle = await prisma.blessingCircle.create({
    data: {
      hostId: profile.joseph.id,
      title: "Studňa pre školu",
      titleEn: "A well for the school",
      description:
        "Spoločná práca pre školu, ktorá nosí vodu zďaleka. Kto je overený, dostane rovnaký podiel z každého daru. Nikto neprehráva a nikto sa neponižuje.",
      descriptionEn:
        "Shared work for a school that still carries water from far away. Every verified participant receives an even share of each gift. Nobody loses and nobody is shamed.",
      participants: {
        create: [
          { creatorId: profile.joseph.id, joinedAt: daysAgo(30) },
          { creatorId: profile.amina.id, joinedAt: daysAgo(29) },
          { creatorId: profile.grace.id, joinedAt: daysAgo(28) },
          { creatorId: profile.daniel.id, joinedAt: daysAgo(2) },
        ],
      },
    },
  });

  const videos = {
    amina: await prisma.video.create({
      data: {
        creatorId: profile.amina.id,
        title: "Košík pre susedu Achieng",
        titleEn: "A basket for our neighbour Achieng",
        caption:
          "Dnes sme dokončili košík a zaniesli ho Achieng. Deti sa dívali a pýtali sa, či sa to naučia aj ony. Súhlas rodičov máme.",
        captionEn:
          "Today we finished a basket and carried it to Achieng. The children watched and asked if they could learn too. Their parents have agreed.",
        storageKey: "seed/amina",
        playbackUrl: "/media/amina.mp4",
        posterUrl: "/media/amina.jpg",
        deedKind: "craft",
        consentConfirmed: true,
        createdAt: daysAgo(0.05),
      },
    }),
    joseph: await prisma.video.create({
      data: {
        creatorId: profile.joseph.id,
        title: "Paradajky na koniec ulice",
        titleEn: "Tomatoes for the end of the street",
        caption: "Úroda zo spoločnej záhrady. Nič nepredávame. Kto potrebuje, ten si berie, a budúci týždeň zalieva.",
        captionEn: "A harvest from the shared garden. Nothing is for sale. Whoever needs some takes it, and waters next week.",
        storageKey: "seed/joseph",
        playbackUrl: "/media/joseph.mp4",
        posterUrl: "/media/joseph.jpg",
        deedKind: "good_deed",
        consentConfirmed: true,
        createdAt: daysAgo(2),
      },
    }),
    grace: await prisma.video.create({
      data: {
        creatorId: profile.grace.id,
        title: "Večerná vďaka",
        titleEn: "Evening thanks",
        caption: "Krátka pieseň po tom, čo nám susedia pomohli opraviť dvere. Slová sú jednoduché: ďakujeme, že sme tu.",
        captionEn: "A short song after neighbours helped us repair a door. The words are simple: thank you that we are here.",
        storageKey: "seed/grace",
        playbackUrl: "/media/grace.mp4",
        posterUrl: "/media/grace.jpg",
        deedKind: "song",
        consentConfirmed: true,
        createdAt: daysAgo(3),
      },
    }),
    well: await prisma.video.create({
      data: {
        creatorId: profile.joseph.id,
        circleId: circle.id,
        title: "Miesto, kde bude studňa",
        titleEn: "Where the well will be",
        caption:
          "Škola zatiaľ nosí vodu zďaleka. Tento kruh chce vykopať studňu. Každý, kto sa pridá, robí časť práce a každý dar sa delí rovným dielom.",
        captionEn:
          "The school still carries water from far away. This circle wants to dig a well. Everyone who joins does part of the work, and every gift is shared evenly.",
        storageKey: "seed/well",
        playbackUrl: "/media/well.mp4",
        posterUrl: "/media/well.jpg",
        deedKind: "good_deed",
        consentConfirmed: true,
        createdAt: daysAgo(4),
      },
    }),
    daniel: await prisma.video.create({
      data: {
        creatorId: profile.daniel.id,
        title: "Večera pre nočnú zmenu",
        titleEn: "Supper for the night shift",
        caption: "Hrniec fazule a chlieb pre troch susedov. Video som natočil sám, nikoho iného na ňom niet.",
        captionEn: "A pot of beans and bread for three neighbours. I filmed it myself. Nobody else is in it.",
        storageKey: "seed/daniel",
        playbackUrl: "/media/daniel.mp4",
        posterUrl: "/media/daniel.jpg",
        deedKind: "gratitude",
        consentConfirmed: true,
        createdAt: daysAgo(5),
      },
    }),
  };

  for (const video of Object.values(videos)) {
    await prisma.blessing.create({ data: { userId: elena.id, videoId: video.id } });
  }

  await prisma.comment.create({
    data: {
      userId: elena.id,
      videoId: videos.amina.id,
      body: "Ďakujem. Vidieť, ako košík odchádza domov, mi stačí.",
      moderationStatus: "VISIBLE",
    },
  });
  await prisma.comment.create({
    data: {
      userId: creators.joseph.id,
      videoId: videos.grace.id,
      body: "Tá pieseň mi dnes večer stačila za modlitbu.",
      moderationStatus: "VISIBLE",
    },
  });
  await prisma.comment.create({
    data: {
      userId: creators.daniel.id,
      videoId: videos.grace.id,
      body: "you are worthless",
      moderationStatus: "FLAGGED",
      moderationNote: "kindness_filter",
    },
  });

  await prisma.report.create({
    data: {
      reporterId: elena.id,
      targetType: "VIDEO",
      targetId: videos.daniel.id,
      reason: "other",
      details: "Prosím skontrolovať, či je súhlas v popise dostatočne jasný. Nie je to sťažnosť, len opatrnosť.",
    },
  });

  const family = await prisma.familyMembership.create({
    data: {
      supporterId: elena.id,
      creatorId: profile.grace.id,
      monthlyCents: 500,
      nextChargeAt: daysAhead(18),
    },
  });

  const star = splitDonation(gifts.star.priceCents);
  const starTx = await prisma.ledgerTransaction.create({
    data: {
      donorId: elena.id,
      videoId: videos.amina.id,
      giftId: gifts.star.id,
      kind: "GIFT",
      grossCents: star.grossCents,
      feeCents: star.feeCents,
      netCents: star.netCents,
      status: "AVAILABLE",
      paymentMode: "DEMO",
      holdUntil: daysAgo(13),
      createdAt: daysAgo(20),
      allocations: { create: [{ creatorId: profile.amina.id, netCents: star.netCents }] },
    },
  });

  const heart = splitDonation(gifts.heart.priceCents);
  await prisma.ledgerTransaction.create({
    data: {
      donorId: elena.id,
      videoId: videos.joseph.id,
      giftId: gifts.heart.id,
      kind: "GIFT",
      grossCents: heart.grossCents,
      feeCents: heart.feeCents,
      netCents: heart.netCents,
      status: "HELD",
      paymentMode: "DEMO",
      holdUntil: daysAhead(6),
      createdAt: daysAgo(1),
      allocations: { create: [{ creatorId: profile.joseph.id, netCents: heart.netCents }] },
    },
  });

  const dove = splitDonation(gifts.dove.priceCents);
  const doveShares = allocateEvenly(dove.netCents, 3);
  const doveOrder = [profile.joseph.id, profile.amina.id, profile.grace.id];
  await prisma.ledgerTransaction.create({
    data: {
      donorId: elena.id,
      circleId: circle.id,
      videoId: videos.well.id,
      giftId: gifts.dove.id,
      kind: "CIRCLE",
      grossCents: dove.grossCents,
      feeCents: dove.feeCents,
      netCents: dove.netCents,
      status: "AVAILABLE",
      paymentMode: "DEMO",
      holdUntil: daysAgo(8),
      createdAt: daysAgo(15),
      note: "circle",
      allocations: {
        create: doveOrder.map((creatorId, index) => ({ creatorId, netCents: doveShares[index]! })),
      },
    },
  });

  const candle = splitDonation(gifts.candle.priceCents);
  await prisma.ledgerTransaction.create({
    data: {
      donorId: elena.id,
      videoId: videos.grace.id,
      giftId: gifts.candle.id,
      kind: "GIFT",
      grossCents: candle.grossCents,
      feeCents: candle.feeCents,
      netCents: candle.netCents,
      status: "HELD",
      paymentMode: "DEMO",
      anonymous: false,
      payItForwardFromId: starTx.id,
      holdUntil: daysAhead(5),
      createdAt: daysAgo(2),
      note: "pay-it-forward",
      allocations: { create: [{ creatorId: profile.grace.id, netCents: candle.netCents }] },
    },
  });

  const familySplit = splitDonation(500);
  await prisma.ledgerTransaction.create({
    data: {
      donorId: elena.id,
      giftId: null,
      kind: "FAMILY",
      grossCents: familySplit.grossCents,
      feeCents: familySplit.feeCents,
      netCents: familySplit.netCents,
      status: "AVAILABLE",
      paymentMode: "DEMO",
      familyMembershipId: family.id,
      holdUntil: daysAgo(5),
      createdAt: daysAgo(12),
      note: "family-first-month",
      allocations: { create: [{ creatorId: profile.grace.id, netCents: familySplit.netCents }] },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: elena.id, action: "DONATION", entityType: "LedgerTransaction", entityId: starTx.id, metadata: { grossCents: star.grossCents, feeCents: star.feeCents, netCents: star.netCents } },
      { actorId: admin.id, action: "SET_VERIFICATION", entityType: "CreatorProfile", entityId: profile.amina.id, metadata: { status: "VERIFIED" } },
    ],
  });
}

const invokedDirectly =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  seedDatabase({ reset: true })
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
