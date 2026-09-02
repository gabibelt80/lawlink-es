import { getTenantPrisma } from "@/lib/tenant";

async function main() {
  const prisma = getTenantPrisma("juridictas");

  const causes = [
    { category: "CIVIL_COMMERCIAL", code: "CC-1", name: "Contratos", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-1", name: "Compraventa", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-2", name: "Locación", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-3", name: "Obra y servicios", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-4", name: "Mutuo", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-5", name: "Comodato", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-6", name: "Donación", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-7", name: "Fianza", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-8", name: "Leasing", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-1-9", name: "Franquicia", level: 2, parentCode: "CC-1" },
    { category: "CIVIL_COMMERCIAL", code: "CC-2", name: "Responsabilidad civil", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-2-1", name: "Daños y perjuicios", level: 2, parentCode: "CC-2" },
    { category: "CIVIL_COMMERCIAL", code: "CC-2-2", name: "Mala praxis", level: 2, parentCode: "CC-2" },
    { category: "CIVIL_COMMERCIAL", code: "CC-2-3", name: "Accidentes de tránsito", level: 2, parentCode: "CC-2" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3", name: "Derechos reales", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-1", name: "Posesión", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-2", name: "Propiedad", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-3", name: "Condominio", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-4", name: "Usucapión", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-5", name: "Servidumbres", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-6", name: "Hipoteca", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-3-7", name: "Prenda", level: 2, parentCode: "CC-3" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4", name: "Familia", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-1", name: "Divorcio", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-2", name: "Alimentos", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-3", name: "Régimen de visitas", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-4", name: "Filiación", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-5", name: "Adopción", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-4-6", name: "Sucesiones", level: 2, parentCode: "CC-4" },
    { category: "CIVIL_COMMERCIAL", code: "CC-5", name: "Consumidor", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-5-1", name: "Relación de consumo", level: 2, parentCode: "CC-5" },
    { category: "CIVIL_COMMERCIAL", code: "CC-5-2", name: "Defensa del consumidor", level: 2, parentCode: "CC-5" },
    { category: "CIVIL_COMMERCIAL", code: "CC-6", name: "Concursos y quiebras", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-6-1", name: "Pedido de quiebra", level: 2, parentCode: "CC-6" },
    { category: "CIVIL_COMMERCIAL", code: "CC-6-2", name: "Concurso preventivo", level: 2, parentCode: "CC-6" },
    { category: "CIVIL_COMMERCIAL", code: "CC-6-3", name: "Verificación de créditos", level: 2, parentCode: "CC-6" },
    { category: "CIVIL_COMMERCIAL", code: "CC-7", name: "Societario", level: 1 },
    { category: "CIVIL_COMMERCIAL", code: "CC-7-1", name: "Conflictos societarios", level: 2, parentCode: "CC-7" },
    { category: "CIVIL_COMMERCIAL", code: "CC-7-2", name: "Impugnación de asambleas", level: 2, parentCode: "CC-7" },
    { category: "CIVIL_COMMERCIAL", code: "CC-7-3", name: "Rendición de cuentas", level: 2, parentCode: "CC-7" },
    { category: "LABOR_ARBITRATION", code: "LA-1", name: "Contrato de trabajo", level: 1 },
    { category: "LABOR_ARBITRATION", code: "LA-1-1", name: "Despido sin causa", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-2", name: "Despido con causa", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-3", name: "Diferencias salariales", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-4", name: "Horas extras", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-5", name: "Accidente de trabajo", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-6", name: "Enfermedad profesional", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-7", name: "Trabajo no registrado", level: 2, parentCode: "LA-1" },
    { category: "LABOR_ARBITRATION", code: "LA-1-8", name: "Reincorporación", level: 2, parentCode: "LA-1" },
    { category: "CRIMINAL", code: "CR-1", name: "Contra las personas", level: 1 },
    { category: "CRIMINAL", code: "CR-1-1", name: "Homicidio", level: 2, parentCode: "CR-1" },
    { category: "CRIMINAL", code: "CR-1-2", name: "Lesiones", level: 2, parentCode: "CR-1" },
    { category: "CRIMINAL", code: "CR-1-3", name: "Abuso sexual", level: 2, parentCode: "CR-1" },
    { category: "CRIMINAL", code: "CR-2", name: "Contra la propiedad", level: 1 },
    { category: "CRIMINAL", code: "CR-2-1", name: "Hurto", level: 2, parentCode: "CR-2" },
    { category: "CRIMINAL", code: "CR-2-2", name: "Robo", level: 2, parentCode: "CR-2" },
    { category: "CRIMINAL", code: "CR-2-3", name: "Estafa", level: 2, parentCode: "CR-2" },
    { category: "CRIMINAL", code: "CR-2-4", name: "Defraudación", level: 2, parentCode: "CR-2" },
    { category: "CRIMINAL", code: "CR-2-5", name: "Usurpación", level: 2, parentCode: "CR-2" },
    { category: "CRIMINAL", code: "CR-3", name: "Contra la administración pública", level: 1 },
    { category: "CRIMINAL", code: "CR-3-1", name: "Cohecho", level: 2, parentCode: "CR-3" },
    { category: "CRIMINAL", code: "CR-3-2", name: "Malversación", level: 2, parentCode: "CR-3" },
    { category: "CRIMINAL", code: "CR-3-3", name: "Enriquecimiento ilícito", level: 2, parentCode: "CR-3" },
    { category: "CRIMINAL", code: "CR-4", name: "Drogas", level: 1 },
    { category: "CRIMINAL", code: "CR-4-1", name: "Tenencia", level: 2, parentCode: "CR-4" },
    { category: "CRIMINAL", code: "CR-4-2", name: "Tráfico", level: 2, parentCode: "CR-4" },
    { category: "CRIMINAL", code: "CR-5", name: "Ambientales", level: 1 },
    { category: "CRIMINAL", code: "CR-5-1", name: "Contaminación", level: 2, parentCode: "CR-5" },
    { category: "CRIMINAL", code: "CR-5-2", name: "Fauna protegida", level: 2, parentCode: "CR-5" },
  ];

  let created = 0;
  const parentMap = new Map<string, string>();

  for (const c of causes.filter((x) => x.level === 1)) {
    const existing = await prisma.causeOfAction.findFirst({
      where: { category: c.category as any, code: c.code },
    });
    if (existing) {
      parentMap.set(c.code, existing.id);
      continue;
    }
    const createdCause = await prisma.causeOfAction.create({
      data: {
        category: c.category as any,
        code: c.code,
        name: c.name,
        level: 1,
        parentId: null,
        keywords: [] as any,
      },
    });
    parentMap.set(c.code, createdCause.id);
    created++;
  }

  for (const c of causes.filter((x) => x.level === 2)) {
    const parentId = parentMap.get(c.parentCode || "");
    const existing = await prisma.causeOfAction.findFirst({
      where: { category: c.category as any, code: c.code },
    });
    if (existing) continue;
    await prisma.causeOfAction.create({
      data: {
        category: c.category as any,
        code: c.code,
        name: c.name,
        level: 2,
        parentId,
        keywords: [] as any,
      },
    });
    created++;
  }

  console.log(`Causas creadas: ${created}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });