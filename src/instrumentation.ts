/**
 * Instrumentación de Next.js.
 * Solo ejecuta el scheduler en producción, en runtime nodejs, y si no está deshabilitado.
 * En desarrollo se salta por completo.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.DISABLE_CRON === "1") return;

const { registerCronJobs } = await import("@/server/cron/scheduler");
registerCronJobs();
}
