"use server";

/**
 * v0.28: è‡ªå®šä¹‰å­—æ®µï¼ˆJSON åˆ—æ–¹æ¡ˆï¼‰
 * - å­—æ®µå®šä¹‰å­˜ CustomFieldDef è¡¨ï¼ŒAdministraré™ ADMIN
 * - å­—æ®µå€¼å­˜äºŽå®žä½“çš„ customValues JSONï¼ˆæœ¬æœŸè½åœ° MATTERï¼‰
 */
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CustomFieldEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

/** åˆ—å‡ºæŸå®žä½“çš„å­—æ®µå®šä¹‰ï¼ˆadmin è§†å›¾å«DeshabilitarÃ­temsï¼›onlyEnabled=true ç”¨äºŽè¡¨å•æ¸²æŸ“ï¼‰ */
export async function listCustomFieldDefs(
  entityType: CustomFieldEntity,
  onlyEnabled = false,
) {
  await requireSession();
  return prisma.customFieldDef.findMany({
    where: { entityType, ...(onlyEnabled ? { enabled: true } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCustomFieldDef(
  input: z.input<typeof defCreateSchema>,
) {
  const session = await requireAdmin();
  const data = defCreateSchema.parse(input);
  if (data.fieldType === "SELECT" && data.options.length === 0) {
    throw new Error("ä¸‹æ‹‰ç±»åž‹è‡³å°‘éœ€è¦ä¸€ä¸ªé€‰Ã­temså€¼");
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
  await requireAdmin();
  const { id, ...rest } = defUpdateSchema.parse(input);
  if (
    rest.fieldType === "SELECT" &&
    rest.options &&
    rest.options.length === 0
  ) {
    throw new Error("ä¸‹æ‹‰ç±»åž‹è‡³å°‘éœ€è¦ä¸€ä¸ªé€‰Ã­temså€¼");
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
  await requireAdmin();
  await prisma.customFieldDef.update({ where: { id }, data: { enabled } });
  revalidatePath("/settings/custom-fields");
  return { ok: true as const };
}

export async function deleteCustomFieldDef(id: string) {
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

/** GuardarCasoçš„è‡ªå®šä¹‰å­—æ®µå€¼ */
export async function saveMatterCustomValues(
  matterId: string,
  values: Record<string, string>,
) {
  const session = await requireSession();
  await assertMatterWritable(matterId);
  await assertCanLeadMatter(
    session.user.id,
    matterId,
    "ä»…Casoä¸»åŠž/ååŠžå¯Editar",
  );

  // ä»…ä¿ç•™å½“å‰å·²å¯ç”¨å­—æ®µå®šä¹‰çš„é”®ï¼Œé¿å…è„æ•°æ®
  const defs = await prisma.customFieldDef.findMany({
    where: { entityType: "MATTER", enabled: true },
    select: { key: true, label: true, required: true },
  });
  const clean: Record<string, string> = {};
  for (const d of defs) {
    const v = values[d.key];
    if (typeof v === "string" && v.trim() !== "") clean[d.key] = v.trim();
    if (d.required && !clean[d.key]) {
      throw new Error(`ã€Œ${d.label}ã€ä¸ºå¿…å¡«Ã­tems`);
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


