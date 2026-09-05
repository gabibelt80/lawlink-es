import { revalidatePath } from "next/cache";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { matterHref, normalizeMatterParam } from "@/lib/matters/route";

/**
 * Resuelve el parametro de la URL del detalle del Caso.
 * Coincide tanto por internalCode como por id (cuid).
 */
export async function resolveMatterRoute(
  param: string
): Promise<{ id: string; internalCode: string } | null> {
  const prisma = await getTenantPrisma();
  const normalized = normalizeMatterParam(param);

  const matter = await prisma.matter.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: param }, { internalCode: normalized }]
    },
    select: { id: true, internalCode: true }
  });

  return matter;
}

/**
 * Obtiene la URL del detalle del Caso a partir del matterId.
 */
export async function matterHrefById(matterId: string): Promise<string> {
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true }
  });
  return matterHref({ id: matterId, internalCode: matter?.internalCode ?? null });
}

/**
 * Invalida la cache de la pagina del detalle del Caso.
 */
export async function revalidateMatter(matterId: string | null | undefined): Promise<void> {
  if (!matterId) return;

  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true }
  });
  if (!matter) return;

  revalidatePath(`/matters/${encodeURIComponent(matter.internalCode)}`);
}