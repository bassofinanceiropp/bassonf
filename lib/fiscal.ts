import type { FiscalOrder, ProductFiscalProfile, ValidationIssue } from "@/lib/types";

export function validateOrders(orders: FiscalOrder[], profiles: ProductFiscalProfile[]): ValidationIssue[] {
  const bySku = new Map(profiles.map((p) => [p.sku, p]));
  const issues: ValidationIssue[] = [];
  for (const order of orders) {
    if (!order.items.length) issues.push({ orderId: order.id, orderNumber: order.number, code: "NO_ITEMS", message: "Pedido sem itens." });
    const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
    const expected = itemsTotal - order.discount + order.deliveryFee;
    if (Math.abs(expected - order.total) > 0.02) issues.push({ orderId: order.id, orderNumber: order.number, code: "TOTAL_MISMATCH", message: `Total do pedido (${order.total.toFixed(2)}) não confere com itens/desconto/entrega (${expected.toFixed(2)}).` });
    for (const item of order.items) {
      const profile = bySku.get(item.sku);
      if (!profile) issues.push({ orderId: order.id, orderNumber: order.number, code: "MISSING_PROFILE", message: `${item.name} (${item.sku}) está sem perfil fiscal.` });
      else if (!profile.ncm || !profile.cfop || !profile.cstCsosn) issues.push({ orderId: order.id, orderNumber: order.number, code: "INCOMPLETE_PROFILE", message: `${item.name} possui perfil fiscal incompleto.` });
    }
  }
  return issues;
}
