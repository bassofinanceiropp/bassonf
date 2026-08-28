export type PaymentMethod = "pix" | "cash" | "debit" | "credit" | "other";
export type OrderSource = "cardapio" | "pdv" | "mesa" | "ifood" | "99food" | "other";
export type FiscalStatus =
  | "not_issued"
  | "queued"
  | "processing"
  | "authorized"
  | "rejected"
  | "technical_failure"
  | "cancelled";

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
}

export interface FiscalOrder {
  id: string;
  externalId: string;
  number: string;
  orderedAt: string;
  customerName?: string | null;
  customerTaxId?: string | null;
  paymentMethod: PaymentMethod;
  source: OrderSource;
  fulfillment?: "delivery" | "pickup" | "dine_in" | null;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  status: "paid" | "completed" | "cancelled";
  fiscalStatus: FiscalStatus;
  items: OrderItem[];
}

export interface ProductFiscalProfile {
  sku: string;
  name: string;
  ncm: string;
  cest?: string | null;
  cfop: string;
  cstCsosn: string;
  origin: string;
  unit: string;
  pisCode?: string | null;
  cofinsCode?: string | null;
  icmsRate?: number | null;
}

export interface FiscalDocument {
  id: string;
  orderId: string;
  batchId?: string | null;
  providerReference: string;
  status: FiscalStatus;
  number?: string | null;
  series?: string | null;
  accessKey?: string | null;
  protocol?: string | null;
  totalAmount: number;
  issuedAt?: string | null;
  cancelledAt?: string | null;
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  qrCode?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface ValidationIssue {
  orderId: string;
  orderNumber: string;
  code: string;
  message: string;
}
