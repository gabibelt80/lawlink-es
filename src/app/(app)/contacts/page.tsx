/**
 * v0.38: Pagina independiente de contactos（v0.37 Anteriormente fusionado con /service-center，Ahora separado de vuelta）
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listExternalContacts } from "@/server/external-contacts/actions";
import { prisma } from "@/lib/prisma";
import { ContactsView } from "./_components/contacts-view";

export default async function ContactsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const [externalContacts, colleagues] = await Promise.all([
    listExternalContacts(),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <ContactsView
      colleagues={colleagues}
      externalContacts={externalContacts}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
