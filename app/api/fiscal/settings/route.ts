import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getFiscalSettings, saveFiscalSettings } from "@/lib/repo/fiscal";
import { digits } from "@/lib/utils";
import { requireSameOrigin } from "@/lib/security";

export async function GET() {
  try { await requireSession(); return NextResponse.json({ settings: await getFiscalSettings() }); }
  catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    const body = await request.json();
    if (!body.companyName) return NextResponse.json({ error: "Nome da empresa é obrigatório." }, { status: 400 });
    if (body.companyDocument && digits(body.companyDocument).length !== 14) return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    if (!['homologacao','producao'].includes(body.environment)) return NextResponse.json({ error: "Ambiente inválido." }, { status: 400 });
    return NextResponse.json({ settings: await saveFiscalSettings({ ...body, companySlug: body.companySlug || "la-forneria-basso", documentType: "nfce", active: body.active !== false }, session.email) });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
