"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppMotionProvider } from "@/components/patterns/app-motion-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppMotionProvider>
        {/*
          delayDuration: retraso al pasar el cursor por primera vez, para evitar activaciones accidentales al desplazar la barra de herramientas.
          skipDelayDuration: durante este intervalo después de cerrar un tooltip, el siguiente tooltip se abre de inmediato,
          para que toda la barra de herramientas responda de forma fluida, sin sacrificar la protección contra activaciones accidentales del primer retraso.
        */}
        <TooltipProvider delayDuration={300} skipDelayDuration={200}>
          {children}
        </TooltipProvider>
        <Toaster />
      </AppMotionProvider>
    </SessionProvider>
  );
}
