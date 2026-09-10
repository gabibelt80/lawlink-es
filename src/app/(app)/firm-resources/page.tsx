/**
 * v0.38: Documentos del estudio volvió a ser página independiente
 * v0.44: La clasificación cambió a contratos/cartas/licencias/otros
 */
import type { FirmFileCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "./_components/firm-files-view";

const VALID_CATEGORIES: FirmFileCategory[] = ["CONTRACT", "LETTER", "LICENSE", "OTHER_FIRM"];

export default async function FirmResourcesPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; q?: string; includeOld?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const category =
    params.category && (VALID_CATEGORIES as string[]).includes(params.category)
      ? (params.category as FirmFileCategory)
      : undefined;

  const files = await listFirmFiles({
    category,
    search: params.q?.trim(),
    includeSuperseded: params.includeOld === "1"
  });

  return (
    <FirmFilesView
      files={files}
      canUpload={isManager}
      currentCategory={category}
      currentSearch={params.q ?? ""}
      includeSuperseded={params.includeOld === "1"}
      categorySet="firm"
    />
  );
}
