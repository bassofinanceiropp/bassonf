import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listDocumentsPage } from "@/lib/repo/fiscal";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50)));
    const result = await listDocumentsPage({
      start: url.searchParams.get("start") || undefined,
      end: url.searchParams.get("end") || undefined,
      orderStart: url.searchParams.get("orderStart") || undefined,
      orderEnd: url.searchParams.get("orderEnd") || undefined,
      status: url.searchParams.get("status") || undefined,
      q: url.searchParams.get("q") || undefined,
      payment: url.searchParams.get("payment") || undefined,
      source: url.searchParams.get("source") || undefined,
    }, page, pageSize);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
