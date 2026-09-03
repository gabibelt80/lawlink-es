import { describe, it, expect } from "vitest";
import { partyInputSchema } from "@/server/matters/schemas";

const baseInputs = {
  role: "OPPOSING_PARTY" as const,
  ordinal: 1,
  name: "å¼ ä¸‰",
  phone: "",
  address: "",
  legalRep: "",
  contactName: "",
  enterpriseName: "",
  notes: ""
};

describe("partyInputSchema (v0.27)", () => {
  it("è‡ªç„¶äººå¿…é¡»å¡« idNumber", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      partyType: "NATURAL_PERSON",
      idNumber: "",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = r.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("idNumber");
    }
  });

  it("è‡ªç„¶äººå¡«äº† idNumber Aprobar", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      partyType: "NATURAL_PERSON",
      idNumber: "310101199001011234",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(true);
  });

  it("å…¬å¸å¿…é¡»å¡« enterpriseSocialCode", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      name: "ä¸Šæµ·æŸæŸæœ‰é™å…¬å¸",
      partyType: "ORGANIZATION",
      idNumber: "",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = r.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("enterpriseSocialCode");
    }
  });

  it("å…¬å¸å¡«äº† enterpriseSocialCode å³ä½¿æ²¡ idNumber ä¹ŸAprobar", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      name: "ä¸Šæµ·æŸæŸæœ‰é™å…¬å¸",
      partyType: "ORGANIZATION",
      idNumber: "",
      enterpriseSocialCode: "91310000XXXXXXXXXX"
    });
    expect(r.success).toBe(true);
  });

  it("é»˜è®¤ partyType ä¸º NATURAL_PERSONï¼ˆä¸ä¼ æ—¶ï¼‰", () => {
    const r = partyInputSchema.safeParse({
      ...baseInputs,
      idNumber: "310101199001011234",
      enterpriseSocialCode: ""
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.partyType).toBe("NATURAL_PERSON");
    }
  });
});

