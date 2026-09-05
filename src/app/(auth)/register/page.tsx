import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { RegisterForm } from "./_components/register-form";

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <RegisterForm />
    </div>
  );
}