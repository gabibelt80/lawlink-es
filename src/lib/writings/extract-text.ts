import { readFileSync } from "node:fs";
import { extname } from "node:path";

export async function extractTextFromFile(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();

  if (ext === ".txt") {
    const text = readFileSync(path, "utf-8");
    return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ path });
    return result.value;
  }

  if (ext === ".rtf") {
    try {
      const rtfParser = await import("rtf-parser");
      const rtfText = readFileSync(path, "utf-8");
      const doc = await new Promise<unknown>((resolve, reject) => {
        rtfParser.default.string(rtfText, (err: Error | null, doc: unknown) => {
          if (err) reject(err);
          else resolve(doc);
        });
      });
      const text = extractRtfText(doc as RtfNode);
      return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    } catch (err) {
      console.error(`RTF parse error: ${path}`, err);
      return `<p>[No se pudo leer RTF: ${path.split(/[\\/]/).pop()}]</p>`;
    }
  }

  if (ext === ".pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(readFileSync(path));
      const doc = await pdfjs.getDocument({ data, useWorkerFetch: false } as never).promise;
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str ?? "" : ""))
          .join(" ");
        text += pageText + "\n\n";
      }
      return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    } catch (err) {
      console.error(`PDF error: ${path}`, err);
      return `<p>[No se pudo leer PDF: ${path.split(/[\\/]/).pop()}]</p>`;
    }
  }

  if (ext === ".doc") {
    return `<p>[Archivo .doc - requiere conversion manual a .docx]</p>`;
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const e = ext.toLowerCase().replace(/^\./, "");

  if (e === "txt") {
    const text = buffer.toString("utf-8");
    return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
  }

  if (e === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    return result.value;
  }

  if (e === "rtf") {
    try {
      const rtfParser = await import("rtf-parser");
      const rtfText = buffer.toString("utf-8");
      const doc = await new Promise<unknown>((resolve, reject) => {
        rtfParser.default.string(rtfText, (err: Error | null, doc: unknown) => {
          if (err) reject(err);
          else resolve(doc);
        });
      });
      const text = extractRtfText(doc as RtfNode);
      return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    } catch (err) {
      console.error(`RTF parse error from buffer`, err);
      return `<p>[No se pudo leer RTF]</p>`;
    }
  }

  if (e === "pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(buffer);
      const doc = await pdfjs.getDocument({ data, useWorkerFetch: false } as never).promise;
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str ?? "" : ""))
          .join(" ");
        text += pageText + "\n\n";
      }
      return `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    } catch (err) {
      console.error(`PDF error from buffer`, err);
      return `<p>[No se pudo leer PDF]</p>`;
    }
  }

  if (e === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    let text = "";
    wb.eachSheet((sheet) => {
      text += `<h3>${sheet.name}</h3>`;
      sheet.eachRow((row) => {
        const values = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
        text += `<p>${values.join("\t")}</p>`;
      });
    });
    return text;
  }

  throw new Error(`Formato no soportado: ${e}`);
}

type RtfNode = {
  content?: RtfNode[];
  value?: string;
};

function extractRtfText(node: RtfNode): string {
  if (!node) return "";
  if (node.value) return node.value;
  if (node.content) return node.content.map(extractRtfText).join("");
  return "";
}

export function getFileExtension(path: string): string {
  return extname(path).toLowerCase().replace(".", "");
}
