/**
 * æŠŠ search params è§£æžæˆ ReportPeriodï¼Œè¢« page å’Œ export route å…±ç”¨ã€‚
 *
 * æŽ¥å—å‚æ•°ï¼š
 *   ?period=month|quarter|year|lastYear   é¢„è®¾
 *   ?period=custom&start=yyyy-MM-dd&end=yyyy-MM-dd   è‡ªå®šä¹‰
 *   ç¼ºçœ / éžæ³• â†’ year
 */
import { customPeriod, periodPresets, type ReportPeriod } from "./queries";

export type ResolvedPeriod = {
  period: ReportPeriod;
  /** ç”¨äºŽå›žå†™ URL */
  periodKey: "month" | "quarter" | "year" | "lastYear" | "custom";
  startStr?: string;
  endStr?: string;
  error?: string;
};

const VALID = ["month", "quarter", "year", "lastYear"] as const;

export function resolveReportPeriod(params: {
  period?: string;
  start?: string;
  end?: string;
}): ResolvedPeriod {
  const presets = periodPresets();

  if (params.period === "custom") {
    if (!params.start || !params.end) {
      return {
        period: presets.year,
        periodKey: "year",
        error: "ç¼ºå°‘ start / endï¼Œå·²å›žé€€æœ¬å¹´"
      };
    }
    try {
      return {
        period: customPeriod(params.start, params.end),
        periodKey: "custom",
        startStr: params.start,
        endStr: params.end
      };
    } catch (err) {
      return {
        period: presets.year,
        periodKey: "year",
        error: err instanceof Error ? err.message : "è‡ªå®šä¹‰æ—¶é—´é”™è¯¯ï¼Œå·²å›žé€€æœ¬å¹´"
      };
    }
  }

  if (params.period && (VALID as readonly string[]).includes(params.period)) {
    const key = params.period as (typeof VALID)[number];
    return { period: presets[key], periodKey: key };
  }

  return { period: presets.year, periodKey: "year" };
}


