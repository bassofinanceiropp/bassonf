import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchOrders } from "@/lib/orders/source";
import { saveOrderSnapshot, upsertProductsFromOrders, audit } from "@/lib/repo/fiscal";
import { env } from "@/lib/env";
import { requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    if (env.demoMode) return NextResponse.json({ demo: true, synced: 0, products: 0, message: "Sincronização real desabilitada em DEMO_MODE." });
    const body = await request.json().catch(() => ({}));
    const orders = await fetchOrders({ start: body.start, end: body.end });
    for (const order of orders) await saveOrderSnapshot(order);
    const products = await upsertProductsFromOrders(orders);
    await audit(session.email, "orders.sync", "fiscal_order", null, { orders: orders.length, products });
    return NextResponse.json({ synced: orders.length, products });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
