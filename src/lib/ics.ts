/**
 * v0.9.3 ICS æ—¥åŽ†æ–‡ä»¶ç”Ÿæˆï¼ˆRFC 5545 ç®€åŒ–ç‰ˆï¼‰
 *
 * ç”¨äºŽï¼šPreservaciÃ³nåˆ°æœŸ / å¼€åº­ / Plazo ä¸€é”®å¯¼å‡º .icsï¼Œæ‹–è¿› Apple æ—¥åŽ† / Google
 * Calendar / Outlook å³å¯åœ¨æ‰‹æœºåŽŸç”Ÿæ—¥åŽ†çœ‹åˆ°Recordatoriosã€‚
 *
 * ä¸ä¾èµ–ç¬¬ä¸‰æ–¹åº“ï¼›çº¯å­—ç¬¦ä¸²æ‹¼æŽ¥ã€‚
 */

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  end?: Date;       // ä¸ä¼  = 1 å°æ—¶äº‹ä»¶ï¼›å¦‚æžœæ˜¯ allDay ç”¨ startAllDay
  allDay?: boolean; // true â†’ ç”¨ DTSTART;VALUE=DATE
  description?: string;
  location?: string;
  reminderMinutes?: number[]; // æå‰å¤šå°‘åˆ†é’ŸRecordatoriosï¼ˆå¤šä¸ªï¼‰
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// YYYYMMDDTHHmmssZ
function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// YYYYMMDDï¼ˆall-day ç”¨ï¼‰
function fmtDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// ICS æ–‡æœ¬è¦åšçš„è½¬ä¹‰ï¼š\, ; , \n
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// é•¿è¡ŒæŠ˜å ï¼ˆ>75 å­—èŠ‚æŒ‰ ICS è§„èŒƒæŠ˜è¡Œï¼‰
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
  events: IcsEvent[];
}): string {
  const prodId = opts.prodId ?? "-//LawLink//ZH-CN";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  if (opts.calendarName) {
    lines.push(fold(`X-WR-CALNAME:${esc(opts.calendarName)}`));
  }

  const now = new Date();
  for (const ev of opts.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}@lawlink.local`);
    lines.push(`DTSTAMP:${fmtUtc(now)}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(ev.start)}`);
      const end = ev.end ?? new Date(ev.start.getTime() + 86400000);
      lines.push(`DTEND;VALUE=DATE:${fmtDate(end)}`);
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
      lines.push(`DESCRIPTION:${esc(ev.title)}`);
      lines.push(`TRIGGER:-PT${m}M`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** æµè§ˆå™¨ç«¯ï¼šä¸‹è½½ .ics æ–‡ä»¶ */
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

