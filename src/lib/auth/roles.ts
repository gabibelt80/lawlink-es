import type { UserRole } from "@prisma/client";

/**
 * Sistema centralizado de roles y permisos.
 *
 * Niveles:
 * - SYSTEM_ADMIN: plataforma. firmId === null. Solo panel /admin.
 *                 NO opera dentro de ningun estudio.
 * - ADMIN: administrador del estudio. Acceso total al estudio.
 * - PRINCIPAL_LAWYER: abogado principal. Gerencial.
 * - LAWYER: abogado. Acceso a sus casos.
 * - ASSISTANT: asistente. Acceso limitado.
 * - FINANCE: finanzas. Acceso a finanzas.
 */

export type SessionRole = UserRole | "SYSTEM_ADMIN";

/**
 * Verifica si el rol es un rol de estudio (no sistema).
 */
export function isFirmRole(role: SessionRole | string | null | undefined): boolean {
  if (!role) return false;
  return role !== "SYSTEM_ADMIN";
}

/**
 * Verifica si el usuario es SYSTEM_ADMIN.
 * Solo si el rol es SYSTEM_ADMIN (no alcanza con firmId === null).
 */
export function isSystemAdmin(session: {
  user?: { role?: SessionRole | string | null; firmId?: string | null; isSystemAdmin?: boolean } | null;
} | null | undefined): boolean {
  if (!session?.user) return false;
  if (session.user.isSystemAdmin === true) return true;
  return session.user.role === "SYSTEM_ADMIN";
}

/**
 * Verifica si es administrador del estudio.
 * SYSTEM_ADMIN no cuenta (no opera dentro del estudio).
 */
export function isAdmin(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN";
}

/**
 * Verifica si es manager del estudio (admin o abogado principal).
 * SYSTEM_ADMIN no cuenta.
 */
export function isManager(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

/**
 * Verifica si es admin del estudio.
 */
export function isFirmAdmin(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN";
}

/**
 * Verifica si puede ver finanzas dentro del estudio.
 */
export function canViewFinance(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE";
}

/**
 * Verifica si puede gestionar usuarios del estudio.
 * Solo ADMIN.
 */
export function canManageUsers(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN";
}

/**
 * Verifica si puede gestionar la configuracion del estudio.
 * Solo ADMIN.
 */
export function canManageFirmSettings(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN";
}

/**
 * Ruta por defecto segun rol (despues del login).
 */
export function getDefaultRouteForRole(role: SessionRole | string | null | undefined): string {
  if (role === "SYSTEM_ADMIN") return "/admin";
  return "/dashboard";
}

/**
 * Ruta por defecto segun sesion.
 */
export function getDefaultRoute(session: {
  user?: { role?: SessionRole | string | null; firmId?: string | null; isSystemAdmin?: boolean } | null;
} | null | undefined): string {
  if (isSystemAdmin(session)) return "/admin";
  return "/dashboard";
}

/**
 * Verifica si el rol puede ver todos los casos del estudio.
 */
export function canViewAllMatters(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE";
}

/**
 * Verifica si el rol puede aprobar (admision, sellos, etc.).
 */
export function canApprove(role: SessionRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

/**
 * Etiqueta legible del rol.
 */
export const ROLE_LABELS: Record<SessionRole, string> = {
  SYSTEM_ADMIN: "Administrador de plataforma",
  ADMIN: "Administrador del estudio",
  PRINCIPAL_LAWYER: "Abogado principal",
  LAWYER: "Abogado",
  ASSISTANT: "Asistente",
  FINANCE: "Finanzas",
};

export function roleLabel(role: SessionRole | string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role as SessionRole] ?? role;
}
