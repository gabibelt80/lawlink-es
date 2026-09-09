/**
 * Agentes IA para búsqueda y carga de jurisprudencia
 * 
 * Funciones:
 * 1. Buscar jurisprudencia en fuentes públicas argentinas (SAIJ, CIJ, Poder Judicial)
 * 2. Analizar y clasificar fallos con IA
 * 3. Cargar automáticamente al sistema (base de jurisprudencia del estudio)
 */

export type JurisprudenceSource = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
};

export const JURISPRUDENCE_SOURCES: JurisprudenceSource[] = [
  {
    id: "sai",
    label: "SAIJ - Sistema Argentino de Información Jurídica",
    url: "http://www.saij.gob.ar",
    enabled: true,
  },
  {
    id: "cij",
    label: "CIJ - Centro de Información Judicial",
    url: "https://www.cij.gov.ar",
    enabled: true,
  },
  {
    id: "pjn",
    label: "Poder Judicial de la Nación",
    url: "https://www.pjn.gov.ar",
    enabled: true,
  },
  {
    id: "fallos_csjn",
    label: "Fallos CSJN",
    url: "https://fallos.csjn.gov.ar",
    enabled: true,
  },
];

export type JurisprudenceAgent = {
  id: string;
  name: string;
  description: string;
  source: string;
  keywords: string[];
  jurisdiction: string;
  court: string;
  enabled: boolean;
  lastRunAt?: Date;
  resultsFound?: number;
};

export const DEFAULT_AGENTS: JurisprudenceAgent[] = [
  {
    id: "civil_casacion",
    name: "Agente Civil - Casación",
    description: "Busca fallos de la Cámara Nacional de Apelaciones en lo Civil sobre temas de casación",
    source: "pjn",
    keywords: ["casación", "apelación", "civil"],
    jurisdiction: "CABA",
    court: "Cámara Nacional de Apelaciones en lo Civil",
    enabled: true,
  },
  {
    id: "laboral_riesgos",
    name: "Agente Laboral - Riesgos de Trabajo",
    description: "Busca fallos sobre accidentes de trabajo y riesgos laborales",
    source: "sai",
    keywords: ["riesgos de trabajo", "accidente laboral", "ART"],
    jurisdiction: "Nacional",
    court: "Cámara Nacional de Apelaciones del Trabajo",
    enabled: true,
  },
  {
    id: "penal_garantias",
    name: "Agente Penal - Garantías",
    description: "Busca fallos sobre garantías constitucionales en materia penal",
    source: "cij",
    keywords: ["garantías", "debido proceso", "defensa"],
    jurisdiction: "Nacional",
    court: "Cámara Nacional de Casación Penal",
    enabled: true,
  },
];
