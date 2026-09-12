import { requireSession } from "@/lib/auth/session";
import { getModulesForCurrentFirm } from "@/server/settings/modules-actions";
import type { ModuleKey } from "@/lib/modules";

/**
 * Verifica si el estudio del usuario en sesión tiene activado el módulo.
 * SYSTEM_ADMIN tiene acceso a todo.
 */
export async function hasModule(module: ModuleKey): Promise<boolean> {
  const session = await requireSession();
  if (session.user.role === "SYSTEM_ADMIN") return true;
  const mods = await getModulesForCurrentFirm();
  return mods.includes(module);
}

/**
 * Igual que hasModule, pero tira error si no está habilitado.
 * Usar al principio de server actions.
 */
export async function requireModule(module: ModuleKey): Promise<void> {
  const ok = await hasModule(module);
  if (!ok) {
    throw new Error("El módulo no está contratado para este estudio");
  }
}