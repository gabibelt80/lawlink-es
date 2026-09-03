import { describe, expect, it } from "vitest";
import { intakeCreateSchema } from "@/server/intakes/schemas";

const baseLitigationIntake = {
  category: "CIVIL_COMMERCIAL",
  title: "ç”²yä¹™åˆåŒçº çº·",
  firstProcedureType: "FIRST_INSTANCE",
  clientName: "ç”²",
  clientType: "INDIVIDUAL",
  clientIdNumber: "330100199001010000",
  parties: [
    {
      role: "OPPOSING_PARTY",
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "ä¹™",
      idNumber: "330100199002020000",
      enterpriseSocialCode: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      enterpriseName: "",
      notes: ""
    }
  ]
};

describe("intakeCreateSchema", () => {
  it("è¯‰è®¼/ä»²è£ç±»æ”¶æ¡ˆå¿…é¡»å¡«å†™å§”æ‰˜æ–¹å’ŒCasoå½“äº‹äººçš„è¯‰è®¼åœ°ä½", () => {
    const result = intakeCreateSchema.safeParse(baseLitigationIntake);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      expect(issues).toContainEqual({
        path: "ourStanding",
        message: "è¯·é€‰æ‹©å§”æ‰˜æ–¹è¯‰è®¼åœ°ä½"
      });
      expect(issues).toContainEqual({
        path: "parties.0.standing",
        message: "è¯·é€‰æ‹©è¯‰è®¼åœ°ä½"
      });
    }
  });

  it("è¯‰è®¼/ä»²è£ç±»æ”¶æ¡ˆå¡«å†™è¯‰è®¼åœ°ä½åŽAprobar", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      ourStanding: "PLAINTIFF",
      parties: [
        {
          ...baseLitigationIntake.parties[0],
          standing: "DEFENDANT"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("éžè¯‰/é¡¾é—®/ä¸“Ã­temsä¸å¼ºåˆ¶è¯‰è®¼åœ°ä½", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      category: "NON_LITIGATION",
      firstProcedureType: "NON_LITIGATION_PHASE"
    });

    expect(result.success).toBe(true);
  });

  it("å¯é€‰Montoç•™ç©ºæ—¶ä¸å›  HTML number è¾“å…¥äº§ç”Ÿçš„ NaN é˜»æ–­Enviar", () => {
    const result = intakeCreateSchema.safeParse({
      ...baseLitigationIntake,
      ourStanding: "PLAINTIFF",
      claimAmount: Number.NaN,
      feeAmount: Number.NaN,
      parties: [
        {
          ...baseLitigationIntake.parties[0],
          standing: "DEFENDANT"
        }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claimAmount).toBeUndefined();
      expect(result.data.feeAmount).toBeUndefined();
    }
  });
});

