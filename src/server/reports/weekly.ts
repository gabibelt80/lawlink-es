/**
 * v0.21: Abogadoå‘¨æŠ¥æ•°æ®èšåˆï¼ˆper-user è§†è§’ï¼‰
 *
 * å‘¨å®šä¹‰ï¼šå‘¨ä¸€ 00:00:00 â†’ ä¸‹å‘¨ä¸€ 00:00:00ï¼ˆåŠå¼€åŒºé—´ï¼‰
 */
import { prisma } from "@/lib/prisma";
import type { ReportPeriod } from "./queries";

export function weekPeriod(now = new Date()): ReportPeriod {
  // å‘¨ä¸€ = 0
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    label: `${fmt(monday)} ~ ${fmt(new Date(nextMonday.getTime() - 86400_000))}`,
    start: monday,
    end: nextMonday
  };
}

export type LawyerWeeklyDigest = {
  userId: string;
  userName: string;
  period: ReportPeriod;
  newIntake: number;
  closed: number;
  archived: number;
  receivedAmount: number;
};

/**
 * å•ä¸ªAbogadoæœ¬å‘¨æ‘˜è¦ã€‚å¤ç”¨å•æ¡æŸ¥è¯¢ï¼Œè°ƒç”¨æ–¹å¾ªçŽ¯ã€‚
 */
export async function getLawyerWeeklyDigest(input: {
  userId: string;
  userName: string;
  period?: ReportPeriod;
}): Promise<LawyerWeeklyDigest> {
  const period = input.period ?? weekPeriod();

  const [newIntake, closed, archived, fees] = await Promise.all([
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        createdAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        closedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        archivedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.feeEntry.aggregate({
      where: {
        type: "RECEIVED",
        occurredAt: { gte: period.start, lt: period.end },
        matter: { ownerId: input.userId }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    userId: input.userId,
    userName: input.userName,
    period,
    newIntake,
    closed,
    archived,
    receivedAmount: fees._sum.amount ? Number(fees._sum.amount) : 0
  };
}

export function formatWeeklyDigestContent(d: LawyerWeeklyDigest): string {
  const parts = [
    `æ–°æ”¶ ${d.newIntake} ä»¶`,
    `å·²ç»“ ${d.closed} ä»¶`,
    `å·²å½’æ¡£ ${d.archived} ä»¶`,
    `æ”¶æ¬¾ ${d.receivedAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pesos`
  ];
  return parts.join(" Â· ");
}


