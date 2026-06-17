import { describe, expect, it } from "vitest";
import {
  agencyOptions,
  isNationalAgency,
  normalizeJurisdictionForAgency
} from "@/lib/china-regions";

describe("agencyOptions", () => {
  it("未选管辖地时仍提供最高人民法院", () => {
    expect(agencyOptions()).toEqual(["最高人民法院"]);
  });

  it("选到区县时包含最高人民法院且保留地方机构", () => {
    const options = agencyOptions("浙江省/杭州市/西湖区");

    expect(options).toContain("西湖区人民法院");
    expect(options).toContain("杭州市中级人民法院");
    expect(options).toContain("浙江省高级人民法院");
    expect(options).toContain("最高人民法院");
    expect(options).toContain("杭州仲裁委员会");
  });
});

describe("national agency helpers", () => {
  it("识别最高人民法院", () => {
    expect(isNationalAgency("最高人民法院")).toBe(true);
    expect(isNationalAgency(" 最高人民法院 ")).toBe(true);
    expect(isNationalAgency("浙江省高级人民法院")).toBe(false);
  });

  it("最高人民法院不保留地方管辖地", () => {
    expect(normalizeJurisdictionForAgency("最高人民法院", "浙江省/杭州市/西湖区")).toBeNull();
    expect(normalizeJurisdictionForAgency("浙江省高级人民法院", "浙江省/杭州市")).toBe("浙江省/杭州市");
  });
});
