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