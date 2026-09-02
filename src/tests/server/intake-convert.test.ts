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
    user: { id: "approver-1", role: "ADMIN", name: "Aprobación人" }
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
      note: "未命中历史Caso冲突",
      queryPayload: {
        queries: [
          { role: "CLIENT_PARTY", name: "甲公司", idNumber: "91330000123456789X" },
          { role: "OPPOSING_PARTY", name: "乙公司" },
          { role: "THIRD_PARTY", name: "丙", idNumber: "330100199001010000" }
        ]
      },
      hits: []
    }
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  generateInternalCodeMock.mockResolvedValue("LL-2026-001");
  generateFirmCaseNoMock.mockResolvedValue("YS-2026-民-001");
  txMock.matter.create.mockResolvedValue({ id: "matter-1", internalCode: "LL-2026-001" });
  txMock.matterProcedure.create.mockResolvedValue({ id: "procedure-1" });
  txMock.party.create
    .mockResolvedValueOnce({ id: "party-client" })
    .mockResolvedValueOnce({ id: "party-opponent" })
    .mockResolvedValueOnce({ id: "party-third" });
});

describe("convertIntakeToMatter", () => {
  it("按收案当前程序Crear首程序，并同步当事人诉讼地位为程序当事人", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      title: "甲y乙合同纠纷",
      category: "CIVIL_COMMERCIAL",
      causeId: null,
      causeFreeText: null,
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "甲公司",
        type: "COMPANY",
        idNumber: "91330000123456789X",
        phone: "13800000000",
        address: "杭州",
        legalRep: "张三"
      },
      receivedAt: new Date("2026-06-01T00:00:00Z"),
      ownerUserId: "lawyer-1",
      coUserIds: [],
      firstProcedureType: "FIRST_INSTANCE",
      firstAgency: "杭州市西湖区人民法院",
      jurisdiction: "浙江省杭州市西湖区",
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
      contactName: "李四",
      parties: [
        {
          role: "OPPOSING_PARTY",
          standing: "DEFENDANT",
          ordinal: 1,
          name: "乙公司",
          partyType: "COMPANY",
          idNumber: null,
          phone: null,
          address: null,
          legalRep: "王五",
          contactName: null,
          enterpriseSocialCode: "91330000999999999X",
          enterpriseName: "乙公司",
          notes: null
        },
        {
          role: "THIRD_PARTY",
          standing: "THIRD_PARTY",
          ordinal: 2,
          name: "丙",
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
          handlingAgency: "杭州市西湖区人民法院",
          jurisdiction: "浙江省杭州市西湖区",
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

  it("未运行利益冲突检索时拒绝转正式Caso", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      client: { name: "甲公司", idNumber: null },
      parties: [],
      conflictChecks: [],
      documents: []
    });

    await expect(convertIntakeToMatter("intake-1")).rejects.toThrow(
      "转为正式Caso前必须先运行利益冲突检索"
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("高风险命中没有Observaciones排除理由时拒绝转正式Caso", async () => {
    prismaMock.intake.findUnique.mockResolvedValue({
      id: "intake-1",
      status: "PENDING_CONFIRMATION",
      client: { name: "甲公司", idNumber: null },
      parties: [],
      conflictChecks: [
        {
          conclusion: "DIFFERENT",
          note: null,
          queryPayload: { queries: [{ role: "CLIENT_PARTY", name: "甲公司" }] },
          hits: [{ severity: "HIGH" }]
        }
      ],
      documents: []
    });

    await expect(convertIntakeToMatter("intake-1")).rejects.toThrow(
      "存在高风险或阻塞命中"
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
