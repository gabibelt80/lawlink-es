import { describe, expect, it } from "vitest";
import {
  causeScopeForSelection,
  isCauseAllowedForSelection
} from "@/lib/cause-scope";

describe("causeScopeForSelection", () => {
  it("å•†äº‹ä»²è£ç±»åˆ«å…±ç”¨Civil/ComercialCausaåº“å¹¶é™åˆ¶è´¢äº§æƒç›Šç±»Causa", () => {
    const scope = causeScopeForSelection("COMMERCIAL_ARBITRATION");
    expect(scope.dbCategory).toBe("CIVIL_COMMERCIAL");
    expect(scope.includeCodePrefixes).toContain("CC-4");
    expect(scope.includeCodePrefixes).toContain("CC-9");
    expect(scope.excludeCodePrefixes).toContain("CC-9-27");
  });

  it("Civil/Comercialç±»åˆ«ä¸‹é€‰æ‹©å•†äº‹ä»²è£ç¨‹åºæ—¶ä¹Ÿå¯ç”¨åŒä¸€é™åˆ¶", () => {
    const scope = causeScopeForSelection("CIVIL_COMMERCIAL", "COMMERCIAL_ARBITRATION");
    expect(scope.dbCategory).toBe("CIVIL_COMMERCIAL");
    expect(scope.includeCodePrefixes).toContain("CC-4");
  });

  it("åŠ³åŠ¨ä»²è£åªä½¿ç”¨åŠ³åŠ¨äº‰è®®Causaæ®µ", () => {
    const scope = causeScopeForSelection("LABOR_ARBITRATION");
    expect(scope.dbCategory).toBe("CIVIL_COMMERCIAL");
    expect(scope.includeCodePrefixes).toEqual(["CC-7"]);
  });
});

describe("isCauseAllowedForSelection", () => {
  it("å…è®¸å•†äº‹ä»²è£é€‰æ‹©åˆåŒç±»Causa", () => {
    expect(
      isCauseAllowedForSelection(
        { category: "CIVIL_COMMERCIAL", code: "CC-4-10-108-3", active: true },
        "COMMERCIAL_ARBITRATION"
      )
    ).toBe(true);
  });

  it("æ‹’ç»å•†äº‹ä»²è£é€‰æ‹©å©šå§»ç»§æ‰¿ã€åŠ³åŠ¨ã€ç ´äº§å’Œäººèº«æŸå®³ç±»Causa", () => {
    const rejectedCodes = [
      "CC-2-2-14",
      "CC-7-19-205",
      "CC-9-27-333",
      "CC-8-22-224"
    ];
    for (const code of rejectedCodes) {
      expect(
        isCauseAllowedForSelection(
          { category: "CIVIL_COMMERCIAL", code, active: true },
          "COMMERCIAL_ARBITRATION"
        )
      ).toBe(false);
    }
  });

  it("éžå•†äº‹ä»²è£çš„Civil/ComercialCasoä»å¯é€‰æ‹©æ™®é€šæ°‘äº‹Causa", () => {
    expect(
      isCauseAllowedForSelection(
        { category: "CIVIL_COMMERCIAL", code: "CC-2-2-14", active: true },
        "CIVIL_COMMERCIAL"
      )
    ).toBe(true);
  });
});

