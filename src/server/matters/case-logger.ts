"use server";

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";

type LogEntry = {
  id: string;
  action: string;
  user: string;
  userId: string;
  timestamp: string;
  detail: string;
  before?: unknown;
  after?: unknown;
};

type ChatMessage = {
  id: string;
  user: string;
  userId: string;
  content: string;
  timestamp: string;
  type: "USER" | "AI" | "SYSTEM";
};

type WritingEntry = {
  id: string;
  name: string;
  content: string;
  status: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  history: {
    version: number;
    content: string;
    changedBy: string;
    changedAt: string;
  }[];
};

export async function logCaseEvent(
  matterId: string,
  action: string,
  detail: string,
  before?: unknown,
  after?: unknown
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true },
  });
  if (!matter) throw new Error("Caso no encontrado");

  const jsonPath = join(process.cwd(), "storage", "matters", `${matter.internalCode}.json`);
  if (!existsSync(jsonPath)) {
    await generateCaseJson(matterId);
  }

  const caseData = JSON.parse(readFileSync(jsonPath, "utf-8"));

  if (!caseData.audit) caseData.audit = [];
  if (!caseData.chat) caseData.chat = [];
  if (!caseData.writings) caseData.writings = [];

  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    action,
    user: session.user.name ?? "Sistema",
    userId: session.user.id,
    timestamp: new Date().toISOString(),
    detail,
    before,
    after,
  };

  caseData.audit.push(entry);
  caseData.updatedAt = new Date().toISOString();

  writeFileSync(jsonPath, JSON.stringify(caseData, null, 2), "utf-8");

  return { ok: true, entry };
}

export async function logCaseChat(
  matterId: string,
  content: string,
  type: "USER" | "AI" | "SYSTEM" = "USER"
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true },
  });
  if (!matter) throw new Error("Caso no encontrado");

  const jsonPath = join(process.cwd(), "storage", "matters", `${matter.internalCode}.json`);
  if (!existsSync(jsonPath)) {
    await generateCaseJson(matterId);
  }

  const caseData = JSON.parse(readFileSync(jsonPath, "utf-8"));

  if (!caseData.chat) caseData.chat = [];

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user: session.user.name ?? "Sistema",
    userId: session.user.id,
    content,
    timestamp: new Date().toISOString(),
    type,
  };

  caseData.chat.push(message);
  caseData.updatedAt = new Date().toISOString();

  writeFileSync(jsonPath, JSON.stringify(caseData, null, 2), "utf-8");

  return { ok: true, message };
}

export async function logCaseWriting(
  matterId: string,
  writing: {
    id: string;
    name: string;
    content: string;
    status: string;
  }
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true },
  });
  if (!matter) throw new Error("Caso no encontrado");

  const jsonPath = join(process.cwd(), "storage", "matters", `${matter.internalCode}.json`);
  if (!existsSync(jsonPath)) {
    await generateCaseJson(matterId);
  }

  const caseData = JSON.parse(readFileSync(jsonPath, "utf-8"));

  if (!caseData.writings) caseData.writings = [];

  const existingIndex = caseData.writings.findIndex((w: WritingEntry) => w.id === writing.id);

  if (existingIndex >= 0) {
    const existing = caseData.writings[existingIndex];
    if (!existing.history) existing.history = [];

    existing.history.push({
      version: existing.history.length + 1,
      content: existing.content,
      changedBy: session.user.name ?? "Sistema",
      changedAt: existing.updatedAt,
    });

    existing.content = writing.content;
    existing.status = writing.status;
    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = session.user.name ?? "Sistema";
  } else {
    const newWriting: WritingEntry = {
      id: writing.id,
      name: writing.name,
      content: writing.content,
      status: writing.status,
      createdAt: new Date().toISOString(),
      createdBy: session.user.name ?? "Sistema",
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.name ?? "Sistema",
      history: [],
    };
    caseData.writings.push(newWriting);
  }

  caseData.updatedAt = new Date().toISOString();

  writeFileSync(jsonPath, JSON.stringify(caseData, null, 2), "utf-8");

  return { ok: true };
}