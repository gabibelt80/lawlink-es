// v0.30 Datos de jurisdicciones de Argentina + generacion de organismos de resolucion de disputas
// Datos basados en provincias argentinas y sus departamentos/partidos

import type { ProcedureType } from "@prisma/client";

// Datos de Argentina: provincias y sus departamentos/partidos principales
// Fuente: INDEC - Division Politico Territorial de la Republica Argentina
const ARGENTINA_DATA: Record<string, Record<string, string[]>> = {
  "Buenos Aires": {
    "La Plata": ["La Plata", "Berisso", "Ensenada"],
    "Mar del Plata": ["Mar del Plata", "General Pueyrredon"],
    "Bahia Blanca": ["Bahia Blanca"],
    "Tandil": ["Tandil"],
    "Olavarria": ["Olavarria"],
    "Junin": ["Junin"],
    "Pergamino": ["Pergamino"],
    "Campana": ["Campana"],
    "San Nicolas": ["San Nicolas"],
    "Zarate": ["Zarate"],
    "Mercedes": ["Mercedes"],
    "Lujan": ["Lujan"],
    "San Isidro": ["San Isidro"],
    "Vicente Lopez": ["Vicente Lopez"],
    "Moron": ["Moron"],
    "Lanus": ["Lanus"],
    "Quilmes": ["Quilmes"],
    "Avellaneda": ["Avellaneda"],
    "Lomas de Zamora": ["Lomas de Zamora"],
    "Almirante Brown": ["Almirante Brown"],
    "Florencio Varela": ["Florencio Varela"],
    "Berazategui": ["Berazategui"],
    "San Martin": ["San Martin"],
    "Tres de Febrero": ["Tres de Febrero"],
    "Tigre": ["Tigre"],
    "Escobar": ["Escobar"],
    "Pilar": ["Pilar"],
    "Moreno": ["Moreno"],
    "La Matanza": ["La Matanza", "San Justo", "Ramos Mejia"],
    "Merlo": ["Merlo"],
    "Ituzaingo": ["Ituzaingo"],
    "Hurlingham": ["Hurlingham"],
    "Ezeiza": ["Ezeiza"],
    "Esteban Echeverria": ["Esteban Echeverria"],
    "Presidente Peron": ["Presidente Peron"],
    "San Vicente": ["San Vicente"],
    "Canuelas": ["Canuelas"],
    "Lobos": ["Lobos"],
    "Chascomus": ["Chascomus"],
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
    "Pehuajo": ["Pehuajo"],
    "Trenque Lauquen": ["Trenque Lauquen"],
    "Bolivar": ["Bolivar"],
    "25 de Mayo": ["25 de Mayo"],
    "9 de Julio": ["9 de Julio"]
  },
  "Ciudad Autonoma de Buenos Aires": {
    "CABA": ["Comuna 1", "Comuna 2", "Comuna 3", "Comuna 4", "Comuna 5", "Comuna 6", "Comuna 7", "Comuna 8", "Comuna 9", "Comuna 10", "Comuna 11", "Comuna 12", "Comuna 13", "Comuna 14", "Comuna 15"]
  },
  "Catamarca": {
    "Capital": ["San Fernando del Valle de Catamarca"],
    "Valle Viejo": ["Valle Viejo"],
    "Andalgala": ["Andalgala"],
    "Belen": ["Belen"],
    "Tinogasta": ["Tinogasta"],
    "La Paz": ["La Paz"],
    "Santa Maria": ["Santa Maria"]
  },
  "Chaco": {
    "San Fernando": ["Resistencia", "Barranqueras"],
    "Comandante Fernandez": ["Presidencia Roque Saenz Pena"],
    "General Guemes": ["General Guemes"],
    "Libertad": ["Villa Angela"],
    "General San Martin": ["General San Martin"],
    "Quitilipi": ["Quitilipi"],
    "Castelli": ["Castelli"]
  },
  "Chubut": {
    "Rawson": ["Rawson", "Trelew", "Puerto Madryn"],
    "Escalante": ["Comodoro Rivadavia"],
    "Futaleufu": ["Esquel"],
    "Cushamen": ["Lago Puelo", "El Bolson"],
    "Biedma": ["Puerto Madryn"]
  },
  "Cordoba": {
    "Capital": ["Cordoba", "Villa Carlos Paz"],
    "Rio Cuarto": ["Rio Cuarto"],
    "General San Martin": ["Villa Maria"],
    "General Roca": ["Laboulaye"],
    "San Justo": ["San Francisco"],
    "Juarez Celman": ["General Cabrera"],
    "Marcos Juarez": ["Marcos Juarez"],
    "Union": ["Bell Ville"],
    "Colon": ["Colonia Caroya", "Jesus Maria"],
    "Punilla": ["Cosquin", "La Falda"],
    "Calamuchita": ["Embalse", "Santa Rosa de Calamuchita"],
    "Tercero Arriba": ["Rio Tercero"],
    "Presidente Roque Saenz Pena": ["Laboulaye"],
    "Rio Segundo": ["Rio Segundo"],
    "Santa Maria": ["Alta Gracia"],
    "Totoral": ["Villa del Totoral"],
    "Ischilin": ["Dean Funes"],
    "Cruz del Eje": ["Cruz del Eje"],
    "Sobremonte": ["San Francisco del Chanar"]
  },
  "Corrientes": {
    "Capital": ["Corrientes"],
    "Goya": ["Goya"],
    "Mercedes": ["Mercedes"],
    "Curuzu Cuatia": ["Curuzu Cuatia"],
    "Paso de los Libres": ["Paso de los Libres"],
    "Ituzaingo": ["Ituzaingo"],
    "Bella Vista": ["Bella Vista"],
    "Esquina": ["Esquina"]
  },
  "Entre Rios": {
    "Parana": ["Parana"],
    "Concordia": ["Concordia"],
    "Gualeguaychu": ["Gualeguaychu"],
    "Uruguay": ["Concepcion del Uruguay"],
    "Gualeguay": ["Gualeguay"],
    "Victoria": ["Victoria"],
    "Colon": ["Colon"],
    "Federacion": ["Federacion", "Chajari"],
    "La Paz": ["La Paz"],
    "Villaguay": ["Villaguay"],
    "Nogoya": ["Nogoya"],
    "Diamante": ["Diamante"],
    "Tala": ["Tala"],
    "Federal": ["Federal"],
    "Islas del Ibicuy": ["Villa Paranacito"]
  },
  "Formosa": {
    "Formosa": ["Formosa"],
    "Pirane": ["Pirane"],
    "Pilcomayo": ["Clorinda"],
    "Pilagas": ["El Espinillo"]
  },
  "Jujuy": {
    "Doctor Manuel Belgrano": ["San Salvador de Jujuy"],
    "El Carmen": ["El Carmen", "Perico"],
    "Ledesma": ["Libertador General San Martin"],
    "San Pedro": ["San Pedro de Jujuy"],
    "Palpala": ["Palpala"],
    "Tilcara": ["Tilcara"],
    "Humahuaca": ["Humahuaca"],
    "Susques": ["Susques"],
    "Yavi": ["La Quiaca"]
  },
  "La Pampa": {
    "Capital": ["Santa Rosa"],
    "General Pico": ["General Pico"],
    "Toay": ["Toay"],
    "Realico": ["Realico"],
    "Utracan": ["General Acha"],
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
    "Guaymallen": ["Guaymallen"],
    "Las Heras": ["Las Heras"],
    "Lujan de Cuyo": ["Lujan de Cuyo", "Chacras de Coria"],
    "Maipu": ["Maipu"],
    "San Martin": ["San Martin"],
    "Rivadavia": ["Rivadavia"],
    "Junin": ["Junin"],
    "Tupungato": ["Tupungato"],
    "Tunuyan": ["Tunuyan"],
    "San Rafael": ["San Rafael"],
    "General Alvear": ["General Alvear"],
    "Malargue": ["Malargue"]
  },
  "Misiones": {
    "Capital": ["Posadas"],
    "Obera": ["Obera"],
    "Eldorado": ["Eldorado"],
    "Iguazu": ["Puerto Iguazu"],
    "San Ignacio": ["San Ignacio"],
    "Apostoles": ["Apostoles"],
    "Leandro N. Alem": ["Leandro N. Alem"],
    "Montecarlo": ["Montecarlo"]
  },
  "Neuquen": {
    "Confluencia": ["Neuquen", "Plottier", "Centenario"],
    "Lacar": ["San Martin de los Andes"],
    "Alumine": ["Alumine"],
    "Zapala": ["Zapala"],
    "Chos Malal": ["Chos Malal"],
    "Los Lagos": ["Villa La Angostura"],
    "Anelo": ["Anelo"]
  },
  "Rio Negro": {
    "Adolfo Alsina": ["Viedma"],
    "Bariloche": ["San Carlos de Bariloche"],
    "General Roca": ["General Roca"],
    "Avellaneda": ["Choele Choel"],
    "Conesa": ["General Conesa"],
    "Pichi Mahuida": ["Rio Colorado"],
    "San Antonio": ["San Antonio Oeste"],
    "Valcheta": ["Valcheta"]
  },
  "Salta": {
    "Capital": ["Salta"],
    "General Guemes": ["General Guemes"],
    "Oran": ["San Ramon de la Nueva Oran"],
    "Anta": ["Joaquin V. Gonzalez"],
    "Cafayate": ["Cafayate"],
    "Rosario de Lerma": ["Rosario de Lerma"],
    "Cerrillos": ["Cerrillos"],
    "Metan": ["San Jose de Metan"],
    "Rivadavia": ["Rivadavia Banda Sur"],
    "San Martin": ["Tartagal"]
  },
  "San Juan": {
    "Capital": ["San Juan"],
    "Caucete": ["Caucete"],
    "Jachal": ["Jachal"],
    "Sarmiento": ["Media Agua"],
    "Rawson": ["Rawson"],
    "Santa Lucia": ["Santa Lucia"],
    "Rivadavia": ["Rivadavia"],
    "Pocito": ["Pocito"],
    "Chimbas": ["Chimbas"]
  },
  "San Luis": {
    "Juan Martin de Pueyrredon": ["San Luis"],
    "General Pedernera": ["Villa Mercedes"],
    "Junin": ["Santa Rosa de Conlara"],
    "Chacabuco": ["Concaran"],
    "Ayacucho": ["Lujan"]
  },
  "Santa Cruz": {
    "Guer Aike": ["Rio Gallegos"],
    "Corpen Aike": ["Puerto Santa Cruz"],
    "Deseado": ["Puerto Deseado", "Caleta Olivia"],
    "Lago Buenos Aires": ["Los Antiguos"],
    "Rio Chico": ["Gobernador Gregores"],
    "Lago Argentino": ["El Calafate"],
    "Magallanes": ["Puerto San Julian"]
  },
  "Santa Fe": {
    "La Capital": ["Santa Fe"],
    "Rosario": ["Rosario"],
    "Castellanos": ["Rafaela"],
    "General Lopez": ["Venado Tuerto"],
    "General Obligado": ["Reconquista"],
    "San Justo": ["San Justo"],
    "Caseros": ["Casilda"],
    "San Lorenzo": ["San Lorenzo"],
    "Constitucion": ["Villa Constitucion"],
    "Iriondo": ["Canada de Gomez"],
    "Belgrano": ["Las Rosas"],
    "San Martin": ["San Jorge", "El Trebol"],
    "San Jeronimo": ["Coronda"],
    "Las Colonias": ["Esperanza"]
  },
  "Santiago del Estero": {
    "Capital": ["Santiago del Estero"],
    "Banda": ["La Banda"],
    "Rio Hondo": ["Termas de Rio Hondo"],
    "Robles": ["Fernandez"],
    "Avellaneda": ["Herrera"],
    "General Taboada": ["Anatuya"],
    "Jimenez": ["El Rincon"]
  },
  "Tierra del Fuego": {
    "Ushuaia": ["Ushuaia"],
    "Rio Grande": ["Rio Grande"],
    "Tolhuin": ["Tolhuin"]
  },
  "Tucuman": {
    "Capital": ["San Miguel de Tucuman"],
    "Yerba Buena": ["Yerba Buena"],
    "Tafi Viejo": ["Tafi Viejo"],
    "Cruz Alta": ["Banda del Rio Sali"],
    "Monteros": ["Monteros"],
    "Chicligasta": ["Concepcion"],
    "Rio Chico": ["Aguilares"],
    "Famailla": ["Famailla"],
    "Lules": ["Lules"],
    "Burruyacu": ["Burruyacu"],
    "La Cocha": ["La Cocha"],
    "Leales": ["Bella Vista"]
  }
};

const DATA = ARGENTINA_DATA;

export const NATIONAL_AGENCY_OPTIONS = [
  "Corte Suprema de Justicia de la Nacion",
  "Camara Nacional de Apelaciones en lo Civil",
  "Camara Nacional de Apelaciones en lo Comercial",
  "Camara Nacional de Apelaciones en lo Laboral",
  "Camara Nacional de Apelaciones en lo Contencioso Administrativo Federal",
  "Camara Nacional de Apelaciones en lo Criminal y Correccional",
  "Camara Nacional de Apelaciones en lo Penal Economico",
  "Camara Nacional de Apelaciones en lo Federal",
  "Camara Nacional Electoral",
  "Tribunal Superior de Justicia de la Ciudad Autonoma de Buenos Aires",
  "Camara de Apelaciones en lo Penal Contravencional y de Faltas de la CABA",
  "Camara de Apelaciones en lo Contencioso Administrativo y Tributario de la CABA",
  "Justicia Nacional del Trabajo",
  "Justicia Nacional en lo Civil",
  "Justicia Nacional en lo Comercial",
  "Justicia Nacional en lo Criminal y Correccional",
  "Justicia Nacional en lo Penal Economico",
  "Justicia Nacional en lo Federal",
  "Justicia Federal en lo Civil y Comercial",
  "Justicia Federal en lo Contencioso Administrativo",
  "Justicia Federal en lo Criminal y Correccional",
  "Justicia Federal en lo Penal",
  "Justicia Federal de la Seguridad Social",
  "Ministerio Publico Fiscal de la Nacion",
  "Ministerio Publico de la Defensa",
  "Defensoria del Pueblo de la Nacion",
  "Tribunal Fiscal de la Nacion",
  "Administracion Federal de Ingresos Publicos (AFIP)",
  "Registro Nacional de la Propiedad Automotor",
  "Registro Nacional de la Propiedad Inmueble",
  "Inspeccion General de Justicia (IGJ)",
  "Administracion Nacional de la Seguridad Social (ANSES)",
  "Superintendencia de Riesgos del Trabajo (SRT)",
  "Comision Nacional de Defensa de la Competencia",
  "Comision Nacional de Valores (CNV)",
  "Banco Central de la Republica Argentina (BCRA)",
  "Superintendencia de Seguros de la Nacion",
  "Ente Nacional de Comunicaciones (ENACOM)",
  "Ente Nacional Regulador de la Electricidad (ENRE)",
  "Ente Nacional Regulador del Gas (ENARGAS)",
  "Autoridad de Cuenca Matanza Riachuelo (ACUMAR)",
  "Instituto Nacional contra la Discriminacion (INADI)",
  "Instituto Nacional de la Propiedad Industrial (INPI)",
  "Direccion Nacional de Migraciones",
  "Direccion Nacional de los Registros Nacionales de la Propiedad del Automotor y de Creditos Prendarios (DNRPA)",
  "Secretaria de Comercio Interior",
  "Secretaria de Trabajo, Empleo y Seguridad Social"
] as const;

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
  return Boolean(agency && /Tribunal|Juzgado|Corte|Camara|Justicia/.test(agency));
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
  return cityName.replace(/(Ciudad|Autonoma|Federal|Capital|Provincia)$/, "").trim();
}

export function agencyOptions(value?: string | null): string[] {
  const { province, city, area } = parseJurisdiction(value);
  if (!province) return [...NATIONAL_AGENCY_OPTIONS];
  const cityName = effectiveCityName(province, city);
  const out: string[] = [];

  if (area) {
    out.push(`Juzgado de Primera Instancia de ${area}`);
    out.push(`Tribunal de Apelaciones de ${cityName}`);
    out.push(`Camara de Apelaciones de ${cityName}`);
  } else if (city) {
    out.push(`Tribunal de Apelaciones de ${cityName}`);
    out.push(`Camara de Apelaciones de ${cityName}`);
    for (const a of areasOf(province, city)) out.push(`Juzgado de Primera Instancia de ${a}`);
  }
  out.push(`Tribunal Superior de Justicia de ${province}`);
  out.push(`Superior Tribunal de Justicia de ${province}`);
  out.push(`Camara Federal de Apelaciones de ${province}`);
  out.push(`Juzgado Federal de ${cityName || province}`);
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