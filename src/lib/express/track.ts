/**
 * v0.9.3 Seguimiento de envÃ­os (adaptado para Argentina)
 *
 * Servicios de mensajerÃ­a disponibles:
 * - Andreani
 * - Correo Argentino
 * - OCA
 * - DHL Argentina
 * - FedEx Argentina
 * - UPS Argentina
 *
 * Esta es una versiÃ³n preparada para integrar con APIs de mensajerÃ­a locales.
 * Actualmente funciona con datos de ejemplo, pero la estructura estÃ¡ lista para
 * conectar con servicios reales.
 */
import { getExpressSettings } from "./settings";
import { COMPANY_CODES, detectCompany } from "./companies";

export { COMPANY_CODES, SUPPORTED_COMPANIES, detectCompany } from "./companies";

export interface TrackTrace {
  time: string;
  desc: string;
}

export interface TrackResult {
  provider: string; // ej. "Andreani", "Correo Argentino"
  companyName: string;
  trackingNo: string;
  state: string; // Estado en espaÃ±ol
  traces: TrackTrace[];
}

// Estados para mensajerÃ­a argentina (estandarizados)
const ARGENTINA_STATES: Record<string, string> = {
  "0": "Sin informaciÃ³n",
  "1": "Recibido por el correo",
  "2": "En trÃ¡nsito",
  "3": "En reparto",
  "4": "Entregado",
  "5": "Rechazado / devuelto",
  "6": "En sucursal para retiro",
};

/**
 * FunciÃ³n de ejemplo para llamar a la API de Andreani
 * Reemplazar con la integraciÃ³n real
 */
async function callAndreani(opts: {
  trackingNo: string;
  apiKey?: string;
}): Promise<TrackResult> {
  // SimulaciÃ³n de respuesta (reemplazar con llamada real)
  const mockTraces = [
    { time: new Date().toISOString(), desc: "EnvÃ­o registrado en sistema" },
    { time: new Date(Date.now() - 3600000).toISOString(), desc: "En trÃ¡nsito hacia centro de distribuciÃ³n" }
  ];

  return {
    provider: "Andreani",
    companyName: "Andreani",
    trackingNo: opts.trackingNo,
    state: ARGENTINA_STATES["2"] ?? "En trÃ¡nsito",
    traces: mockTraces
  };
}

/**
 * FunciÃ³n de ejemplo para llamar a la API de Correo Argentino
 * Reemplazar con la integraciÃ³n real
 */
async function callCorreoArgentino(opts: {
  trackingNo: string;
  apiKey?: string;
}): Promise<TrackResult> {
  const mockTraces = [
    { time: new Date().toISOString(), desc: "EnvÃ­o recibido en el centro de procesamiento" }
  ];

  return {
    provider: "Correo Argentino",
    companyName: "Correo Argentino",
    trackingNo: opts.trackingNo,
    state: ARGENTINA_STATES["1"] ?? "Recibido",
    traces: mockTraces
  };
}

/**
 * FunciÃ³n principal de seguimiento de envÃ­os
 * Por defecto usa Andreani. Se puede configurar para usar otros servicios.
 */
export async function trackExpress(input: {
  trackingNo: string;
  companyCode?: string; // CÃ³digo de la empresa de mensajerÃ­a
}): Promise<TrackResult> {
  // Obtener configuraciÃ³n del servicio (desde SystemSetting)
  const s = await getExpressSettings();
  
  // Detectar empresa automÃ¡ticamente si no se especifica
  const company = input.companyCode 
    ? input.companyCode 
    : detectCompany(input.trackingNo) || "Andreani";

  // Si no hay configuraciÃ³n, usar valores por defecto (modo demo)
  if (!s.andreaConfigured && !s.correoConfigured) {
    // Modo demo: devolver datos de ejemplo
    return {
      provider: "Demo (Andreani)",
      companyName: company || "Andreani",
      trackingNo: input.trackingNo,
      state: ARGENTINA_STATES["2"] ?? "En trÃ¡nsito",
      traces: [
        { time: new Date().toISOString(), desc: "EnvÃ­o registrado en modo demo" },
        { time: new Date(Date.now() - 3600000).toISOString(), desc: "SimulaciÃ³n de seguimiento" }
      ]
    };
  }

  // AquÃ­ va la lÃ³gica real segÃºn la empresa configurada
  // Ejemplo: si estÃ¡ configurado Andreani
  if (s.andreaConfigured) {
    try {
      return await callAndreani({
        trackingNo: input.trackingNo,
        apiKey: s.andreaApiKey
      });
    } catch (e) {
      // Fallback a Correo Argentino si falla
      if (!s.correoConfigured) throw e;
    }
  }

  if (s.correoConfigured) {
    return await callCorreoArgentino({
      trackingNo: input.trackingNo,
      apiKey: s.correoApiKey
    });
  }

  throw new Error("No hay servicio de mensajerÃ­a configurado. Configurar en Ajustes â†’ MensajerÃ­a");
}
