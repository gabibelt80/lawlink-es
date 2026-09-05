import { describe, expect, it } from "vitest";
import { parseSms } from "@/lib/sms-parser";

describe("parseSms", () => {
  it("æå–å¼€åº­æ—¶é—´å¹¶ç”ŸæˆElementos importantes", () => {
    const parsed = parseSms(
      "ã€ä¸Šæµ·å¸‚æµ¦ä¸œæ–°åŒºäººæ°‘æ³•é™¢ã€‘æ¡ˆå·ï¼ˆ2026ï¼‰æ²ª0115æ°‘åˆ12345å·ï¼Œæœ¬é™¢å®šäºŽ2026å¹´7æœˆ1æ—¥ä¸Šåˆ9:30åœ¨ç¬¬ä¸‰æ³•åº­å¼€åº­ï¼Œæ‰¿åŠžæ³•å®˜å¼ ä¸‰ã€‚"
    );

    expect(parsed.smsType).toBe("HEARING_NOTICE");
    expect(parsed.caseNumbers).toEqual(["ï¼ˆ2026ï¼‰æ²ª0115æ°‘åˆ12345å·"]);
    expect(parsed.hearingDate).toBe("2026å¹´7æœˆ1æ—¥ä¸Šåˆ9:30");
    expect(parsed.dates).toEqual(["2026å¹´7æœˆ1æ—¥ä¸Šåˆ9:30"]);
    expect(parsed.importantItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "HEARING",
          title: "å¼€åº­ / åº­å®¡",
          dateText: "2026å¹´7æœˆ1æ—¥ä¸Šåˆ9:30"
        })
      ])
    );
  });

  it("è¯†åˆ«ç”µå­é€è¾¾Enlaceã€è´¦å·ContraseÃ±aå’Œäººå·¥Iniciar sesiÃ³nEstado", () => {
    const parsed = parseSms(
      "ã€12368ã€‘ä½ æœ‰æ³•å¾‹æ–‡ä¹¦å¾…ç­¾æ”¶ï¼Œæ¡ˆå·ï¼ˆ2026ï¼‰æµ™0106æ°‘åˆ888å·ï¼Œè¯·Iniciar sesiÃ³nhttps://songda.example.com/doc?id=abcï¼Œè´¦å·ï¼šlawyer001ï¼ŒContraseÃ±aï¼šAbc12345ï¼ŒéªŒè¯ç ï¼š778899ã€‚"
    );

    expect(parsed.smsType).toBe("SERVICE_NOTICE");
    expect(parsed.urls).toEqual(["https://songda.example.com/doc?id=abc"]);
    expect(parsed.credentials.map((c) => c.label)).toEqual(["è´¦å·", "ContraseÃ±a", "éªŒè¯ç "]);
    expect(parsed.credentials[1].valuePreview).not.toBe("Abc12345");
    expect(parsed.documentLinks[0]).toMatchObject({
      url: "https://songda.example.com/doc?id=abc",
      requiresLogin: true
    });
  });

  it("æŠŠä¸¾è¯ã€ç¼´è´¹etc.Fechaè¯†åˆ«æˆå¾…å¤„ç†äº‹Ã­tems", () => {
    const parsed = parseSms(
      "ã€æ³•é™¢Notificacionesã€‘è¯·äºŽ2026å¹´6æœˆ25æ—¥å‰Enviarè¯æ®ææ–™ï¼Œå¹¶äºŽ2026å¹´6æœˆ20æ—¥å‰ç¼´çº³è¯‰è®¼è´¹500pesosã€‚è¯¦æƒ…ï¼šhttps://court.example.com/payã€‚"
    );

    expect(parsed.smsType).toBe("FEE_NOTICE");
    expect(parsed.amounts).toContain("500pesos");
    expect(parsed.importantItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "EVIDENCE_DEADLINE", dateText: "2026å¹´6æœˆ25æ—¥" }),
        expect.objectContaining({ kind: "FEE_DEADLINE", dateText: "2026å¹´6æœˆ20æ—¥" })
      ])
    );
    expect(parsed.urls).toEqual(["https://court.example.com/pay"]);
  });
});

