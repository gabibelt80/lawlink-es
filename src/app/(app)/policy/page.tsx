/**
 * v0.38: Pagina independiente de normas institucionales（Documentos del estudioDentro de POLICY Categoria，Solo listar archivos、No mostrar filtro de categoria）
 * v0.44: TituloyBoton de subir en la misma linea（Ya no hideHeader，Cambiar a headerTitle Sobrescribir）
 */
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "@/app/(app)/firm-resources/_components/firm-files-view";

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; includeOld?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const files = await listFirmFiles({
    category: "POLICY",
    search: params.q?.trim(),
    includeSuperseded: params.includeOld === "1",
  });

  return (
    <FirmFilesView
      files={files}
      canUpload={isManager}
      currentCategory="POLICY"
      currentSearch={params.q ?? ""}
      includeSuperseded={params.includeOld === "1"}
      basePath="/policy"
      hideCategoryNav
      headerTitle="Normativas internas"
      headerSubtitle={`Documentación completa de normas de la firma (manual del empleado, acuerdo de confidencialidad, políticas salariales, etc.).${isManager ? " Los administradores pueden subir y reemplazar versiones" : " Los administradores pueden subir"}`}
      headerIcon={
        <BookText className="h-5 w-5 text-primary" strokeWidth={1.8} />
      }
    />
  );
}
