import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";

/**
 * Server Component / Server Action ä¸­è¯»å–å½“å‰ sessionã€‚
 * æœªIniciar sesiÃ³nVolver nullã€‚
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * è¦æ±‚Iniciar sesiÃ³nï¼ŒæœªIniciar sesiÃ³nå¼ºåˆ¶è·³ /loginã€‚
 * åœ¨ Server Component / Server Action ä¸­ä½¿ç”¨ã€‚
 */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

