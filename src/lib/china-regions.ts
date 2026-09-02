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
    "Berazategui": ["Berazategui"],
    "San Martín": ["San Martín"],
    "Tres de Febrero": ["Tres de Febrero"],
    "Tigre": ["Tigre"],
    "Escobar": ["Escobar"],
    "Pilar": ["Pilar"],
    "Moreno": ["Moreno"],
    "La Matanza": ["La Matanza", "San Justo", "Ramos Mejía"],
    "Merlo": ["Merlo"],
    "Ituzaingó": ["Ituzaingó"],
    "Hurlingham": ["Hurlingham"],
    "Ezeiza": ["Ezeiza"],
    "Esteban Echeverría": ["Esteban Echeverría"],
    "Presidente Perón": ["Presidente Perón"],
    "San Vicente": ["San Vicente"],
    "Cañuelas": ["Cañuelas"],
    "Lobos": ["Lobos"],
    "Chascomús": ["Chascomús"],
    "Dolores": ["Dolores"],
    "Azul": ["Azul"],
    "Necochea": ["Necochea"],
    "Tres Arroyos": ["Tres Arroyos"],
    "Coronel Rosales": ["Coronel Rosales"],
    "Patagones": ["Patagones"],
    "Chivilcoy": ["Chivilcoy"],
    "Chacabuco": ["Chacabuco"],
    "Bragado": ["Bragado"],
    "Lincoln": ["Lincoln"],
    "Pehuajó": ["Pehuajó"],
    "Trenque Lauquen": ["Trenque Lauquen"],
    "Bolívar": ["Bolívar"],
    "25 de Mayo": ["25 de Mayo"],
    "9 de Julio": ["9 de Julio"]
  },
  "Ciudad Autónoma de Buenos Aires": {
    "CABA": ["Comuna 1", "Comuna 2", "Comuna 3", "Comuna 4", "Comuna 5", "Comuna 6", "Comuna 7", "Comuna 8", "Comuna 9", "Comuna 10", "Comuna 11", "Comuna 12", "Comuna 13", "Comuna 14", "Comuna 15"]
  },
  "Catamarca": {
    "Capital": ["San Fernando del Valle de Catamarca"],
    "Valle Viejo": ["Valle Viejo"],
    "Andalgalá": ["Andalgalá"],
    "Belén": ["Belén"],
    "Tinogasta": ["Tinogasta"],
    "La Paz": ["La Paz"],
    "Santa María": ["Santa María"]
  },
  "Chaco": {
    "San Fernando": ["Resistencia", "Barranqueras"],
    "Comandante Fernández": ["Presidencia Roque Sáenz Peña"],
    "General Güemes": ["General Güemes"],
    "Libertad": ["Villa Ángela"],
    "General San Martín": ["General San Martín"],
    "Quitilipi": ["Quitilipi"],
    "Castelli": ["Castelli"]
  },
  "Chubut": {
    "Rawson": ["Rawson", "Trelew", "Puerto Madryn"],
    "Escalante": ["Comodoro Rivadavia"],
    "Futaleufú": ["Esquel"],
    "Cushamen": ["Lago Puelo", "El Bolsón"],
    "Biedma": ["Puerto Madryn"]
  },
  "Córdoba": {
    "Capital": ["Córdoba", "Villa Carlos Paz"],
    "Río Cuarto": ["Río Cuarto"],
    "General San Martín": ["Villa María"],
    "General Roca": ["Laboulaye"],
    "San Justo": ["San Francisco"],
    "Juárez Celman": ["General Cabrera"],
    "Marcos Juárez": ["Marcos Juárez"],
    "Unión": ["Bell Ville"],
    "Colón": ["Colonia Caroya", "Jesús María"],
    "Punilla": ["Cosquín", "La Falda"],
    "Calamuchita": ["Embalse", "Santa Rosa de Calamuchita"],
    "Tercero Arriba": ["Río Tercero"],
    "Presidente Roque Sáenz Peña": ["Laboulaye"],
    "Río Segundo": ["Río Segundo"],
    "Santa María": ["Alta Gracia"],
    "Totoral": ["Villa del Totoral"],
    "Ischilín": ["Deán Funes"],
    "Cruz del Eje": ["Cruz del Eje"],
    "Sobremonte": ["San Francisco del Chañar"]
  },
  "Corrientes": {
    "Capital": ["Corrientes"],
    "Goya": ["Goya"],
    "Mercedes": ["Mercedes"],
    "Curuzú Cuatiá": ["Curuzú Cuatiá"],
    "Paso de los Libres": ["Paso de los Libres"],
    "Ituzaingó": ["Ituzaingó"],
    "Bella Vista": ["Bella Vista"],
    "Esquina": ["Esquina"]
  },
  "Entre Ríos": {
    "Paraná": ["Paraná"],
    "Concordia": ["Concordia"],
    "Gualeguaychú": ["Gualeguaychú"],
    "Uruguay": ["Concepción del Uruguay"],
    "Gualeguay": ["Gualeguay"],
    "Victoria": ["Victoria"],
    "Colón": ["Colón"],
    "Federación": ["Federación", "Chajarí"],
    "La Paz": ["La Paz"],
    "Villaguay": ["Villaguay"],
    "Nogoyá": ["Nogoyá"],
    "Diamante": ["Diamante"],
    "Tala": ["Tala"],
    "Federal": ["Federal"],
    "Islas del Ibicuy": ["Villa Paranacito"]
  },
  "Formosa": {
    "Formosa": ["Formosa"],
    "Pirané": ["Pirané"],
    "Pilcomayo": ["Clorinda"],
    "Pilagás": ["El Espinillo"]
  },
  "Jujuy": {
    "Doctor Manuel Belgrano": ["San Salvador de Jujuy"],
    "El Carmen": ["El Carmen", "Perico"],
    "Ledesma": ["Libertador General San Martín"],
    "San Pedro": ["San Pedro de Jujuy"],
    "Palpalá": ["Palpalá"],
    "Tilcara": ["Tilcara"],
    "Humahuaca": ["Humahuaca"],
    "Susques": ["Susques"],
    "Yavi": ["La Quiaca"]
  },
  "La Pampa": {
    "Capital": ["Santa Rosa"],
    "General Pico": ["General Pico"],
    "Toay": ["Toay"],
    "Realicó": ["Realicó"],
    "Utracán": ["General Acha"],
    "Conhelo": ["Eduardo Castex"]
  },
  "La Rioja": {
    "Capital": ["La Rioja"],
    "Chilecito": ["Chilecito"],
    "Chamical": ["Chamical"],
    "General Lamadrid": ["Villa Castelli"],
    "Arauco": ["Aimogasta"]
  },
  "Mendoza": {
    "Capital": ["Mendoza"],
    "Godoy Cruz": ["Godoy Cruz"],
    "Guaymallén": ["Guaymallén"],
    "Las Heras": ["Las Heras"],
    "Luján de Cuyo": ["Luján de Cuyo", "Chacras de Coria"],
    "Maipú": ["Maipú"],
    "San Martín": ["San Martín"],
    "Rivadavia": ["Rivadavia"],
    "Junín": ["Junín"],
    "Tupungato": ["Tupungato"],
    "Tunuyán": ["Tunuyán"],
    "San Rafael": ["San Rafael"],
    "General Alvear": ["General Alvear"],
    "Malargüe": ["Malargüe"]
  },
  "Misiones": {
    "Capital": ["Posadas"],
    "Oberá": ["Oberá"],
    "Eldorado": ["Eldorado"],
    "Iguazú": ["Puerto Iguazú"],
    "San Ignacio": ["San Ignacio"],
    "Apóstoles": ["Apóstoles"],
    "Leandro N. Alem": ["Leandro N. Alem"],
    "Montecarlo": ["Montecarlo"]
  },
  "Neuquén": {
    "Confluencia": ["Neuquén", "Plottier", "Centenario"],
    "Lácar": ["San Martín de los Andes"],
    "Aluminé": ["Aluminé"],
    "Zapala": ["Zapala"],
    "Chos Malal": ["Chos Malal"],
    "Los Lagos": ["Villa La Angostura"],
    "Añelo": ["Añelo"]
  },
  "Río Negro": {
    "Adolfo Alsina": ["Viedma"],
    "Bariloche": ["San Carlos de Bariloche"],
    "General Roca": ["General Roca"],
    "Avellaneda": ["Choele Choel"],
    "Conesa": ["General Conesa"],
    "Pichi Mahuida": ["Río Colorado"],
    "San Antonio": ["San Antonio Oeste"],
    "Valcheta": ["Valcheta"]
  },
  "Salta": {
    "Capital": ["Salta"],
    "General Güemes": ["General Güemes"],
    "Orán": ["San Ramón de la Nueva Orán"],
    "Anta": ["Joaquín V. González"],
    "Cafayate": ["Cafayate"],
    "Rosario de Lerma": ["Rosario de Lerma"],
    "Cerrillos": ["Cerrillos"],
    "Metán": ["San José de Metán"],
    "Rivadavia": ["Rivadavia Banda Sur"],
    "San Martín": ["Tartagal"]
  },
  "San Juan": {
    "Capital": ["San Juan"],
    "Caucete": ["Caucete"],
    "Jáchal": ["Jáchal"],
    "Sarmiento": ["Media Agua"],
    "Rawson": ["Rawson"],
    "Santa Lucía": ["Santa Lucía"],
    "Rivadavia": ["Rivadavia"],
    "Pocito": ["Pocito"],
    "Chimbas": ["Chimbas"]
  },
  "San Luis": {
    "Juan Martín de Pueyrredón": ["San Luis"],
    "General Pedernera": ["Villa Mercedes"],
    "Junín": ["Santa Rosa de Conlara"],
    "Chacabuco": ["Concarán"],
    "Ayacucho": ["Luján"]
  },
  "Santa Cruz": {
    "Güer Aike": ["Río Gallegos"],
    "Corpen Aike": ["Puerto Santa Cruz"],
    "Deseado": ["Puerto Deseado", "Caleta Olivia"],
    "Lago Buenos Aires": ["Los Antiguos"],
    "Río Chico": ["Gobernador Gregores"],
    "Lago Argentino": ["El Calafate"],
    "Magallanes": ["Puerto San Julián"]
  },
  "Santa Fe": {
    "La Capital": ["Santa Fe"],
    "Rosario": ["Rosario"],
    "Castellanos": ["Rafaela"],
    "General López": ["Venado Tuerto"],
    "General Obligado": ["Reconquista"],
    "San Justo": ["San Justo"],
    "Caseros": ["Casilda"],
    "San Lorenzo": ["San Lorenzo"],
    "Constitución": ["Villa Constitución"],
    "Iriondo": ["Cañada de Gómez"],
    "Belgrano": ["Las Rosas"],
    "San Martín": ["San Jorge", "El Trébol"],
    "San Jerónimo": ["Coronda"],
    "Las Colonias": ["Esperanza"]
  },
  "Santiago del Estero": {
    "Capital": ["Santiago del Estero"],
    "Banda": ["La Banda"],
    "Río Hondo": ["Termas de Río Hondo"],
    "Robles": ["Fernández"],
    "Avellaneda": ["Herrera"],
    "General Taboada": ["Añatuya"],
    "Jiménez": ["El Rincón"]
  },
  "Tierra del Fuego": {
    "Ushuaia": ["Ushuaia"],
    "Río Grande": ["Río Grande"],
    "Tolhuin": ["Tolhuin"]
  },
  "Tucumán": {
    "Capital": ["San Miguel de Tucumán"],
    "Yerba Buena": ["Yerba Buena"],
    "Tafí Viejo": ["Tafí Viejo"],
    "Cruz Alta": ["Banda del Río Salí"],
    "Monteros": ["Monteros"],
    "Chicligasta": ["Concepción"],
    "Río Chico": ["Aguilares"],
    "Famaillá": ["Famaillá"],
    "Lules": ["Lules"],
    "Burruyacú": ["Burruyacú"],
    "La Cocha": ["La Cocha"],
    "Leales": ["Bella Vista"]
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