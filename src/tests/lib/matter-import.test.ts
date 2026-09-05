import { describe, it, expect } from "vitest";
import {
  parseCategoryLabel,
  parseStatusLabel,
  parsePartyType,
  parseClientType,
  parseImportDate,
  parseAmount,
  buildMatterTitle,
  firstProcedureTypeFor,
  validateRow,
  type RawRow
} from "@/lib/imports/matter-import";

describe("æ‰¹é‡å¯¼å…¥ â€” æ–‡æœ¬æ˜ å°„", () => {
  it("Casoç±»åž‹åæŸ¥", () => {
    expect(parseCategoryLabel("æ°‘å•†è¯‰è®¼")).toBe("CIVIL_COMMERCIAL");
    expect(parseCategoryLabel("åŠ³åŠ¨ä»²è£")).toBe("LABOR_ARBITRATION");
    expect(parseCategoryLabel("ä¸å­˜åœ¨")).toBeNull();
  });

  it("CasoEstadoåæŸ¥ï¼ˆå…¼å®¹ã€ŒCerrar casoã€ï¼‰", () => {
    expect(parseStatusLabel("åŠžç†ä¸­")).toBe("IN_PROGRESS");
    expect(parseStatusLabel("å·²Cerrar caso")).toBe("CLOSED");
    expect(parseStatusLabel("Cerrar caso")).toBe("CLOSED");
    expect(parseStatusLabel("å·²å½’æ¡£")).toBe("ARCHIVED");
    expect(parseStatusLabel("ä¹±å¡«")).toBeNull();
  });

  it("ä¸ªäºº/ä¼ä¸š â†’ PartyType / ClientType", () => {
    expect(parsePartyType("ä¼ä¸š")).toBe("COMPANY");
    expect(parsePartyType("ä¸ªäºº")).toBe("NATURAL_PERSON");
    expect(parsePartyType("")).toBe("NATURAL_PERSON");
    expect(parseClientType("ä¼ä¸š")).toBe("COMPANY");
    expect(parseClientType(undefined)).toBe("INDIVIDUAL");
  });

  it("Fecha / Montoè§£æž", () => {
    expect(parseImportDate("2026-05-30")?.getFullYear()).toBe(2026);
    expect(parseImportDate("2026/5/3")?.getMonth()).toBe(4);
    expect(parseImportDate("æ— æ•ˆ")).toBeNull();
    expect(parseAmount("120,000")).toBe(120000);
    expect(parseAmount("$12ä¸‡")).toBeNull(); // ã€Œä¸‡ã€ä¸è§£æž
    expect(parseAmount("")).toBeNull();
  });

  it("æ ‡é¢˜ç”Ÿæˆæ— é‡å¤ç©ºæ ¼", () => {
    expect(buildMatterTitle("å¼ ä¸‰", "æŸå…¬å¸", "ä¹°å–åˆåŒçº çº·")).toBe("å¼ ä¸‰ y æŸå…¬å¸ ä¹°å–åˆåŒçº çº·");
    expect(buildMatterTitle("å¼ ä¸‰", "æŸå…¬å¸", null)).toBe("å¼ ä¸‰ y æŸå…¬å¸");
  });

  it("é¦–ç¨‹åºç±»åž‹æŽ¨æ–­yæ”¶æ¡ˆè½¬åŒ–ä¸€è‡´", () => {
    expect(firstProcedureTypeFor("CIVIL_COMMERCIAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("CRIMINAL")).toBe("FIRST_INSTANCE");
    expect(firstProcedureTypeFor("NON_LITIGATION")).toBe("NON_LITIGATION_PHASE");
    expect(firstProcedureTypeFor("LABOR_ARBITRATION")).toBe("NON_LITIGATION_PHASE");
  });
});

describe("æ‰¹é‡å¯¼å…¥ â€” å•è¡Œæ ¡éªŒ", () => {
  const okRow: RawRow = {
    clientName: "å¼ ä¸‰",
    clientIdNumber: "110101199001011234",
    opposingName: "æŸå…¬å¸",
    opposingIdNumber: "91110000MA01XXXX1A",
    opposingType: "ä¼ä¸š",
    category: "æ°‘å•†è¯‰è®¼",
    status: "åŠžç†ä¸­",
    claimAmount: "120000"
  };

  it("åˆæ³•è¡ŒAprobarå¹¶å½’ä¸€åŒ–", () => {
    const { errors, normalized } = validateRow(okRow);
    expect(errors).toHaveLength(0);
    expect(normalized).not.toBeNull();
    expect(normalized?.category).toBe("CIVIL_COMMERCIAL");
    expect(normalized?.status).toBe("IN_PROGRESS");
    expect(normalized?.opposingPartyType).toBe("COMPANY");
    expect(normalized?.claimAmount).toBe(120000);
  });

  it("ç¼ºå¿…å¡«Ã­temsæŠ¥é”™ä¸” normalized ä¸º null", () => {
    const { errors, normalized } = validateRow({ ...okRow, clientName: "", category: "çžŽå¡«" });
    expect(normalized).toBeNull();
    expect(errors.some((e) => e.includes("ClienteNombre"))).toBe(true);
    expect(errors.some((e) => e.includes("Casoç±»åž‹"))).toBe(true);
  });

  it("æ”¶æ¡ˆFechaæ ¼å¼é”™è¯¯æŠ¥é”™", () => {
    const { errors } = validateRow({ ...okRow, intakeDate: "2026å¹´5æœˆ" });
    expect(errors.some((e) => e.includes("æ”¶æ¡ˆFecha"))).toBe(true);
  });
});

