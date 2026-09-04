"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { extractTextFromFile } from "@/lib/writings/extract-text";

const writingSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  stage: z.string().min(1).max(50),
  content: z.string().min(1).max(50000),
  enabled: z.boolean().default(true),
});

export async function listWritings() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  console.log("FIRM SLUG:", session?.user?.firmSlug);
  return prisma.writingTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createWriting(input: z.infer<typeof writingSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede crear escritos");
  }
  const data = writingSchema.parse(input);
  const created = await prisma.writingTemplate.create({
    data: { ...data, createdById: session.user.id },
  });
  revalidatePath("/settings/writings");
  return { ok: true, id: created.id };
}

export async function updateWriting(id: string, input: z.infer<typeof writingSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede editar escritos");
  }
  const data = writingSchema.parse(input);
  await prisma.writingTemplate.update({
    where: { id },
    data,
  });
  revalidatePath("/settings/writings");
  return { ok: true };
}

export async function deleteWriting(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede eliminar escritos");
  }
  await prisma.writingTemplate.delete({ where: { id } });
  revalidatePath("/settings/writings");
  return { ok: true };
}
export async function syncWritingsFromFolder() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede sincronizar escritos");
  }

  const WRITINGS_DIR = process.env.APP_STORAGE_DIR
    ? join(process.env.APP_STORAGE_DIR, "writings")
    : join(process.cwd(), "storage", "writings");

  const SUPPORTED_EXTENSIONS = new Set([".txt", ".docx", ".pdf", ".doc"]);

  const files = readdirSync(WRITINGS_DIR);
  const supportedFiles = files.filter((file) => {
    const ext = file.toLowerCase().slice(file.lastIndexOf("."));
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  const existing = await prisma.writingTemplate.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existing.map((w) => w.name));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const file of supportedFiles) {
    const fullPath = join(WRITINGS_DIR, file);
    const name = file.replace(/\.[^.]+$/, "");

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