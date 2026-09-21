"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Client, Contact } from "@prisma/client";
import { ClientSheet } from "@/app/(app)/clients/_components/client-sheet";

/**
 * v0.39: ClientePagina de detalle「EditarInformacion」Entrada。
 * La pagina de detalle es un componente de servidor，Envolver aqui una capaClienteLado state Reutilizar existente ClientSheet（IncluyeEditar + Contacto）。
 */
export function ClientEditButton({
  client
}: {
  client: Client & { contacts?: Contact[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
        EditarInformacion
      </button>
      <ClientSheet open={open} onOpenChange={setOpen} editingClient={client} />
    </>
  );
}
