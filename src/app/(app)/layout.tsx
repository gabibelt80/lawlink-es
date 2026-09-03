import { AppShell } from "@/components/layout/app-shell";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { listActiveBanners } from "@/server/announcements/actions";
import { getSession } from "@/lib/auth/session";
import { getFirmProfile } from "@/server/settings/firm-profile";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // v0.27: Banner de anuncios superior — solo se obtiene después de iniciar sesión;
  // sin sesión se usa el layout (auth) y no este layout
  const session = await getSession();
  const banners = session?.user ? await listActiveBanners() : [];

  // v0.42 ítem 1: Marca de la barra lateral (nombre del estudio / subtítulo / Logo)
  // configurable en la página de Configuración
  const profile = await getFirmProfile();
  const firm = {
    name: profile.firmName,
    subtitle: profile.firmSubtitle,
    logoDataUrl: profile.logoDataUrl
  };

  // v0.43: Avatar del usuario actual (se lee de la base para evitar caché JWT),
  // permite refrescar la barra superior al instante
  const me = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatar: true }
      })
    : null;

  return (
    <AppShell
      firm={firm}
      userAvatar={me?.avatar ?? null}
      banner={banners.length > 0 ? <AnnouncementBanner banners={banners} /> : null}
    >
      {children}
    </AppShell>
  );
}