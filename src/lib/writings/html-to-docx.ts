import HTMLtoDOCX from "html-to-docx";

export async function htmlToDocxBuffer(html: string, title: string): Promise<Buffer> {
  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body>${html}</body>
</html>`;

  const buffer = await HTMLtoDOCX(fullHtml, undefined, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
}