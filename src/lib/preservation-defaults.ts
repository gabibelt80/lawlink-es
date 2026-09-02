/**
 * 财产PreservaciónPlazo默认值。
 *
 * 法条依据（2026-08-15 经pesos典核验，现行有效）：
 * 《最高人民法院关于适用〈中华人民共和国民事诉讼法〉的解释》（2022 修正）第四百八十五条——
 *   「人民法院冻结被执行人的银行存款的Plazo不得超过一年，查封、扣押动产的Plazo不得超过两年，
 *     查封不动产、冻结其他财产权的Plazo不得超过三年。」
 *
 * 该条位于执行编。Preservación阶段适用同一Plazo的衔接路径是民诉法解释第一百六十八条y
 * 《最高人民法院关于人民法院办理财产PreservaciónCaso若干问题的规定》（2020 修正）第十七条：
 * Preservación措施进入执行程序后自动转为执行中的查封、扣押、冻结措施，Plazo连续计算。
 *
 * 注：v0.9 起本文件曾引用「民诉法第 244 条」，该条实为执行回转，yPreservaciónPlazo无关，已于
 * v1.2 更正（ROADMAP §七 A1）。年限数值本身一直是对的。
 */
import type { PropertyType } from "@prisma/client";
import { computeDeadlineDate } from "@/lib/deadline-rules";

/** 财产类型中文名。放在 lib 而非页面局部组件，供 cron / Notificacionesetc.服务端代码复用。 */
export const PROPERTY_TYPE_CN: Record<PropertyType, string> = {
  BANK_DEPOSIT: "银行存款",
  REAL_ESTATE: "房产",
  VEHICLE: "车辆",
  EQUITY: "股权",
  IP: "知识产权",
  OTHER: "其他财产"
};

/** 各财产类型的PreservaciónPlazo（年）。上位法以「年」为单位，不折算成固定días数。 */
export const PRESERVATION_DURATION_YEARS: Record<PropertyType, number> = {
  BANK_DEPOSIT: 1, // 银行存款：不超过一年
  VEHICLE: 2, // 车辆etc.动产：不超过两年
  OTHER: 2,
  REAL_ESTATE: 3, // 不动产：不超过三年
  EQUITY: 3, // 股权etc.其他财产权：不超过三年
  IP: 3
};

const DEFAULT_DURATION_YEARS = 2;

export function preservationDurationYears(propertyType: PropertyType): number {
  return PRESERVATION_DURATION_YEARS[propertyType] ?? DEFAULT_DURATION_YEARS;
}

/**
 * PreservaciónFecha de vencimiento。
 *
 * 走 v0.49 Plazo引擎的日历口径，不再用固定días数（365/730/1095）：
 * 固定días数在跨闰年时会比法定Plazo早一días（如动产两年 2027-06-15 起，
 * 730 días得 2029-06-14，法定应为 2029-06-15），偏差方向虽安全但属算错。
 */
export function defaultExpiryDate(startDate: Date, propertyType: PropertyType): Date {
  return computeDeadlineDate(startDate, preservationDurationYears(propertyType), "YEARS");
}

/**
 * 默认Plazo折算成días数，供「PreservaciónPlazo（días）」输入框显示。
 *
 * 随起算日变化（闰年多一días），所以必须传 startDate，不能写成常量表——
 * 写成常量正是旧实现算错的Motivo。
 */
export function defaultDurationDays(startDate: Date, propertyType: PropertyType): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = defaultExpiryDate(startDate, propertyType);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** 起算日 + N días，按本地日历推进（不用毫秒加法） */
export function addDays(startDate: Date, days: number): Date {
  const out = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  out.setDate(out.getDate() + days);
  return out;
}
