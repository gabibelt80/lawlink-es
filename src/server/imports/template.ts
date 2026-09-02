/**
 * v0.42 Lote F: Generación de plantilla xlsx para importación masiva de casos.
 * Fila 1 encabezados (obligatorios con *), fila 2 ejemplo, otra hoja con instrucciones.
 */
import ExcelJS from "exceljs";

import { IMPORT_COLUMNS } from "@/lib/imports/matter-import";

export const IMPORT_SHEET_NAME = "Importación de casos";

const EXAMPLE: Record<string, string> = {
  clientName: "Juan Pérez",
  clientIdNumber: "20123456789",
  clientType: "Persona física",
  opposingName: "Tecnología Ejemplo S.A.",
  opposingIdNumber: "30-71234567-8",
  opposingType: "Empresa",
  category: "Litigio civil y comercial",
  status: "En trámite",
  ownerEmail: "abogado@ejemplo.com",
  intakeDate: "2026-05-30",
  cause: "Conflicto de compraventa",
  claimAmount: "120000",
  clientPhone: "1151234567",
  jurisdiction: "Ciudad Autónoma de Buenos Aires"
};

export async function buildMatterImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Juridictas";
  wb.created = new Date();

  const sheet = wb.addWorksheet(IMPORT_SHEET_NAME);
  sheet.columns = IMPORT_COLUMNS.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.key,
    width: Math.max(12, c.header.length * 2 + 4)
  }));

  // Estilo de encabezados: obligatorios en rojo claro, opcionales en gris claro
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  IMPORT_COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.required ? "FFFCE4E4" : "FFEFEFEF" }
    };
  });
  headerRow.height = 20;

  // Fila de ejemplo
  sheet.addRow(IMPORT_COLUMNS.reduce<Record<string, string>>((acc, c) => {
    acc[c.key] = EXAMPLE[c.key] ?? "";
    return acc;
  }, {}));

  // Hoja de instrucciones
  const notes = wb.addWorksheet("Instrucciones");
  notes.columns = [
    { header: "Columna", key: "h", width: 16 },
    { header: "Descripción", key: "d", width: 60 }
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRow({ h: "Columnas obligatorias", d: "Las que tienen * en el encabezado son obligatorias: nombre/documento del cliente, nombre/documento de la contraparte, tipo de caso, estado del caso" });
  for (const c of IMPORT_COLUMNS) {
    if (c.hint) notes.addRow({ h: c.header, d: c.hint });
  }
  notes.addRow({ h: "Primer procedimiento", d: "Los casos «En trámite» generan automáticamente el primer procedimiento según el tipo (litigio → primera instancia; otros → etapa no contenciosa/arbitraje); los cerrados/archivados no crean procedimiento" });
  notes.addRow({ h: "Conflicto de intereses", d: "El nombre y documento del cliente y la contraparte se guardan en la base de partes, y después de importar ya pueden ser detectados por la búsqueda de conflictos" });
  notes.addRow({ h: "Fila de ejemplo", d: "La fila 2 es un ejemplo; eliminála o sobrescribila antes de la importación real" });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}