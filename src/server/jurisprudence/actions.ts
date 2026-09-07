"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";

const jurisprudenceSchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().optional(),
  fullText: z.string().min(1),
  court: z.string().optional(),
  jurisdiction: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function listJurisprudence() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.jurisprudence.findMany({
    orderBy: { date: "desc" },
  });
}

export async function createJurisprudence(input: z.infer<typeof jurisprudenceSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = jurisprudenceSchema.parse(input);
  
  const created = await prisma.jurisprudence.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date) : null,
      createdById: session.user.id,
    },
  });
  
  revalidatePath("/jurisprudence");
  return { ok: true, id: created.id };
}

export async function deleteJurisprudence(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  await prisma.jurisprudence.delete({ where: { id } });
  revalidatePath("/jurisprudence");
  return { ok: true };
}