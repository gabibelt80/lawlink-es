/**
 * v0.9.3 Seguimiento de envíos (adaptado para Argentina)
 *
 * Servicios de mensajería disponibles:
 * - Andreani
 * - Correo Argentino
 * - OCA
 * - DHL Argentina
 * - FedEx Argentina
 * - UPS Argentina
 *
 * Esta es una versión preparada para integrar con APIs de mensajería locales.
 * Actualmente funciona con datos de ejemplo, pero la estructura está lista para
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
  state: string; // Estado en español
  traces: TrackTrace[];
}

// Estados para mensajería argentina (estandarizados)
const ARGENTINA_STATES: Record<string, string> = {
  "0": "Sin información",
  "1": "Recibido por el correo",
  "2": "En tránsito",
  "3": "En reparto",
  "4": "Entregado",
  "5": "Rechazado / devuelto",
  "6": "En sucursal para retiro",
};

/**
 * Función de ejemplo para llamar a la API de Andreani
 * Reemplazar con la integración real
 */
async function callAndreani(opts: {
  trackingNo: string;
  apiKey?: string;
}): Promise<TrackResult> {
  // Simulación de respuesta (reemplazar con llamada real)
  const mockTraces = [
    { time: new Date().toISOString(), desc: "Envío registrado en sistema" },
    { time: new Date(Date.now() - 3600000).toISOString(), desc: "En tránsito hacia centro de distribución" }
  ];

  return {
    provider: "Andreani",
    companyName: "Andreani",
    trackingNo: opts.trackingNo,
    state: ARGENTINA_STATES["2"] ?? "En tránsito",
    traces: mockTraces
  };
}

/**
 * Función de ejemplo para llamar a la API de Correo Argentino
 * Reemplazar con la integración real
 */
async function callCorreoArgentino(opts: {
  trackingNo: string;
  apiKey?: string;
}): Promise<TrackResult> {
  const mockTraces = [
    { time: new Date().toISOString(), desc: "Envío recibido en el centro de procesamiento" }
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
 * Función principal de seguimiento de envíos
 * Por defecto usa Andreani. Se puede configurar para usar otros servicios.
 */
export async function trackExpress(input: {
  trackingNo: string;
  companyCode?: string; // Código de la empresa de mensajería
}): Promise<TrackResult> {
  // Obtener configuración del servicio (desde SystemSetting)
  const s = await getExpressSettings();
  
  // Detectar empresa automáticamente si no se especifica
  const company = input.companyCode 
    ? input.companyCode 
    : detectCompany(input.trackingNo) || "Andreani";

  // Si no hay configuración, usar valores por defecto (modo demo)
  if (!s.andreaConfigured && !s.correoConfigured) {
    // Modo demo: devolver datos de ejemplo
    return {
      provider: "Demo (Andreani)",
      companyName: company || "Andreani",
      trackingNo: input.trackingNo,
      state: ARGENTINA_STATES["2"] ?? "En tránsito",
      traces: [
        { time: new Date().toISOString(), desc: "Envío registrado en modo demo" },
        { time: new Date(Date.now() - 3600000).toISOString(), desc: "Simulación de seguimiento" }
      ]
    };
  }

  // Aquí va la lógica real según la empresa configurada
  // Ejemplo: si está configurado Andreani
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

  throw new Error("No hay servicio de mensajería configurado. Configurar en Ajustes → Mensajería");
}