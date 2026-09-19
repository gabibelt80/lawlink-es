/**
 * Extrae paths jerarquicos del tesauro SAIJ.
 *
 * Los "descriptors" de SAIJ vienen como:
 * {
 *   descriptor: [
 *     { preferido: { termino: "Derecho civil/sucesiones/herencia" }, ... },
 *     ...
 *   ]
 * }
 *
 * Este modulo extrae:
 *   - roots:   ["Derecho civil", "Derecho laboral", ...]
 *   - paths:   ["Derecho civil/sucesiones", "Derecho civil/sucesiones/herencia", ...]
 */

export interface DescriptorExtraction {
  roots: string[];
  paths: string[];
}

export function extractDescriptorPaths(
  descriptors: unknown
): DescriptorExtraction {
  const roots = new Set<string>();
  const paths = new Set<string>();

  if (!descriptors || typeof descriptors !== "object") {
    return { roots: [], paths: [] };
  }

  const d = descriptors as { descriptor?: unknown };
  const items = Array.isArray(d.descriptor) ? d.descriptor : [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const pref = (item as { preferido?: { termino?: unknown } }).preferido;
    const termino = pref?.termino;
    if (typeof termino !== "string" || !termino.trim()) continue;

    // Normalizar
    const clean = termino.trim();
    paths.add(clean);

    // Extraer todas las sub-rutas (ancestros)
    // Ej: "A/B/C/D" -> ["A", "A/B", "A/B/C", "A/B/C/D"]
    const parts = clean.split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
      paths.add(parts.slice(0, i).join("/"));
    }

    // Root: primer nivel
    if (parts.length > 0) {
      roots.add(parts[0]);
    }
  }

  return {
    roots: Array.from(roots).sort(),
    paths: Array.from(paths).sort(),
  };
}