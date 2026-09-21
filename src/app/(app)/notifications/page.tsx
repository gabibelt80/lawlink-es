import Link from "next/link";
import { Bell, CheckCheck, Check, Trash2 } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  toggleNotificationRead,
  deleteNotification,
} from "@/server/notifications/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  PRESERVATION_EXPIRY: "Vencimiento de preservación",
  HEARING_REMINDER: "Audiencia",
  DEADLINE_REMINDER: "Plazo",
  SEAL_STATUS_CHANGE: "Sello",
  SMS_ARRIVAL: "SMS",
  TASK_ASSIGNED: "Sistema",
  SYSTEM: "Sistema",
  ARCHIVE_APPROVED: "Archivo",
  ARCHIVE_REJECTED: "Archivo",
};

const priorityClass: Record<string, string> = {
  URGENT: "text-red-600",
  HIGH: "text-orange-600",
  NORMAL: "text-foreground",
  LOW: "text-muted-foreground",
};

export default async function NotificationsPage() {
  const notifications = await getNotifications({ limit: 100 });
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllReadAction() {
    "use server";
    await markAllNotificationsRead();
  }

  async function toggleReadAction(id: string) {
    "use server";
    await toggleNotificationRead(id);
  }

  async function deleteAction(id: string) {
    "use server";
    await deleteNotification(id);
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Notificaciones</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Recordatorios del sistema, sellos, plazos y notificaciones de
            audiencias
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo como leído
            </Button>
          </form>
        )}
      </div>

      <div className="ll-surface overflow-hidden rounded-lg">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
            No hay notificaciones
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                  !n.read && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    n.read ? "bg-muted" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="block min-w-0 hover:underline"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {typeLabels[n.type] ?? n.type}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 truncate text-[13px]",
                            !n.read && "font-medium",
                            priorityClass[n.priority] ?? "text-foreground",
                          )}
                        >
                          {n.title}
                        </span>
                      </div>
                      {n.content && (
                        <p className="mt-1 truncate text-[12px] text-muted-foreground">
                          {n.content}
                        </p>
                      )}
                    </Link>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {typeLabels[n.type] ?? n.type}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 truncate text-[13px]",
                            !n.read && "font-medium",
                            priorityClass[n.priority] ?? "text-foreground",
                          )}
                        >
                          {n.title}
                        </span>
                      </div>
                      {n.content && (
                        <p className="mt-1 truncate text-[12px] text-muted-foreground">
                          {n.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time className="font-mono text-[10px] text-muted-foreground">
                    {formatTime(n.createdAt)}
                  </time>
                  <div className="flex items-center gap-0.5">
                    <form action={toggleReadAction.bind(null, n.id)}>
                      <button
                        type="submit"
                        title={
                          n.read
                            ? "Marcar como no leída"
                            : "Marcar como leída"
                        }
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-popover hover:text-primary"
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5",
                            n.read && "text-primary",
                          )}
                        />
                      </button>
                    </form>
                    <form action={deleteAction.bind(null, n.id)}>
                      <button
                        type="submit"
                        title="Eliminar notificación"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-popover hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString("es-AR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}