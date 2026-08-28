import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { env, productionConfigurationIssues } from "@/lib/env";
import { adminSupabase } from "@/lib/repo/supabase";
import { fetchOrders } from "@/lib/orders/source";
import { getFiscalSettings, getProductStats } from "@/lib/repo/fiscal";
import type { IntegrationHealthItem } from "@/lib/types";
import { asDateInput } from "@/lib/utils";

export async function GET() {
  try {
    await requireSession();
    const checkedAt = new Date().toISOString();
    const items: IntegrationHealthItem[] = [];

    if (env.demoMode) {
      items.push({ key: "database", label: "Banco fiscal", status: "demo", detail: "Modo demonstração", checkedAt });
      items.push({ key: "storage", label: "Storage", status: "demo", detail: "Arquivos físicos desabilitados no demo", checkedAt });
      items.push({ key: "orders", label: "Pedidos Basso", status: "demo", detail: "Fonte demonstrativa ativa", checkedAt });
      items.push({ key: "focus", label: "Focus NFe", status: "demo", detail: "Nenhuma chamada fiscal real é feita", checkedAt });
    } else {
      try { const db = adminSupabase(); const { error } = await db.from("fiscal_settings").select("id").limit(1); if (error) throw error; items.push({ key: "database", label: "Banco fiscal", status: "online", detail: "Supabase respondeu normalmente", checkedAt }); }
      catch (e: any) { items.push({ key: "database", label: "Banco fiscal", status: "offline", detail: e.message || "Falha ao consultar Supabase", checkedAt }); }
      try { const db = adminSupabase(); const { error } = await db.storage.getBucket(env.storageBucket); if (error) throw error; items.push({ key: "storage", label: "Storage", status: "online", detail: `Bucket ${env.storageBucket} disponível`, checkedAt }); }
      catch (e: any) { items.push({ key: "storage", label: "Storage", status: "warning", detail: e.message || "Bucket indisponível", checkedAt }); }
      try { const today = asDateInput(); const orders = await fetchOrders({ start: today, end: today }); items.push({ key: "orders", label: "Pedidos Basso", status: "online", detail: `API respondeu; ${orders.length} pedido(s) no recorte de hoje`, checkedAt }); }
      catch (e: any) { items.push({ key: "orders", label: "Pedidos Basso", status: "offline", detail: e.message || "API de pedidos indisponível", checkedAt }); }
      items.push({ key: "focus", label: "Focus NFe", status: env.focusToken ? "configured" : "offline", detail: env.focusToken ? `Token configurado em ${env.focusEnv}. A validade é confirmada na homologação/emissão.` : "FOCUS_NFE_TOKEN ausente", checkedAt });
    }
    const settings = await getFiscalSettings();
    const products = await getProductStats().catch(() => ({ total: 0, complete: 0, incomplete: 0, unassigned: 0 }));
    const checklist = [
      { key: "supabase", label: "Banco fiscal configurado", ok: env.demoMode || (!!env.supabaseUrl && !!env.supabaseServiceRoleKey) },
      { key: "orders", label: "API read-only da Basso", ok: env.demoMode || (!!env.ordersApiUrl && !!env.ordersApiKey) },
      { key: "focus", label: "Token Focus NFe", ok: env.demoMode || !!env.focusToken },
      { key: "cnpj", label: "CNPJ cadastrado", ok: env.demoMode || !!settings.companyDocument },
      { key: "ie", label: "Inscrição Estadual cadastrada", ok: env.demoMode || !!settings.companyIe },
      { key: "crt", label: "CRT/regime cadastrado", ok: env.demoMode || !!settings.companyCrt },
      { key: "products", label: "Produtos fiscais completos", ok: env.demoMode || (products.total > 0 && products.incomplete === 0) },
      { key: "environment", label: "Ambiente fiscal definido", ok: !!settings.environment },
    ];
    return NextResponse.json({ items, checklist, settings, products, configurationIssues: env.demoMode ? [] : productionConfigurationIssues() });
  } catch (e: any) { return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 }); }
}
