// v0.30 管辖地数据 + 争议解决机构匹配
// 数据来自 china-division（全国省/市/区县），法院/仲裁机构名称按命名规则生成。
import pca from "china-division/dist/pca.json";

type Pca = Record<string, Record<string, string[]>>;
const DATA = pca as Pca;

export const NATIONAL_AGENCY_OPTIONS = ["最高人民法院"] as const;

export const provinces: string[] = Object.keys(DATA);

export function citiesOf(province: string): string[] {
  return province && DATA[province] ? Object.keys(DATA[province]) : [];
}

export function areasOf(province: string, city: string): string[] {
  return province && city && DATA[province]?.[city] ? DATA[province][city] : [];
}

/** 管辖地序列化：省/市/区县（区县可缺）。空串表示未选。 */
export function joinJurisdiction(province?: string, city?: string, area?: string): string {
  return [province, city, area].filter(Boolean).join("/");
}

export function parseJurisdiction(value?: string | null): {
  province: string;
  city: string;
  area: string;
} {
  const [province = "", city = "", area = ""] = (value ?? "").split("/");
  return { province, city, area };
}

export function isNationalAgency(value?: string | null): boolean {
  const agency = value?.trim();
  return NATIONAL_AGENCY_OPTIONS.some((item) => item === agency);
}

export function normalizeJurisdictionForAgency(
  agency?: string | null,
  jurisdiction?: string | null
): string | null {
  if (isNationalAgency(agency)) return null;
  return jurisdiction?.trim() || null;
}

// 直辖市 / 地级市占位项「市辖区」「县」不作为机构名，回退到省级名称
function effectiveCityName(province: string, city: string): string {
  if (!city || city === "市辖区" || city === "县") return province;
  return city;
}

// 仲裁委员会一般用城市名去掉「市」后缀：广州市 → 广州仲裁委员会
function arbitrationCityName(cityName: string): string {
  return cityName.replace(/(市|地区|自治州|盟)$/, "");
}

/**
 * 根据管辖地生成可选「争议解决机构」：
 * - 未选管辖地：全国级机构
 * - 选到区县：本区县基层法院 + 本市中院 + 本省高院 + 本市仲裁委
 * - 只选到市：本市中院 + 本市各区县基层法院 + 本省高院 + 本市仲裁委
 * 返回去重后的字符串列表。
 */
export function agencyOptions(value?: string | null): string[] {
  const { province, city, area } = parseJurisdiction(value);
  if (!province) return [...NATIONAL_AGENCY_OPTIONS];
  const cityName = effectiveCityName(province, city);
  const out: string[] = [];

  if (area) {
    out.push(`${area}人民法院`);
    out.push(`${cityName}中级人民法院`);
  } else if (city) {
    out.push(`${cityName}中级人民法院`);
    for (const a of areasOf(province, city)) out.push(`${a}人民法院`);
  }
  out.push(`${province}高级人民法院`);
  out.push(...NATIONAL_AGENCY_OPTIONS);
  out.push(`${arbitrationCityName(cityName)}仲裁委员会`);

  // 去重保序
  return Array.from(new Set(out.filter(Boolean)));
}
