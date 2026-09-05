/**
 * v0.38: Página independiente de anuncios (en v0.37 estaba integrada en /service-center, ahora separada)
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAnnouncements } from "@/server/announcements/actions";
import { AnnouncementsView } from "./_components/announcements-view";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";
  const announcements = await listAnnouncements();

  return (
    <AnnouncementsView
      items={announcements}
      isManager={isManager}
      currentUserId={session.user.id}
    />
  );
}