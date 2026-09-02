/**
 * v0.38: 制度规范独立页（Documentos del estudio里的 POLICY 分类，只列文件、不显分类筛选）
 * v0.44: 标题y上传按钮同行（不再 hideHeader，改用 headerTitle 覆盖）
 */
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "@/app/(app)/firm-resources/_components/firm-files-view";

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: { q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const files = await listFirmFiles({
    category: "POLICY",
    search: searchParams.q?.trim(),
    includeSuperseded: searchParams.includeOld === "1",
  });

  return (
    <FirmFilesView
      files={files}
      canUpload={isManager}
      currentCategory="POLICY"
      currentSearch={searchParams.q ?? ""}
      includeSuperseded={searchParams.includeOld === "1"}
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
