import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listDocuments } from "@/lib/repo/fiscal";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const documents = await listDocuments({
      start: url.searchParams.get("start") || undefined,
      end: url.searchParams.get("end") || undefined,
      status: url.searchParams.get("status") || undefined,
      q: url.searchParams.get("q") || undefined,
    });
    return NextResponse.json({ documents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
