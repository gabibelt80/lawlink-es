import { describe, expect, it } from "vitest";
import {
  defaultStageNamesForProcedure,
  optionalStagePresetsForProcedure,
  stagePresetForName
} from "@/lib/procedure-stage-defaults";

describe("defaultStageNamesForProcedure", () => {
  it("uses litigation workflow for first instance procedures", () => {
    expect(defaultStageNamesForProcedure("FIRST_INSTANCE")).toContain("èµ·è¯‰ç«‹æ¡ˆ");
    expect(defaultStageNamesForProcedure("FIRST_INSTANCE")).toContain("è£åˆ¤ç­¾æ”¶");
    expect(defaultStageNamesForProcedure("FIRST_INSTANCE")).toContain("Casoå½’æ¡£");
    expect(defaultStageNamesForProcedure("FIRST_INSTANCE")).not.toContain("è´¢äº§PreservaciÃ³n");
    expect(optionalStagePresetsForProcedure("FIRST_INSTANCE").map((preset) => preset.name)).not.toContain("å±¥è¡Œ/æ‰§è¡Œè¡”æŽ¥");
  });

  it("keeps optional litigation stages outside the default active workflow", () => {
    const optionalNames = optionalStagePresetsForProcedure("FIRST_INSTANCE").map((preset) => preset.name);
    expect(optionalNames).toEqual(expect.arrayContaining(["è´¢äº§PreservaciÃ³n", "ç®¡è¾–æƒå¼‚è®®", "å¸æ³•é‰´å®š", "æ¨¡æ‹Ÿæ³•åº­", "åº­åŽè¡¥å……"]));
    expect(optionalNames.some((name) => name.includes("æ‰§è¡Œ"))).toBe(false);
    expect(stagePresetForName("FIRST_INSTANCE", "Casoå½’æ¡£")?.kind).toBe("required");
    expect(stagePresetForName("FIRST_INSTANCE", "å¸æ³•é‰´å®š")?.kind).toBe("optional");
  });

  it("uses required enforcement stages by default", () => {
    expect(defaultStageNamesForProcedure("ENFORCEMENT")).toEqual([
      "ä»£ç†æŽˆæƒ",
      "æ‰§è¡Œç«‹æ¡ˆ",
      "è´¢äº§æŸ¥æŽ§",
      "æ‰§è¡ŒCerrar caso",
      "Casoå½’æ¡£"
    ]);
  });

  it("uses criminal investigation workflow for investigation procedures", () => {
    expect(defaultStageNamesForProcedure("INVESTIGATION")).toEqual([
      "ä»£ç†æŽˆæƒ",
      "ä¼šè§",
      "é˜…å·çº¿ç´¢",
      "è¾©æŠ¤æ„è§",
      "Casoå½’æ¡£"
    ]);
  });
});

