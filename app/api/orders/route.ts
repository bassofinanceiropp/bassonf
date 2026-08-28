import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchOrders } from "@/lib/orders/source";
import { overlayFiscalStatuses } from "@/lib/repo/fiscal";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const requestedFiscalStatus = url.searchParams.get("fiscalStatus") || undefined;
    const orderStatus = url.searchParams.get("orderStatus") || undefined;
    const minRaw = url.searchParams.get("minValue");
    const maxRaw = url.searchParams.get("maxValue");
    const minValue = minRaw !== null && minRaw.trim() !== "" ? Number(minRaw) : null;
    const maxValue = maxRaw !== null && maxRaw.trim() !== "" ? Number(maxRaw) : null;
    let orders = await fetchOrders({
      start: url.searchParams.get("start") || undefined,
      end: url.searchParams.get("end") || undefined,
      payment: url.searchParams.get("payment") || undefined,
      source: url.searchParams.get("source") || undefined,
      fiscalStatus: undefined,
      q: url.searchParams.get("q") || undefined,
    });
    orders = await overlayFiscalStatuses(orders);
    if (requestedFiscalStatus && requestedFiscalStatus !== "all") orders = orders.filter(order => order.fiscalStatus === requestedFiscalStatus);
    if (orderStatus && orderStatus !== "all") orders = orders.filter(order => order.status === orderStatus);
    if (minValue !== null && Number.isFinite(minValue)) orders = orders.filter(order => order.total >= minValue);
    if (maxValue !== null && Number.isFinite(maxValue)) orders = orders.filter(order => order.total <= maxValue);
    return NextResponse.json({ orders, total: orders.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
