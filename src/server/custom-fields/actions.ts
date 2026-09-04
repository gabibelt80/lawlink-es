"use server";

/**
 * v0.28: Campos personalizados (esquema JSON)
 * - Definiciones en CustomFieldDef, administracion limitada a ADMIN
 * - Valores en el JSON customValues de la entidad
 */
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CustomFieldEntity } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { revalidateMatter } from "@/server/matters/route";

const entitySchema = z.enum(["MATTER", "CLIENT"]);
const typeSchema = z.enum(["TEXT", "NUMBER", "DATE", "SELECT"]);

const defCreateSchema = z.object({
  entityType: entitySchema,
  label: z.string().min(1, "El nombre del campo es obligatorio").max(40),
  fieldType: typeSchema.default("TEXT"),
  options: z.array(z.string().min(1).max(40)).max(50).default([]),
  required: z.boolean().default(false),
});

const defUpdateSchema = defCreateSchema.partial().extend({
  id: z.string().cuid(),
});

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error(
      "Solo el Administrador puede administrar campos personalizados",
    );
  }
  return session;
}

/** Lista definiciones de campos de una entidad */
export async function listCustomFieldDefs(
  entityType: CustomFieldEntity,
  onlyEnabled = false,
) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.customFieldDef.findMany({
    where: { entityType, ...(onlyEnabled ? { enabled: true } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCustomFieldDef(
  input: z.input<typeof defCreateSchema>,
) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  const data = defCreateSchema.parse(input);
  if (data.fieldType === "SELECT" && data.options.length === 0) {
    throw new Error("El tipo desplegable necesita al menos una opcion");
  }
  const max = await prisma.customFieldDef.aggregate({
    where: { entityType: data.entityType },
    _max: { order: true },
  });
  const def = await prisma.customFieldDef.create({
    data: {
      entityType: data.entityType,
      key: `cf_${randomUUID().slice(0, 8)}`,
      label: data.label,
      fieldType: data.fieldType,
      options: data.fieldType === "SELECT" ? data.options : [],
      required: data.required,
      order: (max._max.order ?? 0) + 1,
    },
  });
  await audit({
    userId: session.user.id,
    action: "CUSTOM_FIELD_CREATE",
    targetType: "CustomFieldDef",
    targetId: def.id,
    detail: { label: def.label },
  });
  revalidatePath("/settings/custom-fields");
  return { ok: true as const, id: def.id };
}

export async function updateCustomFieldDef(
  input: z.input<typeof defUpdateSchema>,
) {
  const prisma = await getTenantPrisma();
  await requireAdmin();
  const { id, ...rest } = defUpdateSchema.parse(input);
  if (
    rest.fieldType === "SELECT" &&
    rest.options &&
    rest.options.length === 0
  ) {
    throw new Error("El tipo desplegable necesita al menos una opcion");
  }
  await prisma.customFieldDef.update({
    where: { id },
    data: {
      ...(rest.label !== undefined ? { label: rest.label } : {}),
      ...(rest.fieldType !== undefined ? { fieldType: rest.fieldType } : {}),
      ...(rest.options !== undefined ? { options: rest.options } : {}),
      ...(rest.required !== undefined ? { required: rest.required } : {}),
    },
  });
  await audit({
    action: "CUSTOM_FIELD_UPDATE",
    targetType: "CustomFieldDef",
    targetId: id,
  });
  revalidatePath("/settings/custom-fields");
  return { ok: true as const };
}

export async function toggleCustomFieldDef(id: string, enabled: boolean) {
  const prisma = await getTenantPrisma();
  await requireAdmin();
  await prisma.customFieldDef.update({ where: { id }, data: { enabled } });
  revalidatePath("/settings/custom-fields");
  return { ok: true as const };
}

export async function deleteCustomFieldDef(id: string) {
  const prisma = await getTenantPrisma();
  await requireAdmin();
  await prisma.customFieldDef.delete({ where: { id } });
  await audit({
    action: "CUSTOM_FIELD_DELETE",
    targetType: "CustomFieldDef",
    targetId: id,
  });
  revalidatePath("/settings/custom-fields");
  return { ok: true as const };
}

/** Guarda valores de campos personalizados del Caso */
export async function saveMatterCustomValues(
  matterId: string,
  values: Record<string, string>,
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertMatterWritable(matterId);
  await assertCanLeadMatter(
    session.user.id,
    matterId,
    "Solo el responsable/co-responsable puede editar",
  );

  // Solo conserva claves de campos habilitados
  const defs = await prisma.customFieldDef.findMany({
    where: { entityType: "MATTER", enabled: true },
    select: { key: true, label: true, required: true },
  });
  const clean: Record<string, string> = {};
  for (const d of defs) {
    const v = values[d.key];
    if (typeof v === "string" && v.trim() !== "") clean[d.key] = v.trim();
    if (d.required && !clean[d.key]) {
      throw new Error(`"${d.label}" es obligatorio`);
    }
  }

  await prisma.matter.update({
    where: { id: matterId },
    data: { customValues: clean },
  });
  await audit({
    userId: session.user.id,
    action: "MATTER_CUSTOM_VALUES",
    targetType: "Matter",
    targetId: matterId,
  });
  await revalidateMatter(matterId);
  return { ok: true as const };
}