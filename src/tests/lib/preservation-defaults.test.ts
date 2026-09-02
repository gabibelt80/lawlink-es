import { describe, expect, it } from "vitest";
import {
  addDays,
  defaultDurationDays,
  defaultExpiryDate,
  preservationDurationYears,
  PRESERVATION_DURATION_YEARS
} from "@/lib/preservation-defaults";

const d = (s: string) => new Date(`${s}T00:00:00`);
const f = (x: Date) =>
  `${x.getFullYear()}-${`${x.getMonth() + 1}`.padStart(2, "0")}-${`${x.getDate()}`.padStart(2, "0")}`;

describe("PreservaciónPlazo年限（民诉法解释第 485 条）", () => {
  it("银行存款一年、动产两年、不动产y其他财产权三年", () => {
    expect(PRESERVATION_DURATION_YEARS.BANK_DEPOSIT).toBe(1);
    expect(PRESERVATION_DURATION_YEARS.VEHICLE).toBe(2);
    expect(PRESERVATION_DURATION_YEARS.OTHER).toBe(2);
    expect(PRESERVATION_DURATION_YEARS.REAL_ESTATE).toBe(3);
    expect(PRESERVATION_DURATION_YEARS.EQUITY).toBe(3);
    expect(PRESERVATION_DURATION_YEARS.IP).toBe(3);
  });

  it("Tipo desconocido回退两年", () => {
    expect(preservationDurationYears("VEHICLE")).toBe(2);
  });
});

describe("defaultExpiryDate 按日历年推进", () => {
  it("跨闰年不再少算一días（旧实现 730 días会得到 06-14）", () => {
    expect(f(defaultExpiryDate(d("2027-06-15"), "VEHICLE"))).toBe("2029-06-15");
  });

  it("不动产三年跨闰年（旧实现 1095 días会得到 05-19）", () => {
    expect(f(defaultExpiryDate(d("2026-05-20"), "REAL_ESTATE"))).toBe("2029-05-20");
  });

  it("平年区间y日历年一致", () => {
    expect(f(defaultExpiryDate(d("2029-03-01"), "BANK_DEPOSIT"))).toBe("2030-03-01");
  });

  it("2 月 29 日起算，到期年无对应日时取当月最后一日", () => {
    expect(f(defaultExpiryDate(d("2028-02-29"), "BANK_DEPOSIT"))).toBe("2029-02-28");
  });
});

describe("defaultDurationDays yFecha de vencimiento同源", () => {
  it("días数恰好etc.于起算日到Fecha de vencimiento的间隔", () => {
    for (const start of ["2027-06-15", "2026-05-20", "2029-03-01", "2028-02-29"]) {
      for (const t of ["BANK_DEPOSIT", "VEHICLE", "REAL_ESTATE"] as const) {
        const days = defaultDurationDays(d(start), t);
        expect(f(addDays(d(start), days))).toBe(f(defaultExpiryDate(d(start), t)));
      }
    }
  });

  it("闰年区间比平年多一días", () => {
    expect(defaultDurationDays(d("2027-06-15"), "VEHICLE")).toBe(731); // 含 2028-02-29
    expect(defaultDurationDays(d("2029-06-15"), "VEHICLE")).toBe(730);
  });
});
