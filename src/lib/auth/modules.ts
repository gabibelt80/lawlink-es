import { requireSession } from "@/lib/auth/session";
import { getModulesForCurrentFirm } from "@/server/settings/modules-actions";
import type { ModuleKey } from "@/lib/modules";

/**
 * Verifica si el estudio del usuario en sesion tiene activado el modulo.
 *
 * SYSTEM_ADMIN no pertenece a ningun estudio: no consulta modulos.
 * Si por error se llama en ese contexto, devuelve false.
 */
export async function hasModule(module: ModuleKey): Promise<boolean> {
  const session = await requireSession();
  if (session.user.isSystemAdmin) return false;
  const mods = await getModulesForCurrentFirm();
  return mods.includes(module);
}

/**
 * Igual que hasModule, pero tira error si no esta habilitado.
 * Usar al principio de server actions.
 */
export async function requireModule(module: ModuleKey): Promise<void> {
  const ok = await hasModule(module);
  if (!ok) {
    throw new Error("El modulo no esta contratado para este estudio");
  }
}

