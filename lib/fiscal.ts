import type { FiscalOrder, ProductFiscalProfile, ValidationIssue } from "@/lib/types";

export function validateOrders(orders: FiscalOrder[], profiles: ProductFiscalProfile[]): ValidationIssue[] {
  const bySku = new Map(profiles.map((p) => [p.sku, p]));
  const issues: ValidationIssue[] = [];
  for (const order of orders) {
    if (!order.items.length) issues.push({ orderId: order.id, orderNumber: order.number, code: "NO_ITEMS", message: "Pedido sem itens.", severity: "error" });
    if (order.status === "cancelled") issues.push({ orderId: order.id, orderNumber: order.number, code: "ORDER_CANCELLED", message: "Pedido cancelado não pode seguir para emissão.", severity: "error" });
    const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
    const expected = itemsTotal - order.discount + order.deliveryFee;
    if (Math.abs(expected - order.total) > 0.02) issues.push({ orderId: order.id, orderNumber: order.number, code: "TOTAL_MISMATCH", message: `Total do pedido (${order.total.toFixed(2)}) não confere com itens/desconto/entrega (${expected.toFixed(2)}).`, severity: "error" });
    if (!order.customerTaxId) issues.push({ orderId: order.id, orderNumber: order.number, code: "CUSTOMER_TAX_ID_MISSING", message: "Consumidor sem CPF/CNPJ informado. Confirme se o dado é necessário para esta emissão.", severity: "warning" });
    for (const item of order.items) {
      const profile = bySku.get(item.sku);
      if (!profile) issues.push({ orderId: order.id, orderNumber: order.number, code: "MISSING_PROFILE", message: `${item.name} (${item.sku}) está sem configuração fiscal.`, severity: "error", sku: item.sku, productName: item.name });
      else if (!profile.ncm || !profile.cfop || !profile.cstCsosn) issues.push({ orderId: order.id, orderNumber: order.number, code: "INCOMPLETE_PROFILE", message: `${item.name} possui configuração fiscal incompleta.`, severity: "error", sku: item.sku, productName: item.name });
    }
  }
  return issues;
}

export function blockingIssues(issues: ValidationIssue[]) {
  return issues.filter((issue) => issue.severity !== "warning");
}
