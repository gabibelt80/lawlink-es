/**
 * v0.49 Seed de reglas de plazos legales.
 *
 * ⚠️ ADVERTENCIA IMPORTANTE:
 * Este archivo contenia reglas de plazos del sistema legal CHINO
 * (Codigo Procesal Civil de China, Ley de Arbitraje de China, etc.).
 * Esas reglas NO aplican en Argentina.
 *
 * Se neutralizo el seed para evitar que plazos incorrectos
 * aparezcan en la UI del estudio. Los plazos legales argentinos
 * deben agregarse en un commit aparte con verificacion legal.
 *
 * Mientras tanto, el seed no carga ninguna regla.
 */
import type { PrismaClient } from "@prisma/client";

export async function seedV49DeadlineRules(prisma: PrismaClient) {
  // Sin reglas para cargar por ahora.
  // Las reglas argentinas verificadas se agregaran en un commit futuro.
  void prisma;
  console.log(
    "OK v0.49 reglas de plazos: pendiente de implementar para Argentina"
  );
}