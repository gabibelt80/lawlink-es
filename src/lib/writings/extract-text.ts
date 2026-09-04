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
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = readFileSync(path);
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (ext === ".doc") {
    // .doc requiere conversion con LibreOffice
    // Por ahora devolvemos un placeholder
    return `[Archivo .doc - requiere conversion]\n\nNombre del archivo: ${path}`;
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

export function getFileExtension(path: string): string {
  return extname(path).toLowerCase().replace(".", "");
}