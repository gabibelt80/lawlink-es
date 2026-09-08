/**
 * v0.50: ICS calendario suscripción (PRD §21).
 *
 * GET /api/calendar/{token} → text/calendar
 * token es la credencial (corresponde a User.calendarToken, se puede resetear en Configuración→Información personal);
 * contenido = eventos visibles del usuario: audiencias / plazos / tareas / vencimientos de medidas cautelares.
 * Apple Calendar / Google Calendar / Outlook se suscriben a la URL y se actualizan automáticamente.
 */
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { queryScheduleItems } from "@/server/schedule/query";
import { buildIcs, type IcsEvent } from "@/lib/ics";

export const dynamic = "force-dynamic";

const PAST_DAYS = 7;
const FUTURE_DAYS = 90;

const TYPE_PREFIX: Record<string, string> = {
  hearing: "[Audiencia]",
  deadline: "[Plazo]",
  task: "[Tarea]"
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 });
  }

  const prisma = await getTenantPrisma();

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, role: true, active: true, name: true }
  });
  if (!user || !user.active) {
    return new NextResponse("Not found", { status: 404 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - PAST_DAYS * 86400000);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now.getTime() + FUTURE_DAYS * 86400000);
  to.setHours(23, 59, 59, 999);

  const items = await queryScheduleItems(user.id, user.role, {
    from,
    to,
    includeCompleted: false
  });

  const events: IcsEvent[] = items.map((item) => {
    const prefix = TYPE_PREFIX[item.type] ?? "";
    // Se muestra el nombre del cliente, no el nombre completo del caso (menos datos sensibles en el calendario)
    const who = item.clientName ?? item.matter.internalCode;
    const isTimed = item.type === "hearing";
    return {
      uid: `${item.id}`,
      title: `${prefix} ${item.title} · ${who}`,
      start: item.occurredAt,
      allDay: !isTimed,
      description: [
        item.matter.internalCode,
        item.procedureLabel,
        item.description ?? undefined
      ]
        .filter(Boolean)
        .join(" / "),
      reminderMinutes: isTimed ? [24 * 60, 2 * 60] : [24 * 60]
    };
  });

  const ics = buildIcs({
    calendarName: `LawLink Calendario · ${user.name}`,
    events
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="lawlink.ics"'
    }
  });
}