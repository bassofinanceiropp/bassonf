import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getProfiles, getExistingDocument, upsertProductsFromOrders } from "@/lib/repo/fiscal";
import { blockingIssues, validateOrders } from "@/lib/fiscal";
import type { FiscalOrder, ValidationIssue } from "@/lib/types";
import { requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireSession();
    const body = await request.json();
    const orders = (body.orders || []) as FiscalOrder[];
    if (!Array.isArray(orders) || orders.length === 0) return NextResponse.json({ error: "Selecione pelo menos um pedido." }, { status: 400 });
    if (orders.length > 500) return NextResponse.json({ error: "Limite de 500 pedidos por lote." }, { status: 400 });
    await upsertProductsFromOrders(orders);
    const profiles = await getProfiles();
    const issues: ValidationIssue[] = validateOrders(orders, profiles);
    for (const order of orders) {
      const existing = await getExistingDocument(order.externalId);
      if (existing) issues.push({ orderId: order.id, orderNumber: order.number, code: "DUPLICATE", message: "Já existe documento fiscal ativo/na fila para este pedido.", severity: "error" });
    }
    const blockedIds = new Set(blockingIssues(issues).map(i => i.orderId));
    return NextResponse.json({ issues, validCount: orders.length - blockedIds.size, blockedCount: blockedIds.size, warningCount: issues.filter(i => i.severity === "warning").length });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
