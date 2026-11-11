import type { Prisma } from "@prisma/client";
import { attributeRecordedNet, distributeExact } from "./money";

export async function lotRemaining(tx: Prisma.TransactionClient, packEntryId: string, packAmount: number): Promise<number> {
  const [used, released] = await Promise.all([
    tx.creditAllocation.aggregate({ where: { packEntryId }, _sum: { lights: true } }),
    tx.creditRelease.aggregate({ where: { packEntryId }, _sum: { lights: true } }),
  ]);
  return packAmount - (used._sum.lights ?? 0) + (released._sum.lights ?? 0);
}

export async function clawbackPack(
  tx: Prisma.TransactionClient,
  packEntryId: string,
  generation: number,
): Promise<{ reverseLights: number; reservedCents: number }> {
  const pack = await tx.creditEntry.findUnique({ where: { id: packEntryId } });
  if (!pack || pack.kind !== "PACK") return { reverseLights: 0, reservedCents: 0 };
  await tx.$executeRaw`SELECT "id" FROM "User" WHERE "id" = ${pack.userId} FOR UPDATE`;
  const balanceRow = await tx.creditEntry.aggregate({ where: { userId: pack.userId }, _sum: { amount: true } });
  const spendable = balanceRow._sum.amount ?? 0;
  const remaining = await lotRemaining(tx, pack.id, pack.amount);
  const reverseLights = Math.min(Math.max(remaining, 0), Math.max(spendable, 0));
  if (reverseLights > 0) {
    const reversal = await tx.creditEntry.create({
      data: {
        userId: pack.userId,
        amount: -reverseLights,
        kind: "REVERSAL",
        packSlug: pack.packSlug,
        idempotencyKey: `clawback:${pack.id}:${generation}`,
      },
    });
    await tx.creditAllocation.create({
      data: { packEntryId: pack.id, reversalEntryId: reversal.id, lights: reverseLights },
    });
  }

  const uses = await tx.creditAllocation.findMany({
    where: { packEntryId: pack.id, spendEntryId: { not: null } },
  });
  const lightsBySpend = new Map<string, number>();
  for (const use of uses) {
    if (!use.spendEntryId) continue;
    lightsBySpend.set(use.spendEntryId, (lightsBySpend.get(use.spendEntryId) ?? 0) + use.lights);
  }
  let reservedCents = 0;
  for (const [spendEntryId, lights] of lightsBySpend) {
    const spend = await tx.creditEntry.findUnique({ where: { id: spendEntryId } });
    if (!spend?.ledgerTransactionId) continue;
    const transaction = await tx.ledgerTransaction.findUnique({
      where: { id: spend.ledgerTransactionId },
      include: { allocations: true },
    });
    if (!transaction || transaction.grossCents <= 0) continue;
    const target = attributeRecordedNet(transaction.netCents, lights, transaction.grossCents);
    const shares = distributeExact(
      target,
      transaction.allocations.map((allocation) => allocation.netCents),
    );
    for (let index = 0; index < transaction.allocations.length; index += 1) {
      const amount = shares[index] ?? 0;
      if (amount <= 0) continue;
      const allocation = transaction.allocations[index]!;
      await tx.payoutReservation.upsert({
        where: { idempotencyKey: `reserve:${pack.id}:${transaction.id}:${allocation.creatorId}:${generation}` },
        update: {},
        create: {
          creatorId: allocation.creatorId,
          transactionId: transaction.id,
          packEntryId: pack.id,
          amountCents: amount,
          generation,
          status: "ACTIVE",
          idempotencyKey: `reserve:${pack.id}:${transaction.id}:${allocation.creatorId}:${generation}`,
        },
      });
      reservedCents += amount;
      await tx.moneyEvent.create({
        data: {
          transactionId: transaction.id,
          kind: "PAYOUT_RESERVED",
          grossCents: amount,
          feeCents: 0,
          netCents: amount,
          note: `pack:${pack.id}:gen:${generation}`,
        },
      });
    }
  }
  return { reverseLights, reservedCents };
}

export async function restorePack(
  tx: Prisma.TransactionClient,
  packEntryId: string,
  generation: number,
): Promise<{ restoredLights: number }> {
  const pack = await tx.creditEntry.findUnique({ where: { id: packEntryId } });
  if (!pack) return { restoredLights: 0 };
  const reversalKey = `clawback:${pack.id}:${generation}`;
  const reversal = await tx.creditEntry.findUnique({ where: { idempotencyKey: reversalKey } });
  const restoredLights = reversal ? Math.abs(reversal.amount) : 0;
  if (restoredLights > 0) {
    await tx.creditRelease.upsert({
      where: { idempotencyKey: `release:${pack.id}:${generation}` },
      update: {},
      create: { packEntryId: pack.id, lights: restoredLights, idempotencyKey: `release:${pack.id}:${generation}` },
    });
    await tx.creditEntry.upsert({
      where: { idempotencyKey: `restore:${pack.id}:${generation}` },
      update: {},
      create: {
        userId: pack.userId,
        amount: restoredLights,
        kind: "RESTORE",
        packSlug: pack.packSlug,
        idempotencyKey: `restore:${pack.id}:${generation}`,
      },
    });
  }
  await tx.payoutReservation.updateMany({
    where: { packEntryId: pack.id, generation, status: "ACTIVE" },
    data: { status: "RELEASED" },
  });
  return { restoredLights };
}
