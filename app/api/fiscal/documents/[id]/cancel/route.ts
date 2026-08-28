import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { cancelNfce } from "@/lib/focus/provider";
import { getDocumentById, getFiscalSettings, markCancelled } from "@/lib/repo/fiscal";
import { requireSameOrigin } from "@/lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const justification = String(body.justification || "").trim();
    if (justification.length < 15) return NextResponse.json({ error: "Informe uma justificativa com pelo menos 15 caracteres." }, { status: 400 });
    if (justification.length > 255) return NextResponse.json({ error: "A justificativa deve ter no máximo 255 caracteres." }, { status: 400 });
    const document = await getDocumentById(id);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    if (document.status !== "authorized") return NextResponse.json({ error: "Somente documentos autorizados podem ser enviados para cancelamento." }, { status: 409 });
    const settings = await getFiscalSettings();
    const result = await cancelNfce(document.provider_reference, justification, settings);
    await markCancelled(id, result, session.email, justification);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro no cancelamento" }, { status });
  }
}
