/**
 * Panel de trabajo mock æ•°æ®ã€‚Stage 1 ç”¨æ¥æ‰“ç£¨ UIï¼ŒStage 2 æ›¿æ¢ä¸º Prisma æŸ¥è¯¢ã€‚
 */

export type TrendDirection = "up" | "down" | "warn";

export type KpiItem = {
  key: string;
  label: string;
  value: number;
  valueFormat?: "currency";
  trend: { direction: TrendDirection; text: string };
  sparkline: number[];
};

export const dashboardKpis: KpiItem[] = [
  {
    key: "in_progress",
    label: "åŠžç†ä¸­Caso",
    value: 18,
    trend: { direction: "up", text: "+3 æœ¬å‘¨" },
    sparkline: [12, 14, 13, 15, 16, 16, 17, 17, 18, 18, 17, 18, 18, 18]
  },
  {
    key: "pending",
    label: "å¾…Confirmaræ”¶æ¡ˆ",
    value: 5,
    trend: { direction: "warn", text: "2 å¾…å¤„ç†" },
    sparkline: [2, 3, 3, 4, 4, 3, 5, 5, 4, 5, 5, 5, 5, 5]
  },
  {
    key: "deadline",
    label: "è¿‘ 7 dÃ­asPlazo",
    value: 7,
    trend: { direction: "warn", text: "2 ä¸´è¿‘" },
    sparkline: [4, 5, 5, 6, 5, 6, 6, 7, 7, 8, 7, 7, 7, 7]
  },
  {
    key: "received",
    label: "æœ¬æœˆå®žæ”¶",
    value: 286000,
    valueFormat: "currency",
    trend: { direction: "up", text: "+12%" },
    sparkline: [180, 220, 240, 200, 260, 280, 270, 290, 280, 286, 286, 286, 286, 286]
  }
];

export const todayFocus = {
  title: "ä¸¾è¯æˆªæ­¢",
  matter: "é’çŸ³å»ºè®¾è¯‰åŽä¸œç½®ä¸š",
  internalCode: "LL-2026-CC-0015",
  daysLeft: 3,
  href: "/matters/m-0015"
};

export type ScheduleItem = {
  id: string;
  date: string;
  weekday: string;
  time?: string;
  type: "deadline" | "hearing";
  title: string;
  matter: string;
  procedure?: string;
};

export const scheduleItems: ScheduleItem[] = [
  {
    id: "s1",
    date: "5æœˆ 25",
    weekday: "å‘¨ä¸€",
    time: "14:00",
    type: "deadline",
    title: "ä¸¾è¯æˆªæ­¢",
    matter: "é’çŸ³å»ºè®¾è¯‰åŽä¸œç½®ä¸š",
    procedure: "ä¸€å®¡"
  },
  {
    id: "s2",
    date: "5æœˆ 28",
    weekday: "å‘¨å››",
    time: "09:30",
    type: "hearing",
    title: "å¼€åº­ Â· ç¬¬ä¸€æ¬¡",
    matter: "åŠ³åŠ¨äº‰è®®ä»²è£åŽä¸€å®¡"
  },
  {
    id: "s3",
    date: "5æœˆ 28",
    weekday: "å‘¨å››",
    time: "18:00",
    type: "deadline",
    title: "å½’æ¡£ææ–™æˆªæ­¢",
    matter: "æž—æŸåŠ³åŠ¨äº‰è®®"
  },
  {
    id: "s4",
    date: "5æœˆ 30",
    weekday: "å‘¨å…­",
    time: "23:59",
    type: "deadline",
    title: "ä¸Šè¯‰Plazo",
    matter: "æ˜Žè¿œç§‘æŠ€è‚¡æƒè½¬è®©"
  }
];

export type TodoItem = {
  id: string;
  severity: "blocking" | "urgent" | "normal";
  title: string;
  detail: string;
  href: string;
};

export const todoItems: TodoItem[] = [
  {
    id: "t1",
    severity: "blocking",
    title: "å†²çªå‘½ä¸­ BLOCKINGï¼Œå¾…ç»“è®º",
    detail: "Intake I-2026-001",
    href: "/intakes/I-2026-001"
  },
  {
    id: "t2",
    severity: "urgent",
    title: "æ‹Ÿç­”è¾©çŠ¶ï¼ˆå·²Vencido 1 dÃ­asï¼‰",
    detail: "LL-2026-CC-0015",
    href: "/matters/m-0015"
  },
  {
    id: "t3",
    severity: "normal",
    title: "å®¡é˜…äº¤æ˜“æ–‡ä»¶ç¬¬äºŒç¨¿",
    detail: "LL-2026-NL-0011",
    href: "/matters/m-0011"
  },
  {
    id: "t4",
    severity: "normal",
    title: "ç”µè¯å›žè®¿Cliente",
    detail: "LL-2026-CC-0006",
    href: "/matters/m-0006"
  }
];

export const revenueTrend = [
  { month: "12æœˆ", received: 180, receivable: 220 },
  { month: "1æœˆ", received: 220, receivable: 260 },
  { month: "2æœˆ", received: 240, receivable: 280 },
  { month: "3æœˆ", received: 200, receivable: 240 },
  { month: "4æœˆ", received: 260, receivable: 300 },
  { month: "5æœˆ", received: 286, receivable: 320 }
];

export const categoryDistribution = [
  { name: "Civil/Comercial", value: 18, code: "CC", color: "#5B8DEF" },
  { name: "éžè¯‰", value: 12, code: "NL", color: "#4FD1C5" },
  { name: "é¡¾é—®", value: 8, code: "GC", color: "#9B7BF7" },
  { name: "Penal", value: 2, code: "CR", color: "#FB923C" },
  { name: "Administrativo", value: 1, code: "AD", color: "#FBBF24" },
  { name: "ä¸“Ã­tems", value: 1, code: "SP", color: "#60A5FA" }
];

