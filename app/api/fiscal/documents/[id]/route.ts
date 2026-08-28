import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getDocumentById, getDocumentEvents } from "@/lib/repo/fiscal";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const document = await getDocumentById(id);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    const events = await getDocumentEvents(id);
    return NextResponse.json({ document, events });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
