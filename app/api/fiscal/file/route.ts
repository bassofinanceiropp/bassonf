import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { downloadStored } from "@/lib/storage";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  try {
    await requireSession();
    if (env.demoMode) return NextResponse.json({ error: "Arquivo físico não existe no modo demonstração." }, { status: 404 });
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    if (!path || path.includes("..") || !path.startsWith(`${env.companySlug}/`)) return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
    const bytes = await downloadStored(path);
    const isPdf = path.toLowerCase().endsWith(".pdf");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": isPdf ? "application/pdf" : "application/xml",
        "Content-Disposition": `attachment; filename="${path.split("/").pop()}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
