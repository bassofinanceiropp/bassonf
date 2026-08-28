import type { FiscalOrder, ProductFiscalProfile } from "@/lib/types";

export const demoProfiles: ProductFiscalProfile[] = [
  { sku: "PIZ-MARG-G", name: "Pizza Margherita Grande", ncm: "19059090", cfop: "5102", cstCsosn: "102", origin: "0", unit: "UN" },
  { sku: "PIZ-CAL-G", name: "Pizza Calabresa Grande", ncm: "19059090", cfop: "5102", cstCsosn: "102", origin: "0", unit: "UN" },
  { sku: "REF-COCA-2L", name: "Coca-Cola 2L", ncm: "22021000", cest: "0301000", cfop: "5405", cstCsosn: "500", origin: "0", unit: "UN" },
  { sku: "SOB-TIRA", name: "Tiramisù", ncm: "19059090", cfop: "5102", cstCsosn: "102", origin: "0", unit: "UN" },
];

const items = {
  pizza: { id: "i1", sku: "PIZ-MARG-G", name: "Pizza Margherita Grande", quantity: 1, unitPrice: 89.9, total: 89.9 },
  cal: { id: "i2", sku: "PIZ-CAL-G", name: "Pizza Calabresa Grande", quantity: 1, unitPrice: 94, total: 94 },
  coca: { id: "i3", sku: "REF-COCA-2L", name: "Coca-Cola 2L", quantity: 1, unitPrice: 18, total: 18 },
  tira: { id: "i4", sku: "SOB-TIRA", name: "Tiramisù", quantity: 1, unitPrice: 29, total: 29 },
};

export const demoOrders: FiscalOrder[] = [
  { id: "o1051", externalId: "1051", number: "1051", orderedAt: "2026-08-01T22:42:00.000Z", customerName: "João", paymentMethod: "pix", source: "cardapio", total: 107.9, subtotal: 107.9, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "not_issued", items: [items.pizza, items.coca] },
  { id: "o1058", externalId: "1058", number: "1058", orderedAt: "2026-08-01T23:16:00.000Z", customerName: "Maria", paymentMethod: "pix", source: "pdv", total: 123, subtotal: 123, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "not_issued", items: [items.cal, items.tira] },
  { id: "o1063", externalId: "1063", number: "1063", orderedAt: "2026-08-01T23:48:00.000Z", customerName: "Carlos", paymentMethod: "pix", source: "mesa", total: 94, subtotal: 94, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "not_issued", items: [items.cal] },
  { id: "o1071", externalId: "1071", number: "1071", orderedAt: "2026-08-02T00:35:00.000Z", customerName: "Fernanda", paymentMethod: "credit", source: "cardapio", total: 136.9, subtotal: 136.9, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "authorized", items: [items.pizza, items.coca, items.tira] },
  { id: "o1084", externalId: "1084", number: "1084", orderedAt: "2026-08-02T01:11:00.000Z", customerName: "Rafael", paymentMethod: "cash", source: "pdv", total: 112, subtotal: 112, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "not_issued", items: [items.cal, items.coca] },
  { id: "o1090", externalId: "1090", number: "1090", orderedAt: "2026-08-03T22:50:00.000Z", customerName: "Bianca", paymentMethod: "debit", source: "ifood", total: 118.9, subtotal: 118.9, discount: 0, deliveryFee: 0, status: "completed", fiscalStatus: "rejected", items: [items.pizza, items.tira] },
];
