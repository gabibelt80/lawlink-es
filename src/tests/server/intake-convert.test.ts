import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  txMock,
  auditMock,
  seedDefaultFoldersMock,
  generateInternalCodeMock,
  generateFirmCaseNoMock
} = vi.hoisted(() => {
  const tx = {
    matter: { create: vi.fn() },
    party: { create: vi.fn() },
    matterProcedure: { create: vi.fn() },
    procedureParty: { createMany: vi.fn() },
    billing: { create: vi.fn() },
    document: { updateMany: vi.fn() },
    intake: { update: vi.fn() },
    timelineEvent: { create: vi.fn() }
  };
  return {
    txMock: tx,
    prismaMock: {
      intake: { findUnique: vi.fn() },
      $transaction: vi.fn((fn) => fn(tx))
    },
    auditMock: vi.fn(),
    seedDefaultFoldersMock: vi.fn(),
    generateInternalCodeMock: vi.fn(),
    generateFirmCaseNoMock: vi.fn()
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn().mockResolvedValue({
    user: { id: "approver-1", role: "ADMIN", name: "AprobaciÃ³näºº" }
  })
}));

vi.mock("@/server/audit", () => ({
  audit: auditMock
}));

vi.mock("@/lib/default-folders", () => ({
  seedDefaultFolders: seedDefaultFoldersMock
}));

vi.mock("@/server/notifications/approval", () => ({
  notifyRoleApprovers: vi.fn()
}));

vi.mock("@/server/matters/code-generator", () => ({
  generateInternalCode: generateInternalCodeMock,
  generateFirmCaseNo: generateFirmCaseNoMock
}));

import { convertIntakeToMatter } from "@/server/intakes/actions";

function validConflictChecks() {
  return [
    {
      conclusion: "DIFFERENT",
      note: "æœªå‘½ä¸­åŽ†å²Casoå†²çª",
      queryPayload: {
        queries: [
          { role: "CLIENT_PARTY", name: "ç”²å…¬å¸", idNumber: "91330000123456789X" },
          { role: "OPPOSING_PARTY", name: "ä¹™å…¬å¸" },
          { role: "THIRD_PARTY", name: "ä¸™", idNumber: "330100199001010000" }
        ]
      },
      hits: []
    }
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  generateInternalCodeMock.mockResolvedValue("LL-2026-001");
  generateFirmCaseNoMock.mockResolvedValue("YS-2026-æ°‘-001");
  txMock.matter.create.mockResolvedValue({ id: "matter-1", internalCode: "LL-2026-001" });
  txMock.matterProcedure.create.mockResolvedValue({ id: "procedure-1" });
  txMock.party.create
    .mockResolvedValueOnce({ id: "party-client" })
    .mockResolvedValueOnce({ id: "party-opponent" })
    .mockResolvedValueOnce({ id: "party-third" });
});

describe("convertIntakeToMatter", () => {
  it("æŒ‰æ”¶æ¡ˆå½“å‰ç¨‹åºCrearé¦–ç¨‹åºï¼Œå¹¶åŒæ­¥å½“äº‹äººè¯‰è®¼åœ°ä½ä¸ºç¨‹åºå½“äº‹äºº", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      title: "ç”²yä¹™åˆåŒçº çº·",
      category: "CIVIL_COMMERCIAL",
      causeId: null,
      causeFreeText: null,
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "ç”²å…¬å¸",
        type: "COMPANY",
        idNumber: "91330000123456789X",
        phone: "13800000000",
        address: "æ­å·ž",
        legalRep: "å¼ ä¸‰"
      },
      receivedAt: new Date("2026-06-01T00:00:00Z"),
      ownerUserId: "lawyer-1",
      coUserIds: [],
      firstProcedureType: "FIRST_INSTANCE",
      firstAgency: "æ­å·žå¸‚è¥¿æ¹–åŒºäººæ°‘æ³•é™¢",
      jurisdiction: "æµ™æ±Ÿçœæ­å·žå¸‚è¥¿æ¹–åŒº",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      barFiling: "NONE",
      businessType: null,
      serviceScope: null,
      deliverables: null,
      counselType: null,
      serviceStart: null,
      serviceEnd: null,
      feeAmount: null,
      feeType: null,
      feeSchedule: null,
      contactName: "æŽå››",
      parties: [
        {
          role: "OPPOSING_PARTY",
          standing: "DEFENDANT",
          ordinal: 1,
          name: "ä¹™å…¬å¸",
          partyType: "COMPANY",
          idNumber: null,
          phone: null,
          address: null,
          legalRep: "çŽ‹äº”",
          contactName: null,
          enterpriseSocialCode: "91330000999999999X",
          enterpriseName: "ä¹™å…¬å¸",
          notes: null
        },
        {
          role: "THIRD_PARTY",
          standing: "THIRD_PARTY",
          ordinal: 2,
          name: "ä¸™",
          partyType: "NATURAL_PERSON",
          idNumber: "330100199001010000",
          phone: null,
          address: null,
          legalRep: null,
          contactName: null,
          enterpriseSocialCode: null,
          enterpriseName: null,
          notes: null
        }
      ],
      conflictChecks: validConflictChecks(),
      documents: []
    });

    await convertIntakeToMatter("intake-1");

    expect(txMock.matterProcedure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matterId: "matter-1",
          type: "FIRST_INSTANCE",
          handlingAgency: "æ­å·žå¸‚è¥¿æ¹–åŒºäººæ°‘æ³•é™¢",
          jurisdiction: "æµ™æ±Ÿçœæ­å·žå¸‚è¥¿æ¹–åŒº",
          ourStanding: "PLAINTIFF"
        })
      })
    );
    expect(txMock.procedureParty.createMany).toHaveBeenCalledWith({
      data: [
        {
          procedureId: "procedure-1",
          partyId: "party-client",
          standing: "PLAINTIFF",
          ordinal: 1
        },
        {
          procedureId: "procedure-1",
          partyId: "party-opponent",
          standing: "DEFENDANT",
          ordinal: 2
        },
        {
          procedureId: "procedure-1",
          partyId: "party-third",
          standing: "THIRD_PARTY",
          ordinal: 3
        }
      ],
      skipDuplicates: true
    });
  });

  it("æœªè¿è¡Œåˆ©ç›Šå†²çªæ£€ç´¢æ—¶æ‹’ç»è½¬æ­£å¼Caso", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      client: { name: "ç”²å…¬å¸", idNumber: null },
      parties: [],
      conflictChecks: [],
      documents: []
    });

    await expect(convertIntakeToMatter("intake-1")).rejects.toThrow(
      "è½¬ä¸ºæ­£å¼Casoå‰å¿…é¡»å…ˆè¿è¡Œåˆ©ç›Šå†²çªæ£€ç´¢"
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("é«˜é£Žé™©å‘½ä¸­æ²¡æœ‰ObservacionesæŽ’é™¤ç†ç”±æ—¶æ‹’ç»è½¬æ­£å¼Caso", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      client: { name: "ç”²å…¬å¸", idNumber: null },
      parties: [],
      conflictChecks: [
        {
          conclusion: "DIFFERENT",
          note: null,
          queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "ç”²å…¬å¸" }] },
          hits: [{ severity: "HIGH" }]
        }
      ],
      documents: []
    });

    await expect(convertIntakeToMatter("intake-1")).rejects.toThrow(
      "å­˜åœ¨é«˜é£Žé™©æˆ–é˜»å¡žå‘½ä¸­"
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

