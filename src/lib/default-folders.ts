import type { MatterCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * v0.8 Estructura de carpetas por defecto (según categoría del caso).
 * Se crean automáticamente al crear un Matter; isDefault=true → no se pueden eliminar, solo renombrar.
 */
export const DEFAULT_FOLDERS_BY_CATEGORY: Record<MatterCategory, readonly string[]> = {
  CIVIL_COMMERCIAL: ["01. Recepción", "02. Inicio", "03. Poderes", "04. Prueba", "05. Escritos", "06. Audiencias", "07. Sentencia", "08. Cierre"],
  LABOR_ARBITRATION: ["01. Recepción", "02. Poderes", "03. Prueba", "04. Escritos arbitrales", "05. Audiencias", "06. Laudo", "07. Litigio", "08. Cierre"],
  COMMERCIAL_ARBITRATION: ["01. Recepción", "02. Poderes", "03. Prueba", "04. Escritos arbitrales", "05. Audiencias", "06. Laudo", "07. Cierre"],
  ADMINISTRATIVE: ["01. Recepción", "02. Inicio", "03. Poderes", "04. Prueba", "05. Escritos", "06. Audiencias", "07. Sentencia", "08. Cierre"],
  ADMINISTRATIVE_CLAIM: ["01. Recepción", "02. Reclamo presentado", "03. Seguimiento", "04. Resolución", "05. Cierre"],
  CRIMINAL: ["01. Recepción", "02. Poderes", "03. Expediente", "04. Entrevistas", "05. Prueba", "06. Preparación", "07. Juicio oral", "08. Sentencia y apelación", "09. Cierre"],
  NON_LITIGATION: ["01. Inicio", "02. Investigación", "03. Borradores", "04. Entregables", "05. Archivo"],
  LEGAL_COUNSEL: ["01. Inicio", "02. Investigación", "03. Borradores", "04. Entregables", "05. Archivo"],
  SPECIAL_PROJECT: ["01. Inicio", "02. Investigación", "03. Borradores", "04. Entregables", "05. Archivo"]
} as const;

/**
 * Crea las carpetas por defecto de un Matter nuevo dentro de una transacción.
 * El llamador provee `tx`; esta función solo escribe en BD, sin validar permisos.
 */
export async function seedDefaultFolders(
  tx: Prisma.TransactionClient,
  matterId: string,
  category: MatterCategory
) {
  const names = DEFAULT_FOLDERS_BY_CATEGORY[category];
  if (!names || names.length === 0) return;
  await tx.documentFolder.createMany({
    data: names.map((name, i) => ({
      matterId,
      name,
      orderIndex: i,
      isDefault: true
    }))
  });
}

/**
 * Sugiere la carpeta destino por defecto según la categoría de la plantilla
 * (usado al crear un documento "desde plantilla").
 * Devuelve null cuando no hay una carpeta clara, para que el usuario elija manualmente.
 */
export function suggestFolderByTemplateCategory(
  templateCategory: string,
  matterCategory: MatterCategory
): string | null {
  const isLitigation =
    matterCategory === "CIVIL_COMMERCIAL" ||
    matterCategory === "ADMINISTRATIVE" ||
    matterCategory === "CRIMINAL";

  const mapLitigation: Record<string, string> = {
    INTAKE: "01. Recepción",
    RETAINER: "03. Poderes",
    LITIGATION: matterCategory === "CRIMINAL" ? "06. Preparación" : "05. Escritos",
    HEARING: "06. Audiencias",
    WORK_PRODUCT: matterCategory === "CRIMINAL" ? "05. Prueba" : "04. Prueba",
    ARCHIVE: matterCategory === "CRIMINAL" ? "09. Cierre" : "08. Cierre",
    CLOSING: matterCategory === "CRIMINAL" ? "09. Cierre" : "08. Cierre",
    BLANK: "01. Recepción"
  };

  const mapNonLitigation: Record<string, string> = {
    INTAKE: "01. Inicio",
    RETAINER: "01. Inicio",
    LITIGATION: "04. Entregables",
    HEARING: "03. Borradores",
    WORK_PRODUCT: "04. Entregables",
    ARCHIVE: "05. Archivo",
    CLOSING: "05. Archivo",
    BLANK: "03. Borradores"
  };

  const map = isLitigation ? mapLitigation : mapNonLitigation;
  return map[templateCategory] ?? null;
}
