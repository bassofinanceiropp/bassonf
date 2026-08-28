import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listDocuments } from "@/lib/repo/fiscal";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || start;
    if (!start || !end) return NextResponse.json({ error: "Informe o período." }, { status: 400 });
    const all = await listDocuments({ start, end }, 5000);
    const authorized = all.filter((d: any) => d.status === "authorized");
    const cancelled = all.filter((d: any) => d.status === "cancelled");
    const total = authorized.reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0);
    const group = (key: "payment_method"|"source") => Object.entries(authorized.reduce((acc: Record<string,{count:number;total:number}>, d: any) => { const k=String(d[key]||"other"); const row=acc[k]||{count:0,total:0}; row.count++; row.total+=Number(d.total_amount||0); acc[k]=row; return acc; }, {}));
    const byPayment = group("payment_method").map(([key,value])=>({key,...value}));
    const bySource = group("source").map(([key,value])=>({key,...value}));
    const byDay = Object.entries(authorized.reduce((acc: Record<string,{count:number;total:number}>, d: any) => { const day=String(d.issued_at||"").slice(0,10)||"sem-data"; const row=acc[day]||{count:0,total:0}; row.count++; row.total+=Number(d.total_amount||0); acc[day]=row; return acc; }, {})).map(([day,value])=>({day,...value})).sort((a,b)=>a.day.localeCompare(b.day));
    return NextResponse.json({
      authorized: authorized.length, cancelled: cancelled.length, total,
      xml: authorized.filter((d: any) => d.xml_path).length, pdf: authorized.filter((d: any) => d.pdf_path).length,
      byPayment, bySource, byDay,
    });
  } catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}
