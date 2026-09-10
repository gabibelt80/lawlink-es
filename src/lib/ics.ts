/**
 * Generador de calendarios ICS (RFC 5545)
 * 
 * Usado para:
 * - Suscripción al calendario del usuario (Google Calendar, Apple Calendar, Outlook)
 * - Descarga de archivos .ics desde el navegador
 */

export type IcsEvent = {
  uid: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  reminderMinutes?: number[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Formato UTC: YYYYMMDDTHHmmssZ
function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Formato fecha local: YYYYMMDD (para eventos de todo el día)
// Usa la fecha LOCAL, no UTC, para evitar desfases
function fmtDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// Escapa caracteres especiales según RFC 5545
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Pliega líneas largas (>75 bytes según RFC 5545)
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push(i === 0 ? chunk : " " + chunk);
    i += i === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

export function buildIcs(opts: {
  prodId?: string;
  calendarName?: string;
  timezone?: string;
  refreshMinutes?: number;
  events: IcsEvent[];
}): string {
  const prodId = opts.prodId ?? "-//JURIDICTAS//Calendario//ES";
  const timezone = opts.timezone ?? "America/Argentina/Buenos_Aires";
  const refreshMinutes = opts.refreshMinutes ?? 60;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${timezone}`,
    `X-WR-CALNAME:${esc(opts.calendarName ?? "JURIDICTAS")}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${refreshMinutes}M`,
    `X-PUBLISHED-TTL:PT${refreshMinutes}M`,
  ];

  const now = new Date();
  const dtstamp = fmtUtc(now);

  for (const ev of opts.events) {
    lines.push("BEGIN:VEVENT");
    // UID único: si ya viene con @, no agregar otro
    const uid = ev.uid.includes("@") ? ev.uid : `${ev.uid}@juridictas.ar`;
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`CREATED:${dtstamp}`);

    if (ev.allDay) {
      // Todo el día: DTEND es el día SIGUIENTE (exclusivo)
      const startDate = fmtDate(ev.start);
      const endDate = ev.end
        ? fmtDate(ev.end)
        : fmtDate(new Date(ev.start.getTime() + 86400000));
      lines.push(`DTSTART;VALUE=DATE:${startDate}`);
      lines.push(`DTEND;VALUE=DATE:${endDate}`);
    } else {
      lines.push(`DTSTART:${fmtUtc(ev.start)}`);
      const end = ev.end ?? new Date(ev.start.getTime() + 3600000);
      lines.push(`DTEND:${fmtUtc(end)}`);
    }

    lines.push(fold(`SUMMARY:${esc(ev.title)}`));
    if (ev.description) lines.push(fold(`DESCRIPTION:${esc(ev.description)}`));
    if (ev.location) lines.push(fold(`LOCATION:${esc(ev.location)}`));

    for (const m of ev.reminderMinutes ?? []) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(fold(`DESCRIPTION:${esc(ev.title)}`));
      lines.push(`TRIGGER:-PT${m}M`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Descarga un .ics en el navegador */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
