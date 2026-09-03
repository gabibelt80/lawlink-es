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

describe("PreservaciÃ³nPlazoå¹´é™ï¼ˆæ°‘è¯‰æ³•è§£é‡Šç¬¬ 485 æ¡ï¼‰", () => {
  it("é“¶è¡Œå­˜æ¬¾ä¸€å¹´ã€åŠ¨äº§ä¸¤å¹´ã€ä¸åŠ¨äº§yå…¶ä»–è´¢äº§æƒä¸‰å¹´", () => {
    expect(PRESERVATION_DURATION_YEARS.BANK_DEPOSIT).toBe(1);
    expect(PRESERVATION_DURATION_YEARS.VEHICLE).toBe(2);
    expect(PRESERVATION_DURATION_YEARS.OTHER).toBe(2);
    expect(PRESERVATION_DURATION_YEARS.REAL_ESTATE).toBe(3);
    expect(PRESERVATION_DURATION_YEARS.EQUITY).toBe(3);
    expect(PRESERVATION_DURATION_YEARS.IP).toBe(3);
  });

  it("Tipo desconocidoå›žé€€ä¸¤å¹´", () => {
    expect(preservationDurationYears("VEHICLE")).toBe(2);
  });
});

describe("defaultExpiryDate æŒ‰æ—¥åŽ†å¹´æŽ¨è¿›", () => {
  it("è·¨é—°å¹´ä¸å†å°‘ç®—ä¸€dÃ­asï¼ˆæ—§å®žçŽ° 730 dÃ­asä¼šå¾—åˆ° 06-14ï¼‰", () => {
    expect(f(defaultExpiryDate(d("2027-06-15"), "VEHICLE"))).toBe("2029-06-15");
  });

  it("ä¸åŠ¨äº§ä¸‰å¹´è·¨é—°å¹´ï¼ˆæ—§å®žçŽ° 1095 dÃ­asä¼šå¾—åˆ° 05-19ï¼‰", () => {
    expect(f(defaultExpiryDate(d("2026-05-20"), "REAL_ESTATE"))).toBe("2029-05-20");
  });

  it("å¹³å¹´åŒºé—´yæ—¥åŽ†å¹´ä¸€è‡´", () => {
    expect(f(defaultExpiryDate(d("2029-03-01"), "BANK_DEPOSIT"))).toBe("2030-03-01");
  });

  it("2 æœˆ 29 æ—¥èµ·ç®—ï¼Œåˆ°æœŸå¹´æ— å¯¹åº”æ—¥æ—¶å–å½“æœˆæœ€åŽä¸€æ—¥", () => {
    expect(f(defaultExpiryDate(d("2028-02-29"), "BANK_DEPOSIT"))).toBe("2029-02-28");
  });
});

describe("defaultDurationDays yFecha de vencimientoåŒæº", () => {
  it("dÃ­asæ•°æ°å¥½etc.äºŽèµ·ç®—æ—¥åˆ°Fecha de vencimientoçš„é—´éš”", () => {
    for (const start of ["2027-06-15", "2026-05-20", "2029-03-01", "2028-02-29"]) {
      for (const t of ["BANK_DEPOSIT", "VEHICLE", "REAL_ESTATE"] as const) {
        const days = defaultDurationDays(d(start), t);
        expect(f(addDays(d(start), days))).toBe(f(defaultExpiryDate(d(start), t)));
      }
    }
  });

  it("é—°å¹´åŒºé—´æ¯”å¹³å¹´å¤šä¸€dÃ­as", () => {
    expect(defaultDurationDays(d("2027-06-15"), "VEHICLE")).toBe(731); // å« 2028-02-29
    expect(defaultDurationDays(d("2029-06-15"), "VEHICLE")).toBe(730);
  });
});

