"use client";

import { useState } from "react";
import { Sidebar, type FirmBrand } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function AppShell({
  children,
  banner,
  firm,
  userAvatar,
}: {
  children: React.ReactNode;
  /** v0.27: banner de aviso superior (se inyecta una vez renderizado en el servidor) */
  banner?: React.ReactNode;
  /** v0.42 ítem 1: marca de la barra lateral (nombre del bufete / subtítulo / logo) */
  firm: FirmBrand;
  /** v0.43: avatar del usuario actual (se lee lo más reciente del servidor para mostrarlo en la barra superior) */
  userAvatar?: string | null;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar firm={firm} />
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        firm={firm}
      />
      <div className="md:pl-[208px]">
        <Topbar
          onMobileMenuToggle={() => setMobileNavOpen(true)}
          userAvatar={userAvatar ?? null}
        />
        {banner}
        <main className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5">
          {children}
        </main>
      </div>
    </div>
  );
}
