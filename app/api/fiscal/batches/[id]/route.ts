import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getBatchDetail } from "@/lib/repo/fiscal";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json(await getBatchDetail(id)); }
  catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}
