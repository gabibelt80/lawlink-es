const { readFileSync } = require("fs");

async function checkPdf(filePath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ");
  }
  console.log(`Archivo: ${filePath}`);
  console.log(`Paginas: ${doc.numPages}`);
  console.log(`Tiene texto: ${text.trim().length > 0 ? "SI" : "NO (escaneado)"}`);
  if (text.trim().length > 0) {
    console.log(`Primeras 100 caracteres: ${text.substring(0, 100)}`);
  }
}

checkPdf(process.argv[2]).catch(e => console.error(e));