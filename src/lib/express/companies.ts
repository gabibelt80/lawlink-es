/**
 * v0.9.3 Mapeo de empresas de mensajería (funciones puras, sin dependencias de node, compatible con client/server)
 */

// Empresas de mensajería de Argentina → códigos internos
export const COMPANY_CODES: Record<string, [string, string]> = {
  "Andreani": ["andreani", "ANDREANI"],
  "Correo Argentino": ["correo-argentino", "CORREO_ARGENTINO"],
  "OCA": ["oca", "OCA"],
  "DHL": ["dhl", "DHL"],
  "FedEx": ["fedex", "FEDEX"],
  "UPS": ["ups", "UPS"],
};

export const SUPPORTED_COMPANIES = Object.keys(COMPANY_CODES);

export function detectCompany(trackingNo: string): string | null {
  const no = trackingNo.trim().toUpperCase();
  if (no.startsWith("AND")) return "Andreani";
  if (no.startsWith("CA")) return "Correo Argentino";
  if (no.startsWith("OCA")) return "OCA";
  if (no.startsWith("DHL")) return "DHL";
  if (no.startsWith("FX")) return "FedEx";
  if (no.startsWith("UPS")) return "UPS";
  return null;
}