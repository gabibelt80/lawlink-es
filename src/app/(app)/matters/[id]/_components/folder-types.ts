/**
 * 卷宗 / 模板相关的共享类型（v0.8）
 */

export type FolderPayload = {
  id: string;
  name: string;
  orderIndex: number;
  isDefault: boolean;
};

export type FolderDocument = {
  id: string;
  name: string;
  size: number | null;
  folderId: string | null;
  templateId: string | null;
  createdAt: Date;
};

export type TemplateSummary = {
  id: string;
  name: string;
  category:
    | "INTAKE"
    | "RETAINER"
    | "LITIGATION"
    | "HEARING"
    | "WORK_PRODUCT"
    | "ARCHIVE"
    | "CLOSING"
    | "BLANK";
  description: string | null;
  applicableCategories: string[];
  variables: string[];
  isBuiltIn: boolean;
};

export const TEMPLATE_CATEGORY_CN: Record<TemplateSummary["category"], string> =
  {
    INTAKE: "Documentos de admisión",
    RETAINER: "Documentos de mandato",
    LITIGATION: "Documentos de litigio",
    HEARING: "Documentos de audiencia",
    WORK_PRODUCT: "Trabajo realizado",
    ARCHIVE: "Documentos del expediente",
    CLOSING: "Documentos de cierre",
    BLANK: "Documento en blanco",
  };

export const VARIABLE_LABEL_CN: Record<string, string> = {
  "firm.name": "Nombre del bufete",
  "firm.address": "Dirección del bufete",
  "firm.phone": "Teléfono del bufete",
  "lawyer.name": "Abogado principal",
  "lawyer.phone": "Teléfono del abogado",
  "matter.code": "Código del caso",
  "matter.title": "Nombre del caso",
  "matter.causeText": "Causa",
  "matter.intakeDate": "Fecha de admisión",
  "matter.claimAmount": "Monto del caso",
  "matter.ourStanding": "Nuestra posición en el litigio",
  "client.name": "Nombre del cliente",
  "client.idNumber": "Número de documento del cliente",
  "client.address": "Domicilio del cliente",
  "client.phone": "Teléfono del cliente",
  "opposing.name": "Nombre de la parte contraria",
  "opposing.idNumber": "Número de documento de la parte contraria",
  "opposing.address": "Domicilio de la parte contraria",
  "opposing.phone": "Teléfono de la parte contraria",
  "proceeding.court": "Tribunal / Juzgado",
  "proceeding.caseNo": "Número del caso",
  todayCN: "Fecha de generación",
};
