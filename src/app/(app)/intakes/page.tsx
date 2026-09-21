import { redirect } from "next/navigation";

// v0.4: /intakes Lista ya fusionada en /matters?tab=intake，ViejoEnlaceRedirigir
export default function IntakesPage() {
  redirect("/matters?tab=intake");
}
