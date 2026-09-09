import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DangerZoneView } from "./_components/danger-zone-view";

export default async function DangerZonePage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) redirect("/");

  const firm = firmUser.firm;

  return (
    <DangerZoneView
      firm={{
        id: firm.id,
        name: firm.name,
        deletedAtScheduled: firm.deletedAtScheduled,
        subscriptionStatus: firm.subscriptionStatus,
      }}
    />
  );
}
