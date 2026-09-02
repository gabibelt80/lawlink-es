/**
 * v0.9.3 快递公司映射（纯函数，无 node 依赖，client/server 通用）
 */

// 中文公司名 → (kuaidi100 code, kdniao code)
export const COMPANY_CODES: Record<string, [string, string]> = {
  顺丰速运: ["shunfeng", "SF"],
  中通快递: ["zhongtong", "ZTO"],
  圆通速递: ["yuantong", "YTO"],
  韵达快递: ["yunda", "YD"],
  申通快递: ["shentong", "STO"],
  EMS: ["ems", "EMS"],
  京东快递: ["jd", "JD"],
  邮政包裹: ["youzhengguonei", "YZPY"],
  极兔速递: ["jtexpress", "JTSD"],
  德邦快递: ["debangkuaidi", "DBL"],
};

export const SUPPORTED_COMPANIES = Object.keys(COMPANY_CODES);

export function detectCompany(trackingNo: string): string | null {
  const no = trackingNo.trim().toUpperCase();
  if (no.startsWith("SF")) return "Servicio exprés de SF";
  if (no.startsWith("JT")) return "Servicio exprés J&T";
  if (no.startsWith("YT")) return "Servicio exprés de YTO";
  if (no.startsWith("JD")) return "Servicio exprés de JD";
  if (/^(75|76|77)/.test(no)) return "Servicio exprés de ZTO";
  if (/^(43|44)/.test(no)) return "Servicio exprés de Yunda";
  if (/^(88|66)/.test(no)) return "Servicio exprés de STO";
  if (no.startsWith("E") || no.startsWith("1")) return "EMS";
  return null;
}
