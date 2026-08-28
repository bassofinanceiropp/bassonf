import { env } from "@/lib/env";
import type { FiscalDocument, FiscalOrder, ProductFiscalProfile } from "@/lib/types";
import { demoProfiles, demoOrders } from "@/lib/orders/demo";
import { adminSupabase } from "./supabase";
import { safeReference } from "@/lib/utils";

export async function getProfiles(): Promise<ProductFiscalProfile[]> {
  if (env.demoMode) return demoProfiles;
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_products_view").select("*").eq("active", true).order("product_name");
  if (error) throw error;
  return (data || []).map((row: any) => ({
    sku: row.sku,
    name: row.product_name,
    ncm: row.ncm,
    cest: row.cest,
    cfop: row.cfop,
    cstCsosn: row.cst_csosn,
    origin: row.origin,
    unit: row.unit,
    pisCode: row.pis_code,
    cofinsCode: row.cofins_code,
    icmsRate: row.icms_rate === null ? null : Number(row.icms_rate),
  }));
}

export async function createBatch(orders: FiscalOrder[], actor: string) {
  if (env.demoMode) {
    return { id: `demo-${Date.now()}`, orderIds: orders.map(o => o.externalId), status: "queued", createdBy: actor, created_at: new Date().toISOString() };
  }
  const db = adminSupabase();
  const payload = orders.map(order => ({
    external_order_id: order.externalId,
    provider_reference: safeReference(`${env.companySlug}-order-${order.externalId}`),
    total_amount: order.total,
    order_date: order.orderedAt,
  }));
  const { data, error } = await db.rpc("create_fiscal_batch", {
    p_created_by: actor,
    p_orders: payload,
  });
  if (error) throw error;
  const batchId = typeof data === "string" ? data : data?.id || data;
  const { data: batch, error: readError } = await db.from("fiscal_batches").select("*").eq("id", batchId).single();
  if (readError) throw readError;
  return batch;
}

export async function getExistingDocument(orderId: string): Promise<FiscalDocument | null> {
  if (env.demoMode) return null;
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_documents").select("*")
    .eq("external_order_id", orderId)
    .in("status", ["queued", "processing", "authorized"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDocument(data) : null;
}

export async function saveOrderSnapshot(order: FiscalOrder) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const { error } = await db.from("fiscal_orders").upsert({
    external_order_id: order.externalId,
    order_number: order.number,
    ordered_at: order.orderedAt,
    customer_name: order.customerName || null,
    customer_tax_id: order.customerTaxId || null,
    payment_method: order.paymentMethod,
    source: order.source,
    subtotal: order.subtotal,
    discount: order.discount,
    delivery_fee: order.deliveryFee,
    total: order.total,
    order_status: order.status,
    snapshot: order,
    synced_at: new Date().toISOString(),
  }, { onConflict: "external_order_id" });
  if (error) throw error;
}

export async function listBatches(limit = 50) {
  if (env.demoMode) {
    return [
      { id: "demo-00184", status: "completed", orders_count: 18, authorized_count: 17, rejected_count: 1, total_amount: 1967.8, created_at: "2026-08-27T18:30:00.000Z", completed_at: "2026-08-27T18:31:10.000Z" },
      { id: "demo-00183", status: "completed", orders_count: 12, authorized_count: 12, rejected_count: 0, total_amount: 1314.5, created_at: "2026-08-26T20:05:00.000Z", completed_at: "2026-08-26T20:05:42.000Z" },
    ];
  }
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_batches").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listDocuments(filters: { start?: string; end?: string; status?: string; q?: string } = {}, limit = 500) {
  if (env.demoMode) {
    let docs = demoOrders.filter(o => o.fiscalStatus !== "not_issued").map((o, i) => ({
      id: `doc-${o.id}`,
      external_order_id: o.externalId,
      order_number: o.number,
      provider_reference: `basso-order-${o.externalId}`,
      status: o.fiscalStatus,
      number: String(1840 + i),
      series: "1",
      access_key: o.fiscalStatus === "authorized" ? `352608000000000001656500100000${1840+i}0000000000` : null,
      total_amount: o.total,
      ordered_at: o.orderedAt,
      issued_at: o.fiscalStatus === "authorized" ? "2026-08-27T18:40:00.000Z" : null,
      error_message: o.fiscalStatus === "rejected" ? "Demonstração: cadastro fiscal precisa de revisão." : null,
      payment_method: o.paymentMethod,
      source: o.source,
    }));
    if (filters.status && filters.status !== "all") docs = docs.filter(d => d.status === filters.status);
    if (filters.start) docs = docs.filter(d => !d.issued_at || d.issued_at.slice(0,10) >= filters.start!);
    if (filters.end) docs = docs.filter(d => !d.issued_at || d.issued_at.slice(0,10) <= filters.end!);
    if (filters.q) docs = docs.filter(d => d.order_number.includes(filters.q!) || d.number.includes(filters.q!) || (d.access_key || "").includes(filters.q!));
    return docs.slice(0, limit);
  }
  const db = adminSupabase();
  let query = db.from("fiscal_documents_view").select("*").order("created_at", { ascending: false }).limit(limit);
  if (filters.start) query = query.gte("issued_at", `${filters.start}T00:00:00-03:00`);
  if (filters.end) query = query.lte("issued_at", `${filters.end}T23:59:59-03:00`);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q) query = query.or(`order_number.ilike.%${filters.q}%,number.ilike.%${filters.q}%,access_key.ilike.%${filters.q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


export async function recoverStaleBatchItems(minutes = 10) {
  if (env.demoMode) return 0;
  const db = adminSupabase();
  const threshold = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await db.from("fiscal_batch_items")
    .update({ status: "queued", started_at: null, error_message: "Recuperado após processamento interrompido." })
    .eq("status", "processing")
    .lt("started_at", threshold)
    .select("id");
  if (error) throw error;
  return data?.length || 0;
}

export async function getQueuedBatchItems(limit = 10, batchId?: string) {
  if (env.demoMode) return [];
  const db = adminSupabase();
  let query = db.from("fiscal_batch_items")
    .select("id,batch_id,external_order_id,status,attempts")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (batchId) query = query.eq("batch_id", batchId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function claimBatchItem(id: string) {
  if (env.demoMode) return true;
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_batch_items")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function loadSnapshot(externalOrderId: string): Promise<FiscalOrder> {
  if (env.demoMode) {
    const found = demoOrders.find(o => o.externalId === externalOrderId);
    if (!found) throw new Error(`Pedido ${externalOrderId} não encontrado`);
    return found;
  }
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_orders").select("snapshot").eq("external_order_id", externalOrderId).single();
  if (error) throw error;
  return data.snapshot as FiscalOrder;
}

export async function beginDocument(order: FiscalOrder, batchId: string) {
  if (env.demoMode) return { id: `doc-${order.externalId}`, provider_reference: safeReference(`${env.companySlug}-order-${order.externalId}`) };
  const db = adminSupabase();
  const { data: existing, error: findError } = await db.from("fiscal_documents")
    .select("*")
    .eq("external_order_id", order.externalId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    if (existing.status === "processing") return existing;
    const { data, error } = await db.from("fiscal_documents")
      .update({ status: "processing" })
      .eq("id", existing.id)
      .eq("status", "queued")
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  // Caminho de recuperação para uma retentativa técnica em que não existe mais doc ativo.
  const providerReference = safeReference(`${env.companySlug}-order-${order.externalId}`);
  const { data, error } = await db.from("fiscal_documents").insert({
    external_order_id: order.externalId,
    batch_id: batchId,
    provider: "focus_nfe",
    provider_reference: providerReference,
    document_type: "nfce",
    status: "processing",
    total_amount: order.total,
    order_date: order.orderedAt,
  }).select("*").single();
  if (error) throw error;
  return data;
}

export async function finishDocument(documentId: string, result: any) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const rawStatus = String(result?.status || result?.status_sefaz || "").toLowerCase();
  const authorized = rawStatus.includes("autoriz") || !!result?.chave_nfe || !!result?.chave;
  const values = authorized ? {
    status: "authorized",
    number: result?.numero || result?.numero_nfe || null,
    series: result?.serie || null,
    access_key: result?.chave_nfe || result?.chave || null,
    protocol: result?.protocolo || result?.protocolo_autorizacao || null,
    issued_at: new Date().toISOString(),
    xml_path: result?.caminho_xml_nota_fiscal || result?.url_xml || null,
    pdf_path: result?.caminho_danfe || result?.url_danfe || null,
    qr_code: result?.qrcode_url || result?.qr_code || null,
    error_code: null,
    error_message: null,
    provider_response: result,
  } : {
    status: "rejected",
    error_code: String(result?.codigo || result?.status_sefaz || "REJECTED"),
    error_message: result?.mensagem || result?.message || "Documento rejeitado pelo provedor/SEFAZ.",
    provider_response: result,
  };
  const { error } = await db.from("fiscal_documents").update(values).eq("id", documentId);
  if (error) throw error;
}

export async function failDocument(documentId: string, errorInput: any) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const statusCode = Number(errorInput?.status || 0);
  const technical = statusCode >= 500 || statusCode === 0;
  const { error } = await db.from("fiscal_documents").update({
    status: technical ? "technical_failure" : "rejected",
    error_code: statusCode ? String(statusCode) : "TECHNICAL_FAILURE",
    error_message: errorInput?.message || "Falha ao emitir NFC-e.",
    provider_response: errorInput?.body || null,
  }).eq("id", documentId);
  if (error) throw error;
}

export async function finishBatchItem(id: string, status: "authorized" | "rejected" | "technical_failure", errorMessage?: string) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const { data: current } = await db.from("fiscal_batch_items").select("attempts").eq("id", id).single();
  const attempts = Number(current?.attempts || 0) + 1;
  const requeue = status === "technical_failure" && attempts < 3;
  const { error } = await db.from("fiscal_batch_items").update({
    status: requeue ? "queued" : status,
    attempts,
    error_message: errorMessage || null,
    finished_at: requeue ? null : new Date().toISOString(),
    started_at: requeue ? null : undefined,
  }).eq("id", id);
  if (error) throw error;
}

export async function refreshBatch(batchId: string) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const { data: items, error } = await db.from("fiscal_batch_items").select("status,external_order_id").eq("batch_id", batchId);
  if (error) throw error;
  const authorized = (items || []).filter((i: any) => i.status === "authorized").length;
  const rejected = (items || []).filter((i: any) => ["rejected", "technical_failure"].includes(i.status)).length;
  const open = (items || []).some((i: any) => ["queued", "processing"].includes(i.status));
  const { data: docs } = await db.from("fiscal_documents").select("total_amount,status").eq("batch_id", batchId);
  const totalAmount = (docs || []).filter((d: any)=>d.status === "authorized").reduce((sum: number,d: any)=>sum+Number(d.total_amount||0),0);
  const { error: updateError } = await db.from("fiscal_batches").update({
    status: open ? "processing" : "completed",
    authorized_count: authorized,
    rejected_count: rejected,
    total_amount: totalAmount,
    completed_at: open ? null : new Date().toISOString(),
  }).eq("id", batchId);
  if (updateError) throw updateError;
}

export async function getDocumentById(id: string) {
  if (env.demoMode) {
    const docs = await listDocuments();
    return docs.find((d:any)=>d.id===id) || null;
  }
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_documents").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function markCancelled(id: string, response: any) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const { error } = await db.from("fiscal_documents").update({ status: "cancelled", cancelled_at: new Date().toISOString(), provider_response: response }).eq("id", id);
  if (error) throw error;
}

function mapDocument(data: any): FiscalDocument {
  return {
    id: data.id,
    orderId: data.external_order_id,
    batchId: data.batch_id,
    providerReference: data.provider_reference,
    status: data.status,
    number: data.number,
    series: data.series,
    accessKey: data.access_key,
    protocol: data.protocol,
    totalAmount: Number(data.total_amount || 0),
    issuedAt: data.issued_at,
    cancelledAt: data.cancelled_at,
    xmlUrl: data.xml_path,
    pdfUrl: data.pdf_path,
    qrCode: data.qr_code,
    errorCode: data.error_code,
    errorMessage: data.error_message,
  };
}

export async function overlayFiscalStatuses(orders: FiscalOrder[]): Promise<FiscalOrder[]> {
  if (env.demoMode || orders.length === 0) return orders;
  const db = adminSupabase();
  const ids = orders.map(o => o.externalId);
  const { data, error } = await db.from("fiscal_documents")
    .select("external_order_id,status,created_at")
    .in("external_order_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const latest = new Map<string, string>();
  for (const row of data || []) if (!latest.has(row.external_order_id)) latest.set(row.external_order_id, row.status);
  return orders.map(order => ({ ...order, fiscalStatus: (latest.get(order.externalId) || "not_issued") as FiscalOrder["fiscalStatus"] }));
}
