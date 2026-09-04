"use server";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { extractTextFromFile } from "@/lib/writings/extract-text";

const WRITINGS_DIR = process.env.APP_STORAGE_DIR
  ? join(process.env.APP_STORAGE_DIR, "writings")
  : join(process.cwd(), "storage", "writings");

const SUPPORTED_EXTENSIONS = new Set([".txt", ".docx", ".pdf", ".doc"]);

export async function syncWritingsFromFolder() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede sincronizar escritos");
  }

  const files = readdirSync(WRITINGS_DIR);
  const supportedFiles = files.filter((file) => {
    const ext = file.toLowerCase().slice(file.lastIndexOf("."));
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  const existing = await prisma.writingTemplate.findMany({
    select: { name: true, content: true },
  });
  const existingNames = new Set(existing.map((w) => w.name));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const file of supportedFiles) {
    const fullPath = join(WRITINGS_DIR, file);
    const name = file.replace(/\.[^.]+$/, ""); // nombre sin extension
    
    try {
      const content = await extractTextFromFile(fullPath);

      if (existingNames.has(name)) {
        await prisma.writingTemplate.updateMany({
          where: { name },
          data: { content },
        });
        updated++;
      } else {
        await prisma.writingTemplate.create({
          data: {
            name,
            category: "OTRO",
            stage: "TODAS",
            content,
            enabled: true,
            createdById: session.user.id,
          },
        });
        created++;
      }
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  revalidatePath("/settings/writings");

  return {
    ok: true,
    total: supportedFiles.length,
    created,
    updated,
    errors,
  };
}