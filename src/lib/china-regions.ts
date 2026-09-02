// v0.30 Datos de jurisdicciones de Argentina + generación de organismos de resolución de disputas
// Datos basados en provincias argentinas y sus departamentos/partidos

import type { ProcedureType } from "@prisma/client";

// Datos de Argentina: provincias y sus departamentos/partidos principales
// Fuente: INDEC - División Político Territorial de la República Argentina
const ARGENTINA_DATA: Record<string, Record<string, string[]>> = {
  "Buenos Aires": {
    "La Plata": ["La Plata", "Berisso", "Ensenada"],
    "Mar del Plata": ["Mar del Plata", "General Pueyrredón"],
    "Bahía Blanca": ["Bahía Blanca"],
    "Tandil": ["Tandil"],
    "Olavarría": ["Olavarría"],
    "Junín": ["Junín"],
    "Pergamino": ["Pergamino"],
    "Campana": ["Campana"],
    "San Nicolás": ["San Nicolás"],
    "Zárate": ["Zárate"],
    "Mercedes": ["Mercedes"],
    "Luján": ["Luján"],
    "San Isidro": ["San Isidro"],
    "Vicente López": ["Vicente López"],
    "Morón": ["Morón"],
    "Lanús": ["Lanús"],
    "Quilmes": ["Quilmes"],
    "Avellaneda": ["Avellaneda"],
    "Lomas de Zamora": ["Lomas de Zamora"],
    "Almirante Brown": ["Almirante Brown"],
    "Florencio Varela": ["Florencio Varela"],
    "Berazategui": ["Berazategui"]
  },
  "Ciudad Autónoma de Buenos Aires": {
    "CABA": ["Comuna 1", "Comuna 2", "Comuna 3", "Comuna 4", "Comuna 5", "Comuna 6", "Comuna 7", "Comuna 8", "Comuna 9", "Comuna 10", "Comuna 11", "Comuna 12", "Comuna 13", "Comuna 14", "Comuna 15"]
  },
  "Catamarca": {
    "San Fernando del Valle de Catamarca": ["San Fernando del Valle de Catamarca"]
  },
  "Chaco": {
    "Resistencia": ["Resistencia"]
  },
  "Chubut": {
    "Rawson": ["Rawson"],
    "Comodoro Rivadavia": ["Comodoro Rivadavia"],
    "Trelew": ["Trelew"]
  },
  "Córdoba": {
    "Córdoba": ["Córdoba", "Villa Carlos Paz"],
    "Río Cuarto": ["Río Cuarto"],
    "Villa María": ["Villa María"]
  },
  "Corrientes": {
    "Corrientes": ["Corrientes"]
  },
  "Entre Ríos": {
    "Paraná": ["Paraná"],
    "Concordia": ["Concordia"],
    "Gualeguaychú": ["Gualeguaychú"]
  },
  "Formosa": {
    "Formosa": ["Formosa"]
  },
  "Jujuy": {
    "San Salvador de Jujuy": ["San Salvador de Jujuy"]
  },
  "La Pampa": {
    "Santa Rosa": ["Santa Rosa"]
  },
  "La Rioja": {
    "La Rioja": ["La Rioja"]
  },
  "Mendoza": {
    "Mendoza": ["Mendoza", "Godoy Cruz", "Guaymallén", "Las Heras", "Luján de Cuyo"]
  },
  "Misiones": {
    "Posadas": ["Posadas"],
    "Oberá": ["Oberá"]
  },
  "Neuquén": {
    "Neuquén": ["Neuquén"]
  },
  "Río Negro": {
    "Viedma": ["Viedma"],
    "San Carlos de Bariloche": ["San Carlos de Bariloche"],
    "General Roca": ["General Roca"]
  },
  "Salta": {
    "Salta": ["Salta"]
  },
  "San Juan": {
    "San Juan": ["San Juan"]
  },
  "San Luis": {
    "San Luis": ["San Luis"]
  },
  "Santa Cruz": {
    "Río Gallegos": ["Río Gallegos"]
  },
  "Santa Fe": {
    "Santa Fe": ["Santa Fe"],
    "Rosario": ["Rosario"],
    "Rafaela": ["Rafaela"]
  },
  "Santiago del Estero": {
    "Santiago del Estero": ["Santiago del Estero"]
  },
  "Tierra del Fuego": {
    "Ushuaia": ["Ushuaia"],
    "Río Grande": ["Río Grande"]
  },
  "Tucumán": {
    "San Miguel de Tucumán": ["San Miguel de Tucumán"]
  }
};

const DATA = ARGENTINA_DATA;

export const NATIONAL_AGENCY_OPTIONS = ["Corte Suprema de Justicia de la Nación"] as const;

export const provinces: string[] = Object.keys(DATA);

export function citiesOf(province: string): string[] {
  return province && DATA[province] ? Object.keys(DATA[province]) : [];
}

export function areasOf(province: string, city: string): string[] {
  return province && city && DATA[province]?.[city] ? DATA[province][city] : [];
}

/** Serializar jurisdicción: provincia/ciudad/departamento (departamento opcional). */
export function joinJurisdiction(province?: string, city?: string, area?: string): string {
  return [province, city, area].filter(Boolean).join("/");
}

export function parseJurisdiction(value?: string | null): {
  province: string;
  city: string;
  area: string;
} {
  const [province = "", city = "", area = ""] = (value ?? "").split("/");
  return { province, city, area };
}

export function isNationalAgency(value?: string | null): boolean {
  const agency = value?.trim();
  return NATIONAL_AGENCY_OPTIONS.some((item) => item === agency);
}

export function isCourtAgency(value?: string | null): boolean {
  const agency = value?.trim();
  return Boolean(agency && /Tribunal|Juzgado|Corte/.test(agency));
}

export function isCommercialArbitrationProcedure(type?: ProcedureType | null): boolean {
  return type === "COMMERCIAL_ARBITRATION";
}

export function isAgencyAllowedForProcedure(
  agency?: string | null,
  procedureType?: ProcedureType | null
): boolean {
  if (!agency?.trim()) return true;
  if (isCommercialArbitrationProcedure(procedureType)) return !isCourtAgency(agency);
  return true;
}

export function assertAgencyAllowedForProcedure(
  agency?: string | null,
  procedureType?: ProcedureType | null
) {
  if (!isAgencyAllowedForProcedure(agency, procedureType)) {
    throw new Error("El organismo jurisdiccional para procedimientos de arbitraje comercial debe ser un tribunal arbitral, no un tribunal judicial.");
  }
}

export function normalizeJurisdictionForAgency(
  agency?: string | null,
  jurisdiction?: string | null
): string | null {
  if (isNationalAgency(agency)) return null;
  return jurisdiction?.trim() || null;
}

function effectiveCityName(province: string, city: string): string {
  if (!city || city === "Departamento" || city === "Partido") return province;
  return city;
}

function arbitrationCityName(cityName: string): string {
  return cityName.replace(/(Ciudad|Autónoma|Federal|Capital|Provincia)$/, "").trim();
}

/**
 * Generar opciones de organismos según jurisdicción:
 * - Sin jurisdicción seleccionada: organismos nacionales
 * - Con departamento/partido seleccionado: Juzgado local + Tribunal departamental + Tribunal provincial
 * - Solo ciudad: Tribunal departamental + Juzgados locales + Tribunal provincial
 */
export function agencyOptions(value?: string | null): string[] {
  const { province, city, area } = parseJurisdiction(value);
  if (!province) return [...NATIONAL_AGENCY_OPTIONS];
  const cityName = effectiveCityName(province, city);
  const out: string[] = [];

  if (area) {
    out.push(`Juzgado de Primera Instancia de ${area}`);
    out.push(`Tribunal de Apelaciones de ${cityName}`);
  } else if (city) {
    out.push(`Tribunal de Apelaciones de ${cityName}`);
    for (const a of areasOf(province, city)) out.push(`Juzgado de Primera Instancia de ${a}`);
  }
  out.push(`Tribunal Superior de Justicia de ${province}`);
  out.push(...NATIONAL_AGENCY_OPTIONS);
  out.push(`Tribunal Arbitral de ${arbitrationCityName(cityName) || province}`);

  return Array.from(new Set(out.filter(Boolean)));
}

export function agencyOptionsForProcedure(
  value?: string | null,
  procedureType?: ProcedureType | null
): string[] {
  const options = agencyOptions(value);
  if (isCommercialArbitrationProcedure(procedureType)) {
    return options.filter((agency) => !isCourtAgency(agency));
  }
  return options;
}