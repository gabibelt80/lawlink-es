import { AppShell } from "@/components/layout/app-shell";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { listActiveBanners } from "@/server/announcements/actions";
import { getSession } from "@/lib/auth/session";
import { getFirmProfile } from "@/server/settings/firm-profile";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const banners = session?.user ? await listActiveBanners() : [];

  let profile = { firmName: "LawLink", firmSubtitle: "", logoDataUrl: null as string | null };
  let avatar: string | null = null;

  if (session?.user) {
    // Para system admin (firmId=null), no hay perfil del tenant
    if (session.user.firmId) {
      try {
        profile = await getFirmProfile();
      } catch {
        // Silencioso: si no hay tenant, usa defaults
      }
    }

    // Avatar del usuario
    if (session.user.firmId) {
      try {
        const me = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { avatar: true }
        });
        avatar = me?.avatar ?? null;
      } catch {
        avatar = null;
      }
    }
  }

  const firm = {
    name: profile.firmName,
    subtitle: profile.firmSubtitle,
    logoDataUrl: profile.logoDataUrl
  };

  return (
    <AppShell
      firm={firm}
      userAvatar={avatar}
      banner={banners.length > 0 ? <AnnouncementBanner banners={banners} /> : null}
    >
      {children}
    </AppShell>
  );
}
