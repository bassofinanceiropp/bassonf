import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import type { FiscalOrder } from "@/lib/types";
import { createBatch, getProfiles, getExistingDocument, saveOrderSnapshot, upsertProductsFromOrders, getFiscalSettings } from "@/lib/repo/fiscal";
import { blockingIssues, validateOrders } from "@/lib/fiscal";
import { emitNfce } from "@/lib/focus/provider";
import { env } from "@/lib/env";
import { requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    const body = await request.json();
    const orders = (body.orders || []) as FiscalOrder[];
    if (!Array.isArray(orders) || !orders.length) return NextResponse.json({ error: "Nenhum pedido selecionado." }, { status: 400 });
    if (orders.length > 500) return NextResponse.json({ error: "Limite de 500 pedidos por lote." }, { status: 400 });
    const settings = await getFiscalSettings();
    if (!env.demoMode) {
      const missing = [
        !env.focusToken ? "token da Focus NFe" : null,
        !settings.active ? "módulo fiscal ativo" : null,
        !settings.companyDocument ? "CNPJ" : null,
        !settings.companyIe ? "Inscrição Estadual" : null,
        !settings.companyCrt ? "CRT/regime tributário" : null,
      ].filter(Boolean);
      if (missing.length) return NextResponse.json({ error: `Configuração fiscal incompleta: ${missing.join(", ")}.`, code: "FISCAL_CONFIG_INCOMPLETE" }, { status: 409 });
    }
    await upsertProductsFromOrders(orders);
    const profiles = await getProfiles();
    const issues = validateOrders(orders, profiles);
    const blocked = blockingIssues(issues);
    if (blocked.length) return NextResponse.json({ error: "Há pedidos inválidos. Execute a pré-validação novamente.", issues }, { status: 422 });
    for (const order of orders) if (await getExistingDocument(order.externalId)) return NextResponse.json({ error: `Pedido #${order.number} já possui emissão ativa.` }, { status: 409 });
    if (!env.demoMode) {
      for (const order of orders) await saveOrderSnapshot(order);
    }
    const batch = await createBatch(orders, session.email);
    const results: any[] = [];
    if (env.demoMode) for (const order of orders) results.push({ orderId: order.externalId, result: await emitNfce(order, profiles, settings) });
    return NextResponse.json({ batch, queued: orders.length, processed: env.demoMode ? orders.length : 0, results, demo: env.demoMode, warnings: issues.filter(i => i.severity === "warning") });
  } catch (e: any) {
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Erro" }, { status });
  }
}
