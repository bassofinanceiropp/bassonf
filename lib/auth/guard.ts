import { redirect } from "next/navigation";
import { currentSession } from "./session";

export async function guardPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return session;
}
