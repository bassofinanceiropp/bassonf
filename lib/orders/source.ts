import { env } from "@/lib/env";
import type { FiscalOrder, FiscalStatus, OrderSource, PaymentMethod } from "@/lib/types";
import { demoOrders } from "./demo";

export interface OrderQuery {
  start?: string;
  end?: string;
  payment?: string;
  source?: string;
  fiscalStatus?: string;
  q?: string;
}

function filterDemo(query: OrderQuery) {
  return demoOrders.filter((order) => {
    const day = order.orderedAt.slice(0, 10);
    if (query.start && day < query.start) return false;
    if (query.end && day > query.end) return false;
    if (query.payment && query.payment !== "all" && order.paymentMethod !== query.payment) return false;
    if (query.source && query.source !== "all" && order.source !== query.source) return false;
    if (query.fiscalStatus && query.fiscalStatus !== "all" && order.fiscalStatus !== query.fiscalStatus) return false;
    if (query.q && !order.number.includes(query.q.trim())) return false;
    return true;
  });
}

export async function fetchOrders(query: OrderQuery): Promise<FiscalOrder[]> {
  if (env.demoMode) return filterDemo(query);
  if (!env.ordersApiUrl) throw new Error("BASSO_ORDERS_API_URL não configurada");

  const url = new URL(env.ordersApiUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.ordersApiKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha ao consultar pedidos da Basso (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.orders)) throw new Error("Contrato inválido da API de pedidos");

  const payments = new Set<PaymentMethod>(["pix", "cash", "debit", "credit", "other"]);
  const sources = new Set<OrderSource>(["cardapio", "pdv", "mesa", "ifood", "99food", "other"]);
  const fiscalStatuses = new Set<FiscalStatus>(["not_issued", "queued", "processing", "authorized", "rejected", "technical_failure", "cancelled"]);

  return data.orders.map((raw: any, index: number): FiscalOrder => {
    if (!raw || typeof raw !== "object") throw new Error(`Pedido inválido na posição ${index + 1}`);
    const externalId = String(raw.externalId ?? raw.id ?? "").trim();
    const number = String(raw.number ?? externalId).trim();
    if (!externalId || !number || !raw.orderedAt || !Array.isArray(raw.items)) throw new Error(`Contrato inválido no pedido ${number || index + 1}`);
    const payment = payments.has(raw.paymentMethod) ? raw.paymentMethod as PaymentMethod : "other";
    const source = sources.has(raw.source) ? raw.source as OrderSource : "other";
    const status = ["paid", "completed", "cancelled"].includes(raw.status) ? raw.status : "completed";
    const fiscalStatus = fiscalStatuses.has(raw.fiscalStatus) ? raw.fiscalStatus as FiscalStatus : "not_issued";
    const items = raw.items.map((item: any, itemIndex: number) => ({
      id: String(item?.id ?? `${externalId}-item-${itemIndex + 1}`),
      sku: String(item?.sku ?? item?.productId ?? item?.id ?? "").trim(),
      name: String(item?.name ?? item?.description ?? "Produto").trim(),
      quantity: Number(item?.quantity ?? 0),
      unitPrice: Number(item?.unitPrice ?? 0),
      total: Number(item?.total ?? (Number(item?.quantity ?? 0) * Number(item?.unitPrice ?? 0))),
      notes: item?.notes ?? null,
    }));
    if (items.some((item: any) => !item.sku || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.total))) throw new Error(`Itens inválidos no pedido ${number}`);
    return {
      id: String(raw.id ?? externalId), externalId, number, orderedAt: String(raw.orderedAt),
      customerName: raw.customerName ?? null, customerTaxId: raw.customerTaxId ?? null,
      paymentMethod: payment, source, fulfillment: ["delivery", "pickup", "dine_in"].includes(raw.fulfillment) ? raw.fulfillment : null,
      total: Number(raw.total ?? 0), subtotal: Number(raw.subtotal ?? raw.total ?? 0), discount: Number(raw.discount ?? 0), deliveryFee: Number(raw.deliveryFee ?? 0),
      status, fiscalStatus, items,
    };
  });
}
