import { readFileSync } from "node:fs";
import { extname } from "node:path";

export async function extractTextFromFile(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();

  if (ext === ".txt") {
    return readFileSync(path, "utf-8");
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path });
    return result.value;
  }

  if (ext === ".pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(readFileSync(path));
      const doc = await pdfjs.getDocument({ data, useWorkerFetch: false } as any).promise;
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + "\n\n";
      }
      return text;
    } catch (err) {
      console.error(`Error al leer PDF: ${path}`, err);
      return `[No se pudo extraer texto del PDF: ${path}]`;
    }
  }

  if (ext === ".doc") {
    return `[Archivo .doc - requiere conversión con LibreOffice]\n\nArchivo: ${path}`;
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

export function getFileExtension(path: string): string {
  return extname(path).toLowerCase().replace(".", "");
}

/**
 * Extrae texto desde un Buffer (no desde un path).
 * Necesario porque el storage guarda todo como .bin sin importar el tipo real.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const e = ext.toLowerCase().replace(/^\./, "");

  if (e === "txt") {
    return buffer.toString("utf-8");
  }

  if (e === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (e === "pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(buffer);
      const doc = await pdfjs.getDocument({ data, useWorkerFetch: false } as any).promise;
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + "\n\n";
      }
      return text;
    } catch (err) {
      console.error(`Error al leer PDF:`, err);
      return `[No se pudo extraer texto del PDF]`;
    }
  }

  if (e === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    let text = "";
    wb.eachSheet((sheet) => {
      text += `## ${sheet.name}\n\n`;
      sheet.eachRow((row) => {
        const values = (row.values as any[]).slice(1).map((v) => (v == null ? "" : String(v)));
        text += values.join("\t") + "\n";
      });
      text += "\n";
    });
    return text;
  }

  throw new Error(`Formato no soportado: ${e}`);
}