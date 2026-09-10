import { NextResponse } from "next/server";
import { getTenantPrismaSync } from "@/lib/tenant-prisma";
import { queryScheduleItems } from "@/server/schedule/query";
import { buildIcs } from "@/lib/ics";
import { prisma } from "@/lib/prisma";

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
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return new NextResponse("Not found", { status: 404 });
    }

    // 1. Buscar en base central por el token (fuente de verdad)
    const firmUser = await prisma.firmUser.findFirst({
      where: { calendarToken: token },
      select: { 
        id: true, 
        email: true,
        active: true, 
        firm: { select: { slug: true } } 
      },
    });

    if (!firmUser?.active || !firmUser.firm?.slug) {
      return new NextResponse("Not found", { status: 404 });
    }

    // 2. Conectar al tenant
    const tenantPrisma = getTenantPrismaSync(firmUser.firm.slug);

    // 3. Buscar el usuario del tenant por email (más confiable que por token)
    const user = await tenantPrisma.user.findFirst({
      where: { email: firmUser.email, active: true },
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
      includeCompleted: false,
      prisma: tenantPrisma,
    });

    const events = items.map((item) => {
      const prefix = TYPE_PREFIX[item.type] ?? "";
      const who = item.clientName ?? item.matter.internalCode;
      const isTimed = item.type === "hearing";

      return {
        uid: `${item.type}-${item.id}@juridictas`,
        title: `${prefix} ${who}`,
        summary: item.title,
        description: item.description ?? item.title,
        location: item.procedureLabel,
        start: item.occurredAt,
        end: isTimed
          ? new Date(item.occurredAt.getTime() + 60 * 60 * 1000)
          : new Date(item.occurredAt.getTime() + 30 * 60 * 1000),
        allDay: !isTimed,
      };
    });

    const ics = buildIcs({ events });
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[calendar] ERROR:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
