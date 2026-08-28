import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listProfileRows, saveProfile } from "@/lib/repo/fiscal";
import { requireSameOrigin } from "@/lib/security";

export async function GET() {
  try { await requireSession(); return NextResponse.json({ profiles: await listProfileRows() }); }
  catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    const body = await request.json();
    if (!String(body.name || "").trim()) return NextResponse.json({ error: "Informe o nome do perfil." }, { status: 400 });
    return NextResponse.json({ profile: await saveProfile(body, session.email) });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
