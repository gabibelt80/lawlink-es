import type { UserRole } from "@prisma/client";

/**
 * Sistema centralizado de roles y permisos.
 *
 * Reglas:
 * - SYSTEM_ADMIN: usuario sin firma (firmId === null). Acceso total al panel de administración.
 * - ADMIN: administrador del estudio. Acceso total al estudio.
 * - PRINCIPAL_LAWYER: abogado principal. Acceso gerencial.
 * - LAWYER: abogado a cargo. Acceso a casos asignados.
 * - ASSISTANT: asistente. Acceso limitado.
 * - FINANCE: finanzas. Acceso a finanzas y clientes.
 */

/**
 * Verifica si el rol es un rol de estudio (no sistema).
 */
export function isFirmRole(role: UserRole | string | null | undefined): boolean {
  if (!role) return false;
  return role !== "SYSTEM_ADMIN";
}

/**
 * Verifica si el usuario es SYSTEM_ADMIN.
 * El SYSTEM_ADMIN se identifica por tener firmId === null.
 */
export function isSystemAdmin(session: {
  user?: { role?: string | null; firmId?: string | null } | null;
} | null | undefined): boolean {
  if (!session?.user) return false;
  return session.user.role === "SYSTEM_ADMIN" || session.user.firmId === null;
}

/**
 * Verifica si es administrador (del sistema o del estudio).
 */
export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SYSTEM_ADMIN";
}

/**
 * Verifica si es manager (admin o abogado principal).
 */
export function isManager(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "SYSTEM_ADMIN";
}

/**
 * Verifica si es admin del estudio (no sistema).
 */
export function isFirmAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN";
}

/**
 * Verifica si puede ver finanzas.
 */
export function canViewFinance(role: UserRole | string | null | undefined): boolean {
  return (
    role === "ADMIN" ||
    role === "PRINCIPAL_LAWYER" ||
    role === "FINANCE" ||
    role === "SYSTEM_ADMIN"
  );
}

/**
 * Verifica si puede gestionar usuarios.
 */
export function canManageUsers(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "SYSTEM_ADMIN";
}

/**
 * Verifica si puede gestionar la configuración del estudio.
 */
export function canManageFirmSettings(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SYSTEM_ADMIN";
}

/**
 * Ruta por defecto según rol (después del login).
 */
export function getDefaultRouteForRole(role: UserRole | string | null | undefined): string {
  if (role === "SYSTEM_ADMIN") return "/admin";
  return "/dashboard";
}

/**
 * Ruta por defecto según sesión.
 */
export function getDefaultRoute(session: {
  user?: { role?: string | null; firmId?: string | null } | null;
} | null | undefined): string {
  if (isSystemAdmin(session)) return "/admin";
  return "/dashboard";
}

/**
 * Verifica si el rol puede ver todos los casos (sin filtro de miembro).
 */
export function canViewAllMatters(role: UserRole | string | null | undefined): boolean {
  return (
    role === "ADMIN" ||
    role === "PRINCIPAL_LAWYER" ||
    role === "FINANCE" ||
    role === "SYSTEM_ADMIN"
  );
}

/**
 * Verifica si el rol puede aprobar (admisión, sellos, etc.).
 */
export function canApprove(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "SYSTEM_ADMIN";
}

/**
 * Etiqueta legible del rol.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: "Administrador del sistema",
  ADMIN: "Administrador del estudio",
  PRINCIPAL_LAWYER: "Abogado principal",
  LAWYER: "Abogado",
  ASSISTANT: "Asistente",
  FINANCE: "Finanzas",
};

export function roleLabel(role: UserRole | string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role as UserRole] ?? role;
}
