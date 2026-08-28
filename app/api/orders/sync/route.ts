import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchOrders } from "@/lib/orders/source";
import { saveOrderSnapshot } from "@/lib/repo/fiscal";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    await requireSession();
    if (env.demoMode) return NextResponse.json({ demo: true, synced: 0, message: "Sinagendamentoização real desabilitada em DEMO_MODE." });
    const body = await request.json().catch(() => ({}));
    const orders = await fetchOrders({ start: body.start, end: body.end });
    for (const order of orders) await saveOrderSnapshot(order);
    return NextResponse.json({ synced: orders.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
