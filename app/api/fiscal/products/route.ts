import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { bulkAssignProfile, listFiscalProducts, saveProductFiscal } from "@/lib/repo/fiscal";
import { requireSameOrigin } from "@/lib/security";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const result = await listFiscalProducts({ q: url.searchParams.get("q") || undefined, status: url.searchParams.get("status") || undefined, profileId: url.searchParams.get("profileId") || undefined }, Math.max(1, Number(url.searchParams.get("page") || 1)), Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50))));
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    const body = await request.json();
    if (body.action === "bulk_profile") {
      const ids = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
      if (!ids.length) return NextResponse.json({ error: "Selecione produtos." }, { status: 400 });
      return NextResponse.json(await bulkAssignProfile(ids, body.profileId ? String(body.profileId) : null, session.email));
    }
    if (!String(body.sku || "").trim() || !String(body.name || "").trim()) return NextResponse.json({ error: "SKU e produto são obrigatórios." }, { status: 400 });
    return NextResponse.json({ product: await saveProductFiscal(body, session.email) });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
