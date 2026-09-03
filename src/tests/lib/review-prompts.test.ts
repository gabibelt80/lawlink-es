import { describe, it, expect } from "vitest";
import {
  selectReviewPrompt,
  reviewPromptLabel,
  CONTRACT_PROMPT,
  PLEADING_PROMPT,
  EVIDENCE_PROMPT,
  JUDGMENT_PROMPT,
  GENERIC_PROMPT
} from "@/lib/ai/review-prompts";

describe("selectReviewPrompt â€” æŒ‰ DocumentCategory åˆ†æµ", () => {
  it("CONTRACT â†’ åˆåŒ prompt", () => {
    expect(selectReviewPrompt("CONTRACT")).toBe(CONTRACT_PROMPT);
  });
  it("PLEADING â†’ è¯‰çŠ¶/ç”³è¯·ä¹¦ prompt", () => {
    expect(selectReviewPrompt("PLEADING")).toBe(PLEADING_PROMPT);
  });
  it("EVIDENCE â†’ è¯æ® prompt", () => {
    expect(selectReviewPrompt("EVIDENCE")).toBe(EVIDENCE_PROMPT);
  });
  it("JUDGMENT â†’ è£åˆ¤æ–‡ä¹¦ prompt", () => {
    expect(selectReviewPrompt("JUDGMENT")).toBe(JUDGMENT_PROMPT);
  });
  it("PROCEDURE â†’ é€šç”¨å…œåº•", () => {
    expect(selectReviewPrompt("PROCEDURE")).toBe(GENERIC_PROMPT);
  });
  it("OTHER â†’ é€šç”¨å…œåº•", () => {
    expect(selectReviewPrompt("OTHER")).toBe(GENERIC_PROMPT);
  });
  it("null â†’ é€šç”¨å…œåº•", () => {
    expect(selectReviewPrompt(null)).toBe(GENERIC_PROMPT);
  });
  it("undefined â†’ é€šç”¨å…œåº•", () => {
    expect(selectReviewPrompt(undefined)).toBe(GENERIC_PROMPT);
  });
});

describe("reviewPromptLabel â€” ä¸­æ–‡æ ‡ç­¾", () => {
  it("å„ category Volverå¯¹åº”ä¸­æ–‡", () => {
    expect(reviewPromptLabel("CONTRACT")).toBe("åˆåŒå®¡æŸ¥");
    expect(reviewPromptLabel("PLEADING")).toBe("è¯‰çŠ¶/ç”³è¯·ä¹¦å®¡æŸ¥");
    expect(reviewPromptLabel("EVIDENCE")).toBe("è¯æ®å®¡æŸ¥");
    expect(reviewPromptLabel("JUDGMENT")).toBe("è£åˆ¤æ–‡ä¹¦åˆ†æž");
  });
  it("å…œåº•ç±»ç›® / null / undefined â†’ é€šç”¨æ–‡ä¹¦å®¡æŸ¥", () => {
    expect(reviewPromptLabel("PROCEDURE")).toBe("é€šç”¨æ–‡ä¹¦å®¡æŸ¥");
    expect(reviewPromptLabel("OTHER")).toBe("é€šç”¨æ–‡ä¹¦å®¡æŸ¥");
    expect(reviewPromptLabel(null)).toBe("é€šç”¨æ–‡ä¹¦å®¡æŸ¥");
    expect(reviewPromptLabel(undefined)).toBe("é€šç”¨æ–‡ä¹¦å®¡æŸ¥");
  });
});

describe("prompt å†…å®¹å¥‘çº¦", () => {
  it("æ‰€æœ‰ prompt éƒ½åŒ…å«è¾“å‡ºæ ¼å¼ JSON æ•°ç»„è§„èŒƒ", () => {
    for (const p of [
      CONTRACT_PROMPT,
      PLEADING_PROMPT,
      EVIDENCE_PROMPT,
      JUDGMENT_PROMPT,
      GENERIC_PROMPT
    ]) {
      expect(p).toContain("MISSING");
      expect(p).toContain("RISK");
      expect(p).toContain("ISSUE");
      expect(p).toContain("SUGGESTION");
      expect(p).toContain("HIGH");
      expect(p).toContain("MEDIUM");
      expect(p).toContain("LOW");
      expect(p).toContain("JSON");
    }
  });
  it("æ‰€æœ‰ prompt éƒ½è¦æ±‚ç©ºæ•°ç»„å…œåº•", () => {
    for (const p of [
      CONTRACT_PROMPT,
      PLEADING_PROMPT,
      EVIDENCE_PROMPT,
      JUDGMENT_PROMPT,
      GENERIC_PROMPT
    ]) {
      expect(p).toMatch(/ç©ºæ•°ç»„|\[\s*\]/);
    }
  });
  it("CONTRACT prompt å…³æ³¨åˆåŒç‰¹å¾è¦ç´ ", () => {
    expect(CONTRACT_PROMPT).toContain("è¿çº¦è´£ä»»");
    expect(CONTRACT_PROMPT).toContain("äº‰è®®è§£å†³");
    expect(CONTRACT_PROMPT).toContain("ä¸å¯æŠ—åŠ›");
  });
  it("PLEADING prompt å…³æ³¨è¯‰è®¼ç¨‹åºyè¯‰è¯·", () => {
    expect(PLEADING_PROMPT).toContain("è¯‰è®¼è¯·æ±‚");
    expect(PLEADING_PROMPT).toContain("ç®¡è¾–");
    expect(PLEADING_PROMPT).toContain("è¯‰è®¼æ—¶æ•ˆ");
  });
  it("EVIDENCE prompt å…³æ³¨ä¸‰æ€§yè¯æ®é“¾", () => {
    expect(EVIDENCE_PROMPT).toContain("çœŸå®žæ€§");
    expect(EVIDENCE_PROMPT).toContain("åˆæ³•æ€§");
    expect(EVIDENCE_PROMPT).toContain("å…³è”æ€§");
    expect(EVIDENCE_PROMPT).toContain("è¯æ®é“¾");
  });
  it("JUDGMENT prompt å…³æ³¨è£åˆ¤åˆ†æžyåº”å¯¹ç­–ç•¥", () => {
    expect(JUDGMENT_PROMPT).toContain("äºŒå®¡");
    expect(JUDGMENT_PROMPT).toContain("å†å®¡");
    expect(JUDGMENT_PROMPT).toMatch(/åº”å¯¹|ç­–ç•¥|ä¸åˆ©/);
  });
});

