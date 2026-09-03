/**
 * v0.42 Lote F: GeneraciÃ³n de plantilla xlsx para importaciÃ³n masiva de casos.
 * Fila 1 encabezados (obligatorios con *), fila 2 ejemplo, otra hoja con instrucciones.
 */
import ExcelJS from "exceljs";

import { IMPORT_COLUMNS } from "@/lib/imports/matter-import";

export const IMPORT_SHEET_NAME = "ImportaciÃ³n de casos";

const EXAMPLE: Record<string, string> = {
  clientName: "Juan PÃ©rez",
  clientIdNumber: "20123456789",
  clientType: "Persona fÃ­sica",
  opposingName: "TecnologÃ­a Ejemplo S.A.",
  opposingIdNumber: "30-71234567-8",
  opposingType: "Empresa",
  category: "Litigio civil y comercial",
  status: "En trÃ¡mite",
  ownerEmail: "abogado@ejemplo.com",
  intakeDate: "2026-05-30",
  cause: "Conflicto de compraventa",
  claimAmount: "120000",
  clientPhone: "1151234567",
  jurisdiction: "Ciudad AutÃ³noma de Buenos Aires"
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
    { header: "DescripciÃ³n", key: "d", width: 60 }
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRow({ h: "Columnas obligatorias", d: "Las que tienen * en el encabezado son obligatorias: nombre/documento del cliente, nombre/documento de la contraparte, tipo de caso, estado del caso" });
  for (const c of IMPORT_COLUMNS) {
    if (c.hint) notes.addRow({ h: c.header, d: c.hint });
  }
  notes.addRow({ h: "Primer procedimiento", d: "Los casos Â«En trÃ¡miteÂ» generan automÃ¡ticamente el primer procedimiento segÃºn el tipo (litigio â†’ primera instancia; otros â†’ etapa no contenciosa/arbitraje); los cerrados/archivados no crean procedimiento" });
  notes.addRow({ h: "Conflicto de intereses", d: "El nombre y documento del cliente y la contraparte se guardan en la base de partes, y despuÃ©s de importar ya pueden ser detectados por la bÃºsqueda de conflictos" });
  notes.addRow({ h: "Fila de ejemplo", d: "La fila 2 es un ejemplo; eliminÃ¡la o sobrescribila antes de la importaciÃ³n real" });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

