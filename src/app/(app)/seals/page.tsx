import { redirect } from "next/navigation";

// v0.8.1：/seals Renombrar a /approvals/seals，Conservar 308 Redirigir al anteriorEnlace
export default function LegacySealsRedirect() {
  redirect("/approvals/seals");
}
