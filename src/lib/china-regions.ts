// v0.30 Datos de jurisdicciones de Argentina + generaciÃ³n de organismos de resoluciÃ³n de disputas
// Datos basados en provincias argentinas y sus departamentos/partidos

import type { ProcedureType } from "@prisma/client";

// Datos de Argentina: provincias y sus departamentos/partidos principales
// Fuente: INDEC - DivisiÃ³n PolÃ­tico Territorial de la RepÃºblica Argentina
const ARGENTINA_DATA: Record<string, Record<string, string[]>> = {
  "Buenos Aires": {
    "La Plata": ["La Plata", "Berisso", "Ensenada"],
    "Mar del Plata": ["Mar del Plata", "General PueyrredÃ³n"],
    "BahÃ­a Blanca": ["BahÃ­a Blanca"],
    "Tandil": ["Tandil"],
    "OlavarrÃ­a": ["OlavarrÃ­a"],
    "JunÃ­n": ["JunÃ­n"],
    "Pergamino": ["Pergamino"],
    "Campana": ["Campana"],
    "San NicolÃ¡s": ["San NicolÃ¡s"],
    "ZÃ¡rate": ["ZÃ¡rate"],
    "Mercedes": ["Mercedes"],
    "LujÃ¡n": ["LujÃ¡n"],
    "San Isidro": ["San Isidro"],
    "Vicente LÃ³pez": ["Vicente LÃ³pez"],
    "MorÃ³n": ["MorÃ³n"],
    "LanÃºs": ["LanÃºs"],
    "Quilmes": ["Quilmes"],
    "Avellaneda": ["Avellaneda"],
    "Lomas de Zamora": ["Lomas de Zamora"],
    "Almirante Brown": ["Almirante Brown"],
    "Florencio Varela": ["Florencio Varela"],
    "Berazategui": ["Berazategui"],
    "San MartÃ­n": ["San MartÃ­n"],
    "Tres de Febrero": ["Tres de Febrero"],
    "Tigre": ["Tigre"],
    "Escobar": ["Escobar"],
    "Pilar": ["Pilar"],
    "Moreno": ["Moreno"],
    "La Matanza": ["La Matanza", "San Justo", "Ramos MejÃ­a"],
    "Merlo": ["Merlo"],
    "ItuzaingÃ³": ["ItuzaingÃ³"],
    "Hurlingham": ["Hurlingham"],
    "Ezeiza": ["Ezeiza"],
    "Esteban EcheverrÃ­a": ["Esteban EcheverrÃ­a"],
    "Presidente PerÃ³n": ["Presidente PerÃ³n"],
    "San Vicente": ["San Vicente"],
    "CaÃ±uelas": ["CaÃ±uelas"],
    "Lobos": ["Lobos"],
    "ChascomÃºs": ["ChascomÃºs"],
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
    "PehuajÃ³": ["PehuajÃ³"],
    "Trenque Lauquen": ["Trenque Lauquen"],
    "BolÃ­var": ["BolÃ­var"],
    "25 de Mayo": ["25 de Mayo"],
    "9 de Julio": ["9 de Julio"]
  },
  "Ciudad AutÃ³noma de Buenos Aires": {
    "CABA": ["Comuna 1", "Comuna 2", "Comuna 3", "Comuna 4", "Comuna 5", "Comuna 6", "Comuna 7", "Comuna 8", "Comuna 9", "Comuna 10", "Comuna 11", "Comuna 12", "Comuna 13", "Comuna 14", "Comuna 15"]
  },
  "Catamarca": {
    "Capital": ["San Fernando del Valle de Catamarca"],
    "Valle Viejo": ["Valle Viejo"],
    "AndalgalÃ¡": ["AndalgalÃ¡"],
    "BelÃ©n": ["BelÃ©n"],
    "Tinogasta": ["Tinogasta"],
    "La Paz": ["La Paz"],
    "Santa MarÃ­a": ["Santa MarÃ­a"]
  },
  "Chaco": {
    "San Fernando": ["Resistencia", "Barranqueras"],
    "Comandante FernÃ¡ndez": ["Presidencia Roque SÃ¡enz PeÃ±a"],
    "General GÃ¼emes": ["General GÃ¼emes"],
    "Libertad": ["Villa Ãngela"],
    "General San MartÃ­n": ["General San MartÃ­n"],
    "Quitilipi": ["Quitilipi"],
    "Castelli": ["Castelli"]
  },
  "Chubut": {
    "Rawson": ["Rawson", "Trelew", "Puerto Madryn"],
    "Escalante": ["Comodoro Rivadavia"],
    "FutaleufÃº": ["Esquel"],
    "Cushamen": ["Lago Puelo", "El BolsÃ³n"],
    "Biedma": ["Puerto Madryn"]
  },
  "CÃ³rdoba": {
    "Capital": ["CÃ³rdoba", "Villa Carlos Paz"],
    "RÃ­o Cuarto": ["RÃ­o Cuarto"],
    "General San MartÃ­n": ["Villa MarÃ­a"],
    "General Roca": ["Laboulaye"],
    "San Justo": ["San Francisco"],
    "JuÃ¡rez Celman": ["General Cabrera"],
    "Marcos JuÃ¡rez": ["Marcos JuÃ¡rez"],
    "UniÃ³n": ["Bell Ville"],
    "ColÃ³n": ["Colonia Caroya", "JesÃºs MarÃ­a"],
    "Punilla": ["CosquÃ­n", "La Falda"],
    "Calamuchita": ["Embalse", "Santa Rosa de Calamuchita"],
    "Tercero Arriba": ["RÃ­o Tercero"],
    "Presidente Roque SÃ¡enz PeÃ±a": ["Laboulaye"],
    "RÃ­o Segundo": ["RÃ­o Segundo"],
    "Santa MarÃ­a": ["Alta Gracia"],
    "Totoral": ["Villa del Totoral"],
    "IschilÃ­n": ["DeÃ¡n Funes"],
    "Cruz del Eje": ["Cruz del Eje"],
    "Sobremonte": ["San Francisco del ChaÃ±ar"]
  },
  "Corrientes": {
    "Capital": ["Corrientes"],
    "Goya": ["Goya"],
    "Mercedes": ["Mercedes"],
    "CuruzÃº CuatiÃ¡": ["CuruzÃº CuatiÃ¡"],
    "Paso de los Libres": ["Paso de los Libres"],
    "ItuzaingÃ³": ["ItuzaingÃ³"],
    "Bella Vista": ["Bella Vista"],
    "Esquina": ["Esquina"]
  },
  "Entre RÃ­os": {
    "ParanÃ¡": ["ParanÃ¡"],
    "Concordia": ["Concordia"],
    "GualeguaychÃº": ["GualeguaychÃº"],
    "Uruguay": ["ConcepciÃ³n del Uruguay"],
    "Gualeguay": ["Gualeguay"],
    "Victoria": ["Victoria"],
    "ColÃ³n": ["ColÃ³n"],
    "FederaciÃ³n": ["FederaciÃ³n", "ChajarÃ­"],
    "La Paz": ["La Paz"],
    "Villaguay": ["Villaguay"],
    "NogoyÃ¡": ["NogoyÃ¡"],
    "Diamante": ["Diamante"],
    "Tala": ["Tala"],
    "Federal": ["Federal"],
    "Islas del Ibicuy": ["Villa Paranacito"]
  },
  "Formosa": {
    "Formosa": ["Formosa"],
    "PiranÃ©": ["PiranÃ©"],
    "Pilcomayo": ["Clorinda"],
    "PilagÃ¡s": ["El Espinillo"]
  },
  "Jujuy": {
    "Doctor Manuel Belgrano": ["San Salvador de Jujuy"],
    "El Carmen": ["El Carmen", "Perico"],
    "Ledesma": ["Libertador General San MartÃ­n"],
    "San Pedro": ["San Pedro de Jujuy"],
    "PalpalÃ¡": ["PalpalÃ¡"],
    "Tilcara": ["Tilcara"],
    "Humahuaca": ["Humahuaca"],
    "Susques": ["Susques"],
    "Yavi": ["La Quiaca"]
  },
  "La Pampa": {
    "Capital": ["Santa Rosa"],
    "General Pico": ["General Pico"],
    "Toay": ["Toay"],
    "RealicÃ³": ["RealicÃ³"],
    "UtracÃ¡n": ["General Acha"],
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
    "GuaymallÃ©n": ["GuaymallÃ©n"],
    "Las Heras": ["Las Heras"],
    "LujÃ¡n de Cuyo": ["LujÃ¡n de Cuyo", "Chacras de Coria"],
    "MaipÃº": ["MaipÃº"],
    "San MartÃ­n": ["San MartÃ­n"],
    "Rivadavia": ["Rivadavia"],
    "JunÃ­n": ["JunÃ­n"],
    "Tupungato": ["Tupungato"],
    "TunuyÃ¡n": ["TunuyÃ¡n"],
    "San Rafael": ["San Rafael"],
    "General Alvear": ["General Alvear"],
    "MalargÃ¼e": ["MalargÃ¼e"]
  },
  "Misiones": {
    "Capital": ["Posadas"],
    "OberÃ¡": ["OberÃ¡"],
    "Eldorado": ["Eldorado"],
    "IguazÃº": ["Puerto IguazÃº"],
    "San Ignacio": ["San Ignacio"],
    "ApÃ³stoles": ["ApÃ³stoles"],
    "Leandro N. Alem": ["Leandro N. Alem"],
    "Montecarlo": ["Montecarlo"]
  },
  "NeuquÃ©n": {
    "Confluencia": ["NeuquÃ©n", "Plottier", "Centenario"],
    "LÃ¡car": ["San MartÃ­n de los Andes"],
    "AluminÃ©": ["AluminÃ©"],
    "Zapala": ["Zapala"],
    "Chos Malal": ["Chos Malal"],
    "Los Lagos": ["Villa La Angostura"],
    "AÃ±elo": ["AÃ±elo"]
  },
  "RÃ­o Negro": {
    "Adolfo Alsina": ["Viedma"],
    "Bariloche": ["San Carlos de Bariloche"],
    "General Roca": ["General Roca"],
    "Avellaneda": ["Choele Choel"],
    "Conesa": ["General Conesa"],
    "Pichi Mahuida": ["RÃ­o Colorado"],
    "San Antonio": ["San Antonio Oeste"],
    "Valcheta": ["Valcheta"]
  },
  "Salta": {
    "Capital": ["Salta"],
    "General GÃ¼emes": ["General GÃ¼emes"],
    "OrÃ¡n": ["San RamÃ³n de la Nueva OrÃ¡n"],
    "Anta": ["JoaquÃ­n V. GonzÃ¡lez"],
    "Cafayate": ["Cafayate"],
    "Rosario de Lerma": ["Rosario de Lerma"],
    "Cerrillos": ["Cerrillos"],
    "MetÃ¡n": ["San JosÃ© de MetÃ¡n"],
    "Rivadavia": ["Rivadavia Banda Sur"],
    "San MartÃ­n": ["Tartagal"]
  },
  "San Juan": {
    "Capital": ["San Juan"],
    "Caucete": ["Caucete"],
    "JÃ¡chal": ["JÃ¡chal"],
    "Sarmiento": ["Media Agua"],
    "Rawson": ["Rawson"],
    "Santa LucÃ­a": ["Santa LucÃ­a"],
    "Rivadavia": ["Rivadavia"],
    "Pocito": ["Pocito"],
    "Chimbas": ["Chimbas"]
  },
  "San Luis": {
    "Juan MartÃ­n de PueyrredÃ³n": ["San Luis"],
    "General Pedernera": ["Villa Mercedes"],
    "JunÃ­n": ["Santa Rosa de Conlara"],
    "Chacabuco": ["ConcarÃ¡n"],
    "Ayacucho": ["LujÃ¡n"]
  },
  "Santa Cruz": {
    "GÃ¼er Aike": ["RÃ­o Gallegos"],
    "Corpen Aike": ["Puerto Santa Cruz"],
    "Deseado": ["Puerto Deseado", "Caleta Olivia"],
    "Lago Buenos Aires": ["Los Antiguos"],
    "RÃ­o Chico": ["Gobernador Gregores"],
    "Lago Argentino": ["El Calafate"],
    "Magallanes": ["Puerto San JuliÃ¡n"]
  },
  "Santa Fe": {
    "La Capital": ["Santa Fe"],
    "Rosario": ["Rosario"],
    "Castellanos": ["Rafaela"],
    "General LÃ³pez": ["Venado Tuerto"],
    "General Obligado": ["Reconquista"],
    "San Justo": ["San Justo"],
    "Caseros": ["Casilda"],
    "San Lorenzo": ["San Lorenzo"],
    "ConstituciÃ³n": ["Villa ConstituciÃ³n"],
    "Iriondo": ["CaÃ±ada de GÃ³mez"],
    "Belgrano": ["Las Rosas"],
    "San MartÃ­n": ["San Jorge", "El TrÃ©bol"],
    "San JerÃ³nimo": ["Coronda"],
    "Las Colonias": ["Esperanza"]
  },
  "Santiago del Estero": {
    "Capital": ["Santiago del Estero"],
    "Banda": ["La Banda"],
    "RÃ­o Hondo": ["Termas de RÃ­o Hondo"],
    "Robles": ["FernÃ¡ndez"],
    "Avellaneda": ["Herrera"],
    "General Taboada": ["AÃ±atuya"],
    "JimÃ©nez": ["El RincÃ³n"]
  },
  "Tierra del Fuego": {
    "Ushuaia": ["Ushuaia"],
    "RÃ­o Grande": ["RÃ­o Grande"],
    "Tolhuin": ["Tolhuin"]
  },
  "TucumÃ¡n": {
    "Capital": ["San Miguel de TucumÃ¡n"],
    "Yerba Buena": ["Yerba Buena"],
    "TafÃ­ Viejo": ["TafÃ­ Viejo"],
    "Cruz Alta": ["Banda del RÃ­o SalÃ­"],
    "Monteros": ["Monteros"],
    "Chicligasta": ["ConcepciÃ³n"],
    "RÃ­o Chico": ["Aguilares"],
    "FamaillÃ¡": ["FamaillÃ¡"],
    "Lules": ["Lules"],
    "BurruyacÃº": ["BurruyacÃº"],
    "La Cocha": ["La Cocha"],
    "Leales": ["Bella Vista"]
  }
};

const DATA = ARGENTINA_DATA;

export const NATIONAL_AGENCY_OPTIONS = ["Corte Suprema de Justicia de la NaciÃ³n"] as const;

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
  return cityName.replace(/(Ciudad|AutÃ³noma|Federal|Capital|Provincia)$/, "").trim();
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
