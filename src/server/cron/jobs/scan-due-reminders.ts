/**
 * v0.27: Plazoåˆ°æœŸRecordatoriosæ‰«æ
 * v0.38: å¢žåŠ å¼€åº­Recordatoriosï¼ˆHearing è¡¨ï¼‰
 *
 * æ¯dÃ­as 09:00 è·‘ä¸€æ¬¡ï¼ˆAsia/Shanghaiï¼‰ï¼Œè¦†ç›– Deadline / Hearingï¼š
 * - Deadlineï¼šå‘½ä¸­ dueAt è½åœ¨ T-3 / T-1 / T / T+1 çš„æœªå®ŒæˆÃ­temså„å‘ä¸€æ¡Notificaciones
 * - Hearingï¼šå‘½ä¸­ startsAt è½åœ¨ T-3 / T-1 / Tï¼ˆå¼€åº­è¿‡åŽ»ä¸Recordatoriosï¼Œä¸å« T+1ï¼‰ï¼Œæ–‡æ¡ˆå¸¦å…·ä½“å¼€åº­æ—¶é—´
 * - æŽ¥æ”¶äººï¼šDeadline/Hearing â†’ procedure.matter.ownerId
 * - åŽ»é‡ï¼šrefType="DueReminder:Deadline:-3" etc. + refId å®žä½“ ID + å½“æ—¥å·²å‘ä¸å†å‘
 *
 * ä¸šåŠ¡Motivoï¼šv0.26 ä¹‹å‰æ²¡æœ‰"æ‰«åˆ°æœŸå‘Recordatorios"æœºåˆ¶ï¼Œå¯¼è‡´Abogadoè®¾çš„ç­”è¾©æœŸã€ä¸¾è¯æœŸetc.åˆ°ç‚¹ä¸å“ï¼›
 * v0.38 ç”¨æˆ·è¦æ±‚ï¼šå‡¡æœ‰å…·ä½“å¼€åº­æ—¶é—´ï¼Œå¼€åº­å‰ä¸»åŠ¨Recordatoriosï¼ˆæå‰3dÃ­as/1dÃ­as/å½“dÃ­asæ—©ä¸Šï¼‰ã€‚
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { sendWebhookText } from "@/server/settings/webhook";
import { audit } from "@/server/audit";
import { matterHref } from "@/lib/matters/route";
import { PROPERTY_TYPE_CN } from "@/lib/preservation-defaults";

const OFFSETS = [-3, -1, 0, 1] as const;
type Offset = (typeof OFFSETS)[number];

export type DueReminderScanResult = {
  deadlineScanned: number;
  deadlineNotified: number;
  hearingScanned: number;
  hearingNotified: number;
  /** v1.2: PreservaciÃ³nç»­å°Recordatorios */
  preservationScanned: number;
  preservationNotified: number;
  /** v1.2: è¿‡æœŸæœªç»­å°ã€è‡ªåŠ¨ç½®ä¸º EXPIRED çš„æ¡ç›®æ•° */
  preservationExpired: number;
  suppressed: number;
};

function startOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function offsetKey(offset: Offset) {
  return `DueReminder:${offset >= 0 ? "+" : ""}${offset}`;
}

function priorityFor(offset: Offset) {
  if (offset >= 1) return "URGENT";
  if (offset === 0) return "HIGH";
  if (offset === -1) return "HIGH";
  return "NORMAL";
}

function stateText(offset: Offset) {
  if (offset > 0) return `Vencido ${offset} dÃ­as`;
  if (offset === 0) return "Hoyåˆ°æœŸ";
  return `è¿˜æœ‰ ${-offset} dÃ­asåˆ°æœŸ`;
}

// å¼€åº­ä¸“ç”¨ï¼šå¸¦"Hoy/MaÃ±ana/XdÃ­asåŽ"å‰ç¼€ + å…·ä½“æ—¶åˆ†ï¼ˆå¼€åº­ç²¾ç¡®åˆ°æ—¶åˆ†ï¼ŒåŒºåˆ«äºŽåªåˆ°dÃ­asçš„Plazoï¼‰
function hearingWhenText(offset: Offset, startsAt: Date) {
  const hh = String(startsAt.getHours()).padStart(2, "0");
  const mm = String(startsAt.getMinutes()).padStart(2, "0");
  const day = offset === 0 ? "Hoy" : offset === -1 ? "MaÃ±ana" : `${-offset} dÃ­asåŽ`;
  return `${day} ${hh}:${mm} å¼€åº­`;
}

export async function scanDueReminders(): Promise<DueReminderScanResult> {
  const now = new Date();
  const todayStart = startOfLocalDay(now);

  let deadlineScanned = 0;
  let deadlineNotified = 0;
  let hearingScanned = 0;
  let hearingNotified = 0;
  let preservationScanned = 0;
  let preservationNotified = 0;
  let preservationExpired = 0;
  let suppressed = 0;
  // v0.50: æ±‡Totalæœ¬æ¬¡æ–°Recordatoriosï¼Œæ‰«æç»“æŸåŽä¸€æ¬¡æ€§æŽ¨ webhookï¼ˆé¿å…é€æ¡åˆ·ç¾¤ï¼‰
  const digestLines: string[] = [];

  for (const offset of OFFSETS) {
    const target = new Date(now);
    target.setDate(target.getDate() + offset);
    const dayStart = startOfLocalDay(target);
    const dayEnd = endOfLocalDay(target);

    // Deadline æ‰«æï¼ˆç¨‹åºå†…æ³•å®šPlazoï¼šç­”è¾©æœŸã€ä¸¾è¯æœŸetc.ï¼‰
    const deadlines = await prisma.deadline.findMany({
      where: {
        completed: false,
        dueAt: { gte: dayStart, lte: dayEnd }
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        procedure: {
          select: {
            id: true,
            matter: {
              select: { id: true, title: true, internalCode: true, ownerId: true }
            }
          }
        }
      }
    });
    deadlineScanned += deadlines.length;

    const refTypeDL = `${offsetKey(offset)}:Deadline`;
    for (const d of deadlines) {
      const userId = d.procedure.matter.ownerId;
      if (!userId) continue;

      const dup = await prisma.notification.findFirst({
        where: { refType: refTypeDL, refId: d.id, createdAt: { gte: todayStart } },
        select: { id: true }
      });
      if (dup) {
        suppressed++;
        continue;
      }

      await createNotification({
        userId,
        type: "DEADLINE_REMINDER",
        priority: priorityFor(offset),
        title: `${stateText(offset)}ï¼š${d.title}`,
        content: `Caso ${d.procedure.matter.internalCode}Â·${d.procedure.matter.title}`,
        href: matterHref(d.procedure.matter),
        refType: refTypeDL,
        refId: d.id
      });
      deadlineNotified++;
      digestLines.push(
        `Â· ${stateText(offset)}ï¼š${d.title}ï¼ˆ${d.procedure.matter.internalCode}ï¼‰`
      );
    }

    // Hearing æ‰«æï¼ˆå¼€åº­Recordatoriosï¼‰â€”â€” å¼€åº­è¿‡åŽ»ä¸å†Recordatoriosï¼Œè·³è¿‡ T+1 è¿™æ¡£
    if (offset <= 0) {
      const hearings = await prisma.hearing.findMany({
        where: {
          startsAt: { gte: dayStart, lte: dayEnd }
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          room: true,
          judge: true,
          procedure: {
            select: {
              matter: {
                select: { id: true, title: true, internalCode: true, ownerId: true }
              }
            }
          }
        }
      });
      hearingScanned += hearings.length;

      const refTypeHearing = `${offsetKey(offset)}:Hearing`;
      for (const h of hearings) {
        const userId = h.procedure.matter.ownerId;
        if (!userId) continue;

        const dup = await prisma.notification.findFirst({
          where: { refType: refTypeHearing, refId: h.id, createdAt: { gte: todayStart } },
          select: { id: true }
        });
        if (dup) {
          suppressed++;
          continue;
        }

        const place = [h.room && `${h.room}`, h.judge && `å®¡åˆ¤å‘˜ ${h.judge}`]
          .filter(Boolean)
          .join(" Â· ");
        await createNotification({
          userId,
          type: "HEARING_REMINDER",
          priority: priorityFor(offset),
          title: `${hearingWhenText(offset, h.startsAt)}ï¼š${h.title}`,
          content: `Caso ${h.procedure.matter.internalCode}Â·${h.procedure.matter.title}${place ? ` Â· ${place}` : ""}`,
          href: matterHref(h.procedure.matter),
          refType: refTypeHearing,
          refId: h.id
        });
        hearingNotified++;
        digestLines.push(
          `Â· ${hearingWhenText(offset, h.startsAt)}ï¼š${h.title}ï¼ˆ${h.procedure.matter.internalCode}ï¼‰`
        );
      }
    }
  }

  // â”€â”€ v1.2: PreservaciÃ³nç»­å°Recordatorios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // ä¸èµ°ä¸Šé¢çš„ OFFSETSï¼Œä¹Ÿä¸åœ¨ Deadline è¡¨é‡Œå»ºé•œåƒè¡Œï¼ŒMotivoæœ‰äºŒï¼š
  // 1. æå‰é‡ä¸åŒã€‚OFFSETS æ˜¯ -3/-1/0/+1ï¼Œå¯¹ç­”è¾©ã€ä¸¾è¯å¤Ÿç”¨ï¼›ç»­å°è¦å¤‡ææ–™ã€
  //    è·‘æ³•é™¢ã€etc.è£å®šï¼Œæå‰ 3 dÃ­asNotificacionesetc.äºŽæ²¡Notificacionesã€‚å„PreservaciÃ³nCasoè‡ªå¸¦
  //    remindDaysï¼ˆé»˜è®¤ 30/15/7/3/1ï¼‰ï¼Œæ­¤å‰åªå†™ä¸è¯»ï¼Œæ˜¯æ­»é…ç½®ï¼Œè¿™é‡Œè®©å®ƒç”Ÿæ•ˆã€‚
  // 2. å»ºé•œåƒ Deadline è¡Œè¦å¤šä¸€ä¸ªå…³è”å­—æ®µå’Œä¸€å¥—åŒæ­¥é€»è¾‘ï¼ŒexpiryDate ä¸€æ”¹
  //    ä¸¤å¤„å°±å¯èƒ½ä¸ä¸€è‡´ï¼›ç›´æŽ¥æ‰«æºè¡¨æ²¡æœ‰è¿™ä¸ªé—®é¢˜ã€‚
  //
  // åŽæžœçš„ä¸¥é‡æ€§å†³å®šäº†è¿™æ¡ä¸èƒ½çœï¼šã€Šæœ€é«˜äººæ°‘æ³•é™¢å…³äºŽäººæ°‘æ³•é™¢æ°‘äº‹æ‰§è¡Œä¸­
  // æŸ¥å°ã€æ‰£æŠ¼ã€å†»ç»“è´¢äº§çš„è§„å®šã€‹ï¼ˆ2020 ä¿®æ­£ï¼‰ç¬¬äºŒåä¸ƒæ¡â€”â€”Plazoå±Šæ»¡æœªåŠžç†
  // å»¶æœŸæ‰‹ç»­çš„ï¼ŒæŸ¥å°ã€æ‰£æŠ¼ã€å†»ç»“çš„æ•ˆåŠ›æ¶ˆç­ã€‚
  const activeProperties = await prisma.preservationProperty.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] } },
    select: {
      id: true,
      propertyType: true,
      propertyDetail: true,
      expiryDate: true,
      target: {
        select: {
          name: true,
          case: {
            select: {
              id: true,
              remindDays: true,
              ownerId: true,
              matter: {
                select: { id: true, title: true, internalCode: true, ownerId: true }
              }
            }
          }
        }
      }
    }
  });

  for (const prop of activeProperties) {
    const cs = prop.target.case;
    const daysUntil = Math.round(
      (startOfLocalDay(prop.expiryDate).getTime() - todayStart.getTime()) / 86_400_000
    );

    // åˆ°æœŸå½“dÃ­asyVencidoé¦–æ—¥ä¸€å¾‹Recordatoriosï¼ˆæ­¤æ—¶æ•ˆåŠ›å¯èƒ½å·²æ¶ˆç­ï¼‰ï¼Œæ­¤å¤–æŒ‰æœ¬æ¡ˆ remindDays
    const isCritical = daysUntil === 0 || daysUntil === -1;
    if (!isCritical && !cs.remindDays.includes(daysUntil)) continue;

    preservationScanned++;

    const userId = cs.ownerId ?? cs.matter?.ownerId;
    if (!userId) continue;

    const refType = `PreservationExpiry:${daysUntil}`;
    const dup = await prisma.notification.findFirst({
      where: { refType, refId: prop.id, createdAt: { gte: todayStart } },
      select: { id: true }
    });
    if (dup) {
      suppressed++;
      continue;
    }

    const whenText =
      daysUntil === 0
        ? "Hoyåˆ°æœŸ"
        : daysUntil < 0
          ? `å·²Vencido ${-daysUntil} dÃ­asï¼ŒPreservaciÃ³næ•ˆåŠ›å¯èƒ½å·²æ¶ˆç­`
          : `è¿˜æœ‰ ${daysUntil} dÃ­asåˆ°æœŸ`;
    const propertyLabel = prop.propertyDetail?.trim() || PROPERTY_TYPE_CN[prop.propertyType];
    const matterText = cs.matter
      ? `Caso ${cs.matter.internalCode}Â·${cs.matter.title}`
      : "æœªå…³è”Caso";

    await createNotification({
      userId,
      type: "DEADLINE_REMINDER",
      priority: daysUntil <= 3 ? "URGENT" : daysUntil <= 15 ? "HIGH" : "NORMAL",
      title: `PreservaciÃ³n${whenText}ï¼š${prop.target.name} Â· ${propertyLabel}`,
      content: `${matterText}ã€‚VencidoæœªåŠžç»­å°æ‰‹ç»­çš„ï¼ŒæŸ¥å°ã€æ‰£æŠ¼ã€å†»ç»“çš„æ•ˆåŠ›æ¶ˆç­ï¼ˆæŸ¥æ‰£å†»è§„å®šç¬¬äºŒåä¸ƒæ¡ï¼‰ã€‚`,
      href: cs.matter ? matterHref(cs.matter) : "/preservation",
      refType,
      refId: prop.id
    });
    preservationNotified++;
    digestLines.push(
      `Â· PreservaciÃ³n${whenText}ï¼š${prop.target.name}Â·${propertyLabel}ï¼ˆ${cs.matter?.internalCode ?? "æœªå…³è”Caso"}ï¼‰`
    );
  }

  // â”€â”€ v1.2: è¿‡æœŸæœªç»­å°çš„PreservaciÃ³nè‡ªåŠ¨ç½®ä¸º EXPIRED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // ä¾æ®æŸ¥æ‰£å†»è§„å®šç¬¬äºŒåä¸ƒæ¡ï¼ŒPlazoå±Šæ»¡æœªåŠžå»¶æœŸæ‰‹ç»­çš„ï¼Œæ•ˆåŠ›ã€Œæ¶ˆç­ã€â€”â€”
  // è¿™æ˜¯æ³•å¾‹ä¸Šè‡ªåŠ¨å‘ç”Ÿçš„äº‹å®žï¼Œä¸éœ€è¦ä»»ä½•äººåšåŠ¨ä½œã€‚å› æ­¤åº“é‡Œä»å†™ ACTIVE
  // ä¸æ˜¯ã€Œå¾…å¤„ç†Estadoã€ï¼Œè€Œæ˜¯é”™è¯¯æ•°æ®ï¼Œæ”¹æ­£å®ƒä¸etc.äºŽæ“…è‡ªå˜æ›´ä¸šåŠ¡æ•°æ®ã€‚
  //
  // ä¸¤ä¸ªæ–¹å‘çš„é”™è¯¯ä»£ä»·ä¸å¯¹ç§°ï¼Œæ®æ­¤é€‰æ‹©æœå®‰å…¨æ–¹å‘Errorï¼š
  //   æ˜¾ç¤ºç”Ÿæ•ˆä¸­ä½†å®žé™…å·²å¤±æ•ˆ â†’ Abogadoä¸è¡ŒåŠ¨ã€è´¢äº§è¢«è½¬ç§»ï¼Œä¸å¯é€†ï¼›
  //   æ˜¾ç¤ºå·²è¿‡æœŸä½†å®žé™…å·²ç»­å° â†’ Abogadoçœ‹åˆ°å‘Šè­¦åŽ»æ ¸å¯¹å¹¶Actualizarè®°å½•ï¼Œå¯è‡ªæˆ‘ä¿®æ­£ã€‚
  //
  // ä½†ä¸é™é»˜ç¿»è½¬ï¼šæ¯æ¡éƒ½å‘Notificacioneså¹¶å•ç‹¬è®°å®¡è®¡ï¼Œç¿»è½¬å¯è§ã€å¯çº æ­£ã€‚
  // åˆ°æœŸå½“æ—¥ä»åœ¨Plazoå†…ï¼Œæ•…åªå¤„ç† expiryDate æ—©äºŽHoyé›¶ç‚¹çš„æ¡ç›®ã€‚
  const lapsed = await prisma.preservationProperty.findMany({
    where: {
      status: { in: ["ACTIVE", "RENEWED"] },
      expiryDate: { lt: todayStart }
    },
    select: {
      id: true,
      propertyType: true,
      propertyDetail: true,
      expiryDate: true,
      target: {
        select: {
          name: true,
          case: {
            select: {
              ownerId: true,
              matter: { select: { id: true, title: true, internalCode: true, ownerId: true } }
            }
          }
        }
      }
    }
  });

  for (const prop of lapsed) {
    const cs = prop.target.case;
    const daysOverdue = Math.round(
      (todayStart.getTime() - startOfLocalDay(prop.expiryDate).getTime()) / 86_400_000
    );

    await prisma.preservationProperty.update({
      where: { id: prop.id },
      data: { status: "EXPIRED" }
    });
    preservationExpired++;

    await audit({
      userId: null,
      action: "PRESERVATION_STATUS_AUTO_EXPIRED",
      targetType: "PreservationProperty",
      targetId: prop.id,
      detail: {
        expiryDate: prop.expiryDate.toISOString(),
        daysOverdue,
        matterId: cs.matter?.id ?? null
      }
    });

    const userId = cs.ownerId ?? cs.matter?.ownerId;
    if (!userId) continue;

    const propertyLabel = prop.propertyDetail?.trim() || PROPERTY_TYPE_CN[prop.propertyType];
    await createNotification({
      userId,
      type: "DEADLINE_REMINDER",
      priority: "URGENT",
      title: `PreservaciÃ³nå·²è¿‡æœŸæœªç»­å°ï¼š${prop.target.name} Â· ${propertyLabel}`,
      content:
        `Fecha de vencimiento ${prop.expiryDate.toLocaleDateString("zh-CN")}ï¼Œå·²è¿‡ ${daysOverdue} dÃ­asã€‚` +
        `æœªåŠžç†ç»­å°æ‰‹ç»­çš„ï¼ŒæŸ¥å°ã€æ‰£æŠ¼ã€å†»ç»“çš„æ•ˆåŠ›æ¶ˆç­ï¼ˆæŸ¥æ‰£å†»è§„å®šç¬¬äºŒåä¸ƒæ¡ï¼‰ï¼Œ` +
        `Sistemaå·²å°†è¯¥æ¡PreservaciÃ³næ ‡è®°ä¸ºã€Œå·²åˆ°æœŸã€ã€‚è‹¥å®žé™…å·²åŠžç†ç»­å°ï¼Œè¯·åœ¨Sistemaä¸­Actualizarè®°å½•ã€‚`,
      href: cs.matter ? matterHref(cs.matter) : "/preservation",
      refType: "PreservationExpired",
      refId: prop.id
    });
    digestLines.push(
      `Â· PreservaciÃ³nå·²è¿‡æœŸæœªç»­å°ï¼š${prop.target.name}Â·${propertyLabel}ï¼ˆVencido ${daysOverdue} dÃ­asï¼‰`
    );
  }

  // v0.50: ä¼å¾®/é’‰é’‰ webhook æ‘˜è¦ï¼ˆæœªé…ç½®æ—¶é™é»˜è·³è¿‡ï¼›Errorå†™ audit ä¸ä¸­æ–­ï¼‰
  let webhookResult: { ok: boolean; skipped?: boolean; error?: string } | null = null;
  if (digestLines.length > 0) {
    const MAX_LINES = 20;
    const shown = digestLines.slice(0, MAX_LINES);
    const more = digestLines.length - shown.length;
    webhookResult = await sendWebhookText(
      [
        `LawLink ä»Šæ—¥Recordatoriosï¼ˆ${digestLines.length} æ¡ï¼‰`,
        ...shown,
        ...(more > 0 ? [`â€¦ å¦æœ‰ ${more} æ¡ï¼Œè¯¦è§SistemaNotificaciones`] : [])
      ].join("\n")
    );
  }

  await audit({
    userId: null,
    action: "DUE_REMINDER_SCAN_CRON",
    targetType: "Report",
    targetId: "due-reminder",
    detail: {
      deadlineScanned,
      deadlineNotified,
      hearingScanned,
      hearingNotified,
      preservationScanned,
      preservationNotified,
      preservationExpired,
      suppressed,
      offsets: OFFSETS,
      webhook: webhookResult
    }
  });

  return {
    deadlineScanned,
    deadlineNotified,
    hearingScanned,
    hearingNotified,
    preservationScanned,
    preservationNotified,
    preservationExpired,
    suppressed
  };
}

// æ‰‹åŠ¨è§¦å‘å…¥å£å·²ç§»è‡³ @/server/reminders/actionsï¼ˆé¡¶å±‚ "use server"ï¼Œå¯è¢«Clienteç«¯ç»„ä»¶ importï¼‰


