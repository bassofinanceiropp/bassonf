import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchOrders } from "@/lib/orders/source";
import { overlayFiscalStatuses } from "@/lib/repo/fiscal";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const requestedFiscalStatus = url.searchParams.get("fiscalStatus") || undefined;
    let orders = await fetchOrders({
      start: url.searchParams.get("start") || undefined,
      end: url.searchParams.get("end") || undefined,
      payment: url.searchParams.get("payment") || undefined,
      source: url.searchParams.get("source") || undefined,
      // O status fiscal pertence ao projeto Fiscal, não ao sistema Basso.
      fiscalStatus: undefined,
      q: url.searchParams.get("q") || undefined,
    });
    orders = await overlayFiscalStatuses(orders);
    if (requestedFiscalStatus && requestedFiscalStatus !== "all") {
      orders = orders.filter(order => order.fiscalStatus === requestedFiscalStatus);
    }
    return NextResponse.json({ orders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
