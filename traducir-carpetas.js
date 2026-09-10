import { getTenantPrismaSync } from "./src/lib/tenant-prisma.js";

const TRADUCCIONES = {
  '收案': '01. Recepción',
  '立案': '02. Inicio',
  '委托手续': '03. Poderes',
  '证据': '04. Prueba',
  '程序文书': '05. Escritos',
  '庭审': '06. Audiencias',
  '裁判': '07. Sentencia',
  '结案': '08. Cierre',
  '仲裁文书': '04. Escritos arbitrales',
  '开庭': '05. Audiencias',
  '裁决': '06. Laudo',
  '诉讼': '07. Litigio',
  '阅卷': '03. Expediente',
  '会见': '04. Entrevistas',
  '取证': '05. Prueba',
  '庭前': '06. Preparación',
  '判决与上诉': '08. Sentencia y apelación',
  '立项': '01. Inicio',
  '调研': '02. Investigación',
  '工作底稿': '03. Borradores',
  '出具文件': '04. Entregables',
  '归档': '05. Archivo',
};

async function main() {
  const tenant = getTenantPrismaSync('juridictas');
  const folders = await tenant.documentFolder.findMany();
  console.log('Carpetas totales:', folders.length);
  
  let traducidas = 0;
  for (const f of folders) {
    const traduccion = TRADUCCIONES[f.name];
    if (traduccion) {
      await tenant.documentFolder.update({
        where: { id: f.id },
        data: { name: traduccion },
      });
      console.log('✓', f.name, '→', traduccion);
      traducidas++;
    }
  }
  console.log('\nTotal traducidas:', traducidas);
  await tenant.$disconnect();
}
main().catch(console.error);
