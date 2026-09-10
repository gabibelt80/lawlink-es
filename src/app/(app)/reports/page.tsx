import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getReportData, periodPresets } from "@/server/reports/queries";
import { resolveReportPeriod } from "@/server/reports/resolve-period";
import {
  getCaseCycleAnalysis,
  getReviewIssueAnalysis
} from "@/server/reports/analytics";
import { ReportsView } from "./_components/reports-view";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/dashboard");
  }

  const resolved = resolveReportPeriod(params);
  const [data, cycle, reviewAnalysis] = await Promise.all([
    getReportData(resolved.period),
    getCaseCycleAnalysis(resolved.period),
    getReviewIssueAnalysis(resolved.period)
  ]);
  const presets = periodPresets();

  return (
    <ReportsView
      periodKey={resolved.periodKey}
      periodLabel={resolved.period.label}
      customStart={resolved.startStr}
      customEnd={resolved.endStr}
      resolveError={resolved.error}
      data={data}
      cycle={cycle}
      reviewAnalysis={reviewAnalysis}
      presetLabels={{
        month: presets.month.label,
        quarter: presets.quarter.label,
        year: presets.year.label,
        lastYear: presets.lastYear.label
      }}
    />
  );
}
