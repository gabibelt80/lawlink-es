import { describe, expect, it } from "vitest";
import {
  agencyOptions,
  agencyOptionsForProcedure,
  isAgencyAllowedForProcedure,
  isNationalAgency,
  normalizeJurisdictionForAgency
} from "@/lib/china-regions";

describe("agencyOptions", () => {
  it("æœªé€‰ç®¡è¾–åœ°æ—¶ä»æä¾›æœ€é«˜äººæ°‘æ³•é™¢", () => {
    expect(agencyOptions()).toEqual(["æœ€é«˜äººæ°‘æ³•é™¢"]);
  });

  it("é€‰åˆ°åŒºåŽ¿æ—¶åŒ…å«æœ€é«˜äººæ°‘æ³•é™¢ä¸”ä¿ç•™åœ°æ–¹æœºæž„", () => {
    const options = agencyOptions("æµ™æ±Ÿçœ/æ­å·žå¸‚/è¥¿æ¹–åŒº");

    expect(options).toContain("è¥¿æ¹–åŒºäººæ°‘æ³•é™¢");
    expect(options).toContain("æ­å·žå¸‚ä¸­çº§äººæ°‘æ³•é™¢");
    expect(options).toContain("æµ™æ±Ÿçœé«˜çº§äººæ°‘æ³•é™¢");
    expect(options).toContain("æœ€é«˜äººæ°‘æ³•é™¢");
    expect(options).toContain("æ­å·žä»²è£å§”å‘˜ä¼š");
  });

  it("å•†äº‹ä»²è£ç¨‹åºåªæä¾›ä»²è£æœºæž„ï¼ŒåŽç»­æ‰§è¡Œç¨‹åºä»å¯é€‰æ‹©æ³•é™¢", () => {
    const arbitrationOptions = agencyOptionsForProcedure(
      "æµ™æ±Ÿçœ/æ­å·žå¸‚/è¥¿æ¹–åŒº",
      "COMMERCIAL_ARBITRATION"
    );
    expect(arbitrationOptions).toEqual(["æ­å·žä»²è£å§”å‘˜ä¼š"]);
    expect(isAgencyAllowedForProcedure("è¥¿æ¹–åŒºäººæ°‘æ³•é™¢", "COMMERCIAL_ARBITRATION")).toBe(false);
    expect(isAgencyAllowedForProcedure("æ­å·žä»²è£å§”å‘˜ä¼š", "COMMERCIAL_ARBITRATION")).toBe(true);

    const enforcementOptions = agencyOptionsForProcedure("æµ™æ±Ÿçœ/æ­å·žå¸‚/è¥¿æ¹–åŒº", "ENFORCEMENT");
    expect(enforcementOptions).toContain("è¥¿æ¹–åŒºäººæ°‘æ³•é™¢");
    expect(enforcementOptions).toContain("æ­å·žä»²è£å§”å‘˜ä¼š");
  });
});

describe("national agency helpers", () => {
  it("è¯†åˆ«æœ€é«˜äººæ°‘æ³•é™¢", () => {
    expect(isNationalAgency("æœ€é«˜äººæ°‘æ³•é™¢")).toBe(true);
    expect(isNationalAgency(" æœ€é«˜äººæ°‘æ³•é™¢ ")).toBe(true);
    expect(isNationalAgency("æµ™æ±Ÿçœé«˜çº§äººæ°‘æ³•é™¢")).toBe(false);
  });

  it("æœ€é«˜äººæ°‘æ³•é™¢ä¸ä¿ç•™åœ°æ–¹ç®¡è¾–åœ°", () => {
    expect(normalizeJurisdictionForAgency("æœ€é«˜äººæ°‘æ³•é™¢", "æµ™æ±Ÿçœ/æ­å·žå¸‚/è¥¿æ¹–åŒº")).toBeNull();
    expect(normalizeJurisdictionForAgency("æµ™æ±Ÿçœé«˜çº§äººæ°‘æ³•é™¢", "æµ™æ±Ÿçœ/æ­å·žå¸‚")).toBe("æµ™æ±Ÿçœ/æ­å·žå¸‚");
  });
});

