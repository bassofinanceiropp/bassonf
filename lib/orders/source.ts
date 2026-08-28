import { env } from "@/lib/env";
import type { FiscalOrder } from "@/lib/types";
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
  return data.orders as FiscalOrder[];
}
