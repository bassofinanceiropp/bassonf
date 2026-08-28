import { env } from "@/lib/env";
import type {
  CompanyFiscalSettings,
  FiscalDocument,
  FiscalOrder,
  FiscalProductRow,
  FiscalProfileRow,
  ProductFiscalProfile,
} from "@/lib/types";
import { demoProfiles, demoOrders } from "@/lib/orders/demo";
import { adminSupabase } from "./supabase";
import { safeReference } from "@/lib/utils";

function demoSettings(): CompanyFiscalSettings {
  return {
    companySlug: env.companySlug,
    companyName: env.companyName,
    companyDocument: env.companyDocument,
    companyIe: env.companyIe,
    companyCrt: env.companyCrt,
    companyUf: env.companyUf,
    environment: env.focusEnv,
    documentType: "nfce",
    series: "1",
    active: true,
  };
}

export async function getFiscalSettings(): Promise<CompanyFiscalSettings> {
  if (env.demoMode || !env.supabaseUrl || !env.supabaseServiceRoleKey) return demoSettings();
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_settings").select("*").eq("company_slug", env.companySlug).maybeSingle();
  if (error) throw error;
  if (!data) return demoSettings();
  return {
    id: data.id,
    companySlug: data.company_slug,
    companyName: data.company_name,
    companyDocument: data.company_document || env.companyDocument,
    companyIe: data.company_ie || env.companyIe,
    companyCrt: data.company_crt || env.companyCrt,
    companyUf: data.company_uf || env.companyUf,
    addressStreet: data.address_street || "",
    addressNumber: data.address_number || "",
    addressComplement: data.address_complement || "",
    addressDistrict: data.address_district || "",
    addressCity: data.address_city || "",
    addressCityCode: data.address_city_code || "",
    addressZip: data.address_zip || "",
    environment: data.environment || env.focusEnv,
    documentType: "nfce",
    series: data.series || "1",
    active: data.active !== false,
  };
}

export async function saveFiscalSettings(input: CompanyFiscalSettings, actor: string) {
  if (env.demoMode) return { ...input, id: "demo-settings" };
  const db = adminSupabase();
  const payload = {
    company_slug: env.companySlug,
    company_name: input.companyName,
    company_document: input.companyDocument || null,
    company_ie: input.companyIe || null,
    company_crt: input.companyCrt || null,
    company_uf: input.companyUf || "SP",
    address_street: input.addressStreet || null,
    address_number: input.addressNumber || null,
    address_complement: input.addressComplement || null,
    address_district: input.addressDistrict || null,
    address_city: input.addressCity || null,
    address_city_code: input.addressCityCode || null,
    address_zip: input.addressZip || null,
    provider: "focus_nfe",
    environment: input.environment,
    document_type: "nfce",
    series: input.series || null,
    active: input.active,
  };
  const { data, error } = await db.from("fiscal_settings").upsert(payload, { onConflict: "company_slug" }).select("*").single();
  if (error) throw error;
  await audit(actor, "settings.update", "fiscal_settings", data.id, { environment: input.environment, companyUf: input.companyUf });
  return data;
}

export async function getProfiles(): Promise<ProductFiscalProfile[]> {
  if (env.demoMode) return demoProfiles;
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_products_view").select("*").eq("active", true).order("product_name");
  if (error) throw error;
  return (data || []).map(mapProductProfile);
}

function mapProductProfile(row: any): ProductFiscalProfile {
  return {
    sku: row.sku,
    name: row.product_name,
    ncm: row.ncm || "",
    cest: row.cest,
    cfop: row.cfop || "",
    cstCsosn: row.cst_csosn || "",
    origin: row.origin || "0",
    unit: row.unit || "UN",
    pisCode: row.pis_code,
    cofinsCode: row.cofins_code,
    icmsRate: row.icms_rate === null || row.icms_rate === undefined ? null : Number(row.icms_rate),
  };
}

export async function listFiscalProducts(filters: { q?: string; status?: string; profileId?: string } = {}, page = 1, pageSize = 50) {
  if (env.demoMode) {
    let rows: FiscalProductRow[] = demoProfiles.map((p, i) => ({ ...p, id: `demo-product-${i}`, profileId: null, profileName: "Demonstração", active: true, complete: !!(p.ncm && p.cfop && p.cstCsosn) }));
    if (filters.q) { const q = filters.q.toLowerCase(); rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)); }
    if (filters.status === "complete") rows = rows.filter((p) => p.complete);
    if (filters.status === "incomplete") rows = rows.filter((p) => !p.complete);
    const from = (page - 1) * pageSize;
    return { products: rows.slice(from, from + pageSize), total: rows.length, page, pageSize };
  }
  const db = adminSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = db.from("fiscal_products_view").select("*", { count: "exact" }).eq("active", true).order("product_name").range(from, to);
  if (filters.q) query = query.or(`product_name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%`);
  if (filters.profileId) query = query.eq("profile_id", filters.profileId);
  if (filters.status === "complete") query = query.eq("is_complete", true);
  if (filters.status === "incomplete") query = query.eq("is_complete", false);
  if (filters.status === "unassigned") query = query.is("profile_id", null);
  const { data, error, count } = await query;
  if (error) throw error;
  const products: FiscalProductRow[] = (data || []).map((row: any) => ({
    ...mapProductProfile(row),
    id: row.id,
    externalProductId: row.external_product_id,
    profileId: row.profile_id,
    profileName: row.profile_name,
    active: row.active,
    complete: !!row.is_complete,
  }));
  return { products, total: count || 0, page, pageSize };
}

export async function getProductStats() {
  if (env.demoMode) return { total: demoProfiles.length, complete: demoProfiles.length, incomplete: 0, unassigned: 0 };
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_products_view").select("profile_id,is_complete").eq("active", true);
  if (error) throw error;
  const rows = data || [];
  return {
    total: rows.length,
    complete: rows.filter((r: any) => r.is_complete).length,
    incomplete: rows.filter((r: any) => !r.is_complete).length,
    unassigned: rows.filter((r: any) => !r.profile_id).length,
  };
}

export async function listProfileRows(): Promise<FiscalProfileRow[]> {
  if (env.demoMode) return [
    { id: "demo-pizza", name: "Pizzas", ncm: "19059090", cfop: "5102", cstCsosn: "102", origin: "0", unit: "UN", active: true },
    { id: "demo-refri", name: "Refrigerantes", ncm: "22021000", cest: "0301000", cfop: "5405", cstCsosn: "500", origin: "0", unit: "UN", active: true },
  ];
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_product_profiles").select("*").eq("active", true).order("name");
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, name: row.name, ncm: row.ncm, cest: row.cest, cfop: row.cfop, cstCsosn: row.cst_csosn, origin: row.origin, unit: row.unit, pisCode: row.pis_code, cofinsCode: row.cofins_code, icmsRate: row.icms_rate === null ? null : Number(row.icms_rate), active: row.active }));
}

export async function saveProductFiscal(input: any, actor: string) {
  if (env.demoMode) return { ...input, id: input.id || `demo-${Date.now()}` };
  const db = adminSupabase();
  let inherited: any = null;
  if (input.profileId) {
    const { data, error } = await db.from("fiscal_product_profiles").select("ncm,cest,cfop,cst_csosn,origin,unit,pis_code,cofins_code,icms_rate").eq("id", input.profileId).maybeSingle();
    if (error) throw error; inherited = data;
  }
  const norm = (value: unknown) => value == null ? "" : String(value).trim();
  const candidates: Record<string, [unknown, unknown]> = {
    ncm: [input.ncm, inherited?.ncm], cest: [input.cest, inherited?.cest], cfop: [input.cfop, inherited?.cfop],
    cstCsosn: [input.cstCsosn, inherited?.cst_csosn], origin: [input.origin || "0", inherited?.origin || "0"],
    unit: [input.unit || "UN", inherited?.unit || "UN"], pisCode: [input.pisCode, inherited?.pis_code],
    cofinsCode: [input.cofinsCode, inherited?.cofins_code], icmsRate: [input.icmsRate, inherited?.icms_rate],
  };
  const overrides: Record<string, string> = {};
  for (const [key, [current, base]] of Object.entries(candidates)) {
    if (!input.profileId || norm(current) !== norm(base)) overrides[key] = norm(current);
  }
  const values = { sku: String(input.sku).trim(), product_name: String(input.name).trim(), profile_id: input.profileId || null, overrides, active: input.active !== false };
  let result;
  if (input.id) result = await db.from("fiscal_products").update(values).eq("id", input.id).select("*").single();
  else result = await db.from("fiscal_products").upsert(values, { onConflict: "sku" }).select("*").single();
  if (result.error) throw result.error;
  await audit(actor, "product.update", "fiscal_product", result.data.id, { sku: input.sku, profileId: input.profileId || null, overrideFields: Object.keys(overrides) });
  return result.data;
}

export async function bulkAssignProfile(productIds: string[], profileId: string | null, actor: string) {
  if (env.demoMode) return { updated: productIds.length };
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_products").update({ profile_id: profileId, overrides: {} }).in("id", productIds).select("id");
  if (error) throw error;
  await audit(actor, "product.bulk_profile", "fiscal_product", null, { count: data?.length || 0, profileId });
  return { updated: data?.length || 0 };
}

export async function saveProfile(input: any, actor: string) {
  if (env.demoMode) return { ...input, id: input.id || `demo-profile-${Date.now()}` };
  const db = adminSupabase();
  const values = { name: input.name, ncm: input.ncm || null, cest: input.cest || null, cfop: input.cfop || null, cst_csosn: input.cstCsosn || null, origin: input.origin || "0", unit: input.unit || "UN", pis_code: input.pisCode || null, cofins_code: input.cofinsCode || null, icms_rate: input.icmsRate === "" || input.icmsRate == null ? null : Number(input.icmsRate), active: input.active !== false };
  let result;
  if (input.id) result = await db.from("fiscal_product_profiles").update(values).eq("id", input.id).select("*").single();
  else result = await db.from("fiscal_product_profiles").insert(values).select("*").single();
  if (result.error) throw result.error;
  await audit(actor, "profile.update", "fiscal_product_profile", result.data.id, { name: input.name });
  return result.data;
}

export async function upsertProductsFromOrders(orders: FiscalOrder[]) {
  if (env.demoMode || !orders.length) return 0;
  const unique = new Map<string, { sku: string; product_name: string; external_product_id: string }>();
  for (const order of orders) for (const item of order.items) unique.set(item.sku, { sku: item.sku, product_name: item.name, external_product_id: item.id || item.sku });
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_products").upsert(Array.from(unique.values()), { onConflict: "sku", ignoreDuplicates: false }).select("id");
  if (error) throw error;
  return data?.length || 0;
}

export async function createBatch(orders: FiscalOrder[], actor: string) {
  if (env.demoMode) return { id: `demo-${Date.now()}`, orderIds: orders.map(o => o.externalId), status: "queued", orders_count: orders.length, createdBy: actor, created_at: new Date().toISOString() };
  const db = adminSupabase();
  const payload = orders.map(order => ({ external_order_id: order.externalId, provider_reference: safeReference(`${env.companySlug}-order-${order.externalId}`), total_amount: order.total, order_date: order.orderedAt }));
  const { data, error } = await db.rpc("create_fiscal_batch", { p_created_by: actor, p_orders: payload });
  if (error) throw error;
  const batchId = typeof data === "string" ? data : data?.id || data;
  const { data: batch, error: readError } = await db.from("fiscal_batches").select("*").eq("id", batchId).single();
  if (readError) throw readError;
  await audit(actor, "batch.create", "fiscal_batch", batchId, { orders: orders.length });
  return batch;
}

export async function getExistingDocument(orderId: string): Promise<FiscalDocument | null> {
  if (env.demoMode) return null;
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_documents").select("*").eq("external_order_id", orderId).in("status", ["queued", "processing", "authorized"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? mapDocument(data) : null;
}

export async function saveOrderSnapshot(order: FiscalOrder) {
  if (env.demoMode) return;
  const db = adminSupabase();
  const { error } = await db.from("fiscal_orders").upsert({ external_order_id: order.externalId, order_number: order.number, ordered_at: order.orderedAt, customer_name: order.customerName || null, customer_tax_id: order.customerTaxId || null, payment_method: order.paymentMethod, source: order.source, subtotal: order.subtotal, discount: order.discount, delivery_fee: order.deliveryFee, total: order.total, order_status: order.status, snapshot: order, synced_at: new Date().toISOString() }, { onConflict: "external_order_id" });
  if (error) throw error;
}

export async function listBatches(limit = 50) {
  if (env.demoMode) return [
    { id: "demo-00184", status: "completed", orders_count: 18, authorized_count: 17, rejected_count: 1, total_amount: 1967.8, created_at: "2026-08-27T18:30:00.000Z", completed_at: "2026-08-27T18:31:10.000Z" },
    { id: "demo-00183", status: "completed", orders_count: 12, authorized_count: 12, rejected_count: 0, total_amount: 1314.5, created_at: "2026-08-26T20:05:00.000Z", completed_at: "2026-08-26T20:05:42.000Z" },
  ];
  const db = adminSupabase();
  const { data, error } = await db.from("fiscal_batches").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getBatchDetail(id: string) {
  if (env.demoMode) {
    const batch = (await listBatches()).find((b: any) => b.id === id) || (await listBatches())[0];
    return { batch, items: demoOrders.slice(0, Math.min(batch?.orders_count || 4, demoOrders.length)).map((o, i) => ({ id: `bi-${i}`, external_order_id: o.externalId, order_number: o.number, status: i === 3 ? "rejected" : "authorized", attempts: i === 3 ? 2 : 1, error_message: i === 3 ? "Cadastro fiscal precisa de revisão." : null, total_amount: o.total })) };
  }
  const db = adminSupabase();
  const { data: batch, error } = await db.from("fiscal_batches").select("*").eq("id", id).single();
  if (error) throw error;
  const { data: items, error: itemError } = await db.from("fiscal_batch_items").select("id,batch_id,external_order_id,status,attempts,error_message,started_at,finished_at,created_at").eq("batch_id", id).order("created_at");
  if (itemError) throw itemError;
  const externalIds = (items || []).map((item: any) => item.external_order_id);
  const { data: orders } = externalIds.length ? await db.from("fiscal_orders").select("external_order_id,order_number,total").in("external_order_id", externalIds) : { data: [] as any[] };
  const byId = new Map((orders || []).map((order: any) => [order.external_order_id, order]));
  return { batch, items: (items || []).map((item: any) => { const order = byId.get(item.external_order_id) as any; return { ...item, order_number: order?.order_number || item.external_order_id, total_amount: Number(order?.total || 0) }; }) };
}

export async function listDocuments(filters: { start?: string; end?: string; orderStart?: string; orderEnd?: string; status?: string; q?: string; payment?: string; source?: string } = {}, limit = 500) {
  const result = await listDocumentsPage(filters, 1, limit);
  return result.documents;
}

export async function listDocumentsPage(filters: { start?: string; end?: string; orderStart?: string; orderEnd?: string; status?: string; q?: string; payment?: string; source?: string } = {}, page = 1, pageSize = 50) {
  if (env.demoMode) {
    let docs = demoOrders.filter(o => o.fiscalStatus !== "not_issued").map((o, i) => ({ id: `doc-${o.id}`, external_order_id: o.externalId, order_number: o.number, provider_reference: `basso-order-${o.externalId}`, status: o.fiscalStatus, number: String(1840 + i), series: "1", access_key: o.fiscalStatus === "authorized" ? `352608000000000001656500100000${1840+i}0000000000` : null, protocol: o.fiscalStatus === "authorized" ? `1352600000${i}` : null, total_amount: o.total, ordered_at: o.orderedAt, issued_at: o.fiscalStatus === "authorized" ? "2026-08-27T18:40:00.000Z" : null, error_message: o.fiscalStatus === "rejected" ? "Demonstração: cadastro fiscal precisa de revisão." : null, payment_method: o.paymentMethod, source: o.source, customer_name: o.customerName, xml_path: null, pdf_path: null, qr_code: null }));
    if (filters.status && filters.status !== "all") docs = docs.filter(d => d.status === filters.status);
    if (filters.start) docs = docs.filter(d => !d.issued_at || d.issued_at.slice(0,10) >= filters.start!);
    if (filters.end) docs = docs.filter(d => !d.issued_at || d.issued_at.slice(0,10) <= filters.end!);
    if (filters.orderStart) docs = docs.filter(d => d.ordered_at.slice(0,10) >= filters.orderStart!);
    if (filters.orderEnd) docs = docs.filter(d => d.ordered_at.slice(0,10) <= filters.orderEnd!);
    if (filters.payment && filters.payment !== "all") docs = docs.filter(d => d.payment_method === filters.payment);
    if (filters.source && filters.source !== "all") docs = docs.filter(d => d.source === filters.source);
    if (filters.q) { const q = filters.q.toLowerCase(); docs = docs.filter(d => d.order_number.includes(q) || d.number.includes(q) || (d.access_key || "").includes(q) || (d.customer_name || "").toLowerCase().includes(q)); }
    const total = docs.length; const from = (page - 1) * pageSize;
    return { documents: docs.slice(from, from + pageSize), total, page, pageSize };
  }
  const db = adminSupabase();
  const from = (page - 1) * pageSize; const to = from + pageSize - 1;
  let query = db.from("fiscal_documents_view").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (filters.start) query = query.gte("issued_at", `${filters.start}T00:00:00-03:00`);
  if (filters.end) query = query.lte("issued_at", `${filters.end}T23:59:59-03:00`);
  if (filters.orderStart) query = query.gte("ordered_at", `${filters.orderStart}T00:00:00-03:00`);
  if (filters.orderEnd) query = query.lte("ordered_at", `${filters.orderEnd}T23:59:59-03:00`);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.payment && filters.payment !== "all") query = query.eq("payment_method", filters.payment);
  if (filters.source && filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.q) query = query.or(`order_number.ilike.%${filters.q}%,number.ilike.%${filters.q}%,access_key.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { documents: data || [], total: count || 0, page, pageSize };
}

export async function recoverStaleBatchItems(minutes = 10) {
  if (env.demoMode) return 0;
  const db = adminSupabase(); const threshold = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await db.from("fiscal_batch_items").update({ status: "queued", started_at: null, error_message: "Recuperado após processamento interrompido." }).eq("status", "processing").lt("started_at", threshold).select("id");
  if (error) throw error; return data?.length || 0;
}

export async function getQueuedBatchItems(limit = 10, batchId?: string) {
  if (env.demoMode) return [];
  const db = adminSupabase(); let query = db.from("fiscal_batch_items").select("id,batch_id,external_order_id,status,attempts").eq("status", "queued").order("created_at", { ascending: true }).limit(limit);
  if (batchId) query = query.eq("batch_id", batchId);
  const { data, error } = await query; if (error) throw error; return data || [];
}

export async function claimBatchItem(id: string) {
  if (env.demoMode) return true;
  const db = adminSupabase(); const { data, error } = await db.from("fiscal_batch_items").update({ status: "processing", started_at: new Date().toISOString() }).eq("id", id).eq("status", "queued").select("id").maybeSingle();
  if (error) throw error; return !!data;
}

export async function loadSnapshot(externalOrderId: string): Promise<FiscalOrder> {
  if (env.demoMode) { const found = demoOrders.find(o => o.externalId === externalOrderId); if (!found) throw new Error(`Pedido ${externalOrderId} não encontrado`); return found; }
  const db = adminSupabase(); const { data, error } = await db.from("fiscal_orders").select("snapshot").eq("external_order_id", externalOrderId).single(); if (error) throw error; return data.snapshot as FiscalOrder;
}

export async function beginDocument(order: FiscalOrder, batchId: string) {
  if (env.demoMode) return { id: `doc-${order.externalId}`, provider_reference: safeReference(`${env.companySlug}-order-${order.externalId}`) };
  const db = adminSupabase();
  const { data: existing, error: findError } = await db.from("fiscal_documents").select("*").eq("external_order_id", order.externalId).eq("batch_id", batchId).in("status", ["queued", "processing", "technical_failure"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (findError) throw findError;
  if (existing) {
    if (existing.status === "processing") return existing;
    const { data, error } = await db.from("fiscal_documents").update({ status: "processing", error_code: null, error_message: null }).eq("id", existing.id).in("status", ["queued", "technical_failure"]).select("*").single(); if (error) throw error; return data;
  }
  const providerReference = safeReference(`${env.companySlug}-order-${order.externalId}`);
  const { data, error } = await db.from("fiscal_documents").insert({ external_order_id: order.externalId, batch_id: batchId, provider: "focus_nfe", provider_reference: providerReference, document_type: "nfce", status: "processing", total_amount: order.total, order_date: order.orderedAt }).select("*").single();
  if (error) throw error; return data;
}

export async function addFiscalEvent(documentId: string | null, eventType: string, status?: string | null, message?: string | null, payload?: any) {
  if (env.demoMode || !documentId) return;
  const db = adminSupabase();
  const { error } = await db.from("fiscal_events").insert({ document_id: documentId, event_type: eventType, status: status || null, message: message || null, provider_payload: payload || null });
  if (error) console.error("Falha ao registrar evento fiscal", error.message);
}

export async function finishDocument(documentId: string, result: any) {
  if (env.demoMode) return;
  const db = adminSupabase(); const rawStatus = String(result?.status || result?.status_sefaz || "").toLowerCase(); const authorized = rawStatus.includes("autoriz") || !!result?.chave_nfe || !!result?.chave;
  const values = authorized ? { status: "authorized", number: result?.numero || result?.numero_nfe || null, series: result?.serie || result?.serie_nfe || null, access_key: result?.chave_nfe || result?.chave || null, protocol: result?.protocolo || result?.protocolo_autorizacao || null, issued_at: new Date().toISOString(), xml_path: null, pdf_path: null, qr_code: result?.qrcode_url || result?.qr_code || null, error_code: null, error_message: null, provider_response: result } : { status: "rejected", error_code: String(result?.codigo || result?.status_sefaz || "REJECTED"), error_message: result?.mensagem || result?.message || "Documento rejeitado pelo provedor/SEFAZ.", provider_response: result };
  const { error } = await db.from("fiscal_documents").update(values).eq("id", documentId); if (error) throw error;
  await addFiscalEvent(documentId, authorized ? "authorization" : "rejection", authorized ? "authorized" : "rejected", authorized ? "NFC-e autorizada." : values.error_message, result);
}

export async function failDocument(documentId: string, errorInput: any) {
  if (env.demoMode) return;
  const db = adminSupabase(); const statusCode = Number(errorInput?.status || 0); const technical = statusCode === 0 || statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
  const { error } = await db.from("fiscal_documents").update({ status: technical ? "technical_failure" : "rejected", error_code: statusCode ? String(statusCode) : "TECHNICAL_FAILURE", error_message: errorInput?.message || "Falha ao emitir NFC-e.", provider_response: errorInput?.body || null }).eq("id", documentId); if (error) throw error;
  await addFiscalEvent(documentId, technical ? "technical_failure" : "rejection", technical ? "technical_failure" : "rejected", errorInput?.message || "Falha na emissão", errorInput?.body || null);
}

export async function finishBatchItem(id: string, status: "authorized" | "rejected" | "technical_failure", errorMessage?: string) {
  if (env.demoMode) return;
  const db = adminSupabase(); const { data: current } = await db.from("fiscal_batch_items").select("attempts").eq("id", id).single(); const attempts = Number(current?.attempts || 0) + 1; const requeue = status === "technical_failure" && attempts < 3;
  const values: any = { status: requeue ? "queued" : status, attempts, error_message: errorMessage || null, finished_at: requeue ? null : new Date().toISOString() };
  if (requeue) values.started_at = null;
  const { error } = await db.from("fiscal_batch_items").update(values).eq("id", id); if (error) throw error;
}

export async function refreshBatch(batchId: string) {
  if (env.demoMode) return;
  const db = adminSupabase(); const { data: items, error } = await db.from("fiscal_batch_items").select("status,external_order_id").eq("batch_id", batchId); if (error) throw error;
  const authorized = (items || []).filter((i: any) => i.status === "authorized").length; const rejected = (items || []).filter((i: any) => ["rejected", "technical_failure"].includes(i.status)).length; const open = (items || []).some((i: any) => ["queued", "processing"].includes(i.status));
  const { data: docs } = await db.from("fiscal_documents").select("total_amount,status").eq("batch_id", batchId); const totalAmount = (docs || []).filter((d: any) => d.status === "authorized").reduce((sum: number,d: any)=>sum+Number(d.total_amount||0),0);
  const { error: updateError } = await db.from("fiscal_batches").update({ status: open ? "processing" : "completed", authorized_count: authorized, rejected_count: rejected, total_amount: totalAmount, completed_at: open ? null : new Date().toISOString() }).eq("id", batchId); if (updateError) throw updateError;
}

export async function getDocumentById(id: string) {
  if (env.demoMode) { const docs = await listDocuments(); return docs.find((d:any)=>d.id===id) || docs[0] || null; }
  const db = adminSupabase(); const { data, error } = await db.from("fiscal_documents_view").select("*").eq("id", id).single(); if (error) throw error; return data;
}

export async function getDocumentEvents(id: string) {
  if (env.demoMode) return [
    { id: "e1", event_type: "created", status: "processing", message: "Documento criado e colocado na fila.", created_at: "2026-08-27T18:39:30.000Z" },
    { id: "e2", event_type: "authorization", status: "authorized", message: "NFC-e autorizada pela SEFAZ.", created_at: "2026-08-27T18:40:00.000Z" },
  ];
  const db = adminSupabase(); const { data, error } = await db.from("fiscal_events").select("id,event_type,status,message,created_at").eq("document_id", id).order("created_at"); if (error) throw error; return data || [];
}

export async function markCancelled(id: string, response: any, actor = "system", justification?: string) {
  if (env.demoMode) return;
  const db = adminSupabase(); const { error } = await db.from("fiscal_documents").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id); if (error) throw error;
  await addFiscalEvent(id, "cancellation", "cancelled", justification || "NFC-e cancelada.", response);
  await audit(actor, "document.cancel", "fiscal_document", id, { justification: justification || null });
}

function mapDocument(data: any): FiscalDocument { return { id: data.id, orderId: data.external_order_id, batchId: data.batch_id, providerReference: data.provider_reference, status: data.status, number: data.number, series: data.series, accessKey: data.access_key, protocol: data.protocol, totalAmount: Number(data.total_amount || 0), issuedAt: data.issued_at, cancelledAt: data.cancelled_at, xmlUrl: data.xml_path, pdfUrl: data.pdf_path, qrCode: data.qr_code, errorCode: data.error_code, errorMessage: data.error_message }; }

export async function overlayFiscalStatuses(orders: FiscalOrder[]): Promise<FiscalOrder[]> {
  if (env.demoMode || orders.length === 0) return orders;
  const db = adminSupabase(); const ids = orders.map(o => o.externalId); const { data, error } = await db.from("fiscal_documents").select("external_order_id,status,created_at").in("external_order_id", ids).order("created_at", { ascending: false }); if (error) throw error;
  const latest = new Map<string, string>(); for (const row of data || []) if (!latest.has(row.external_order_id)) latest.set(row.external_order_id, row.status);
  return orders.map(order => ({ ...order, fiscalStatus: (latest.get(order.externalId) || "not_issued") as FiscalOrder["fiscalStatus"] }));
}

export async function audit(actor: string | null, action: string, entityType?: string | null, entityId?: string | null, metadata: any = {}) {
  if (env.demoMode || !env.supabaseUrl || !env.supabaseServiceRoleKey) return;
  try { await adminSupabase().from("audit_logs").insert({ actor, action, entity_type: entityType || null, entity_id: entityId || null, metadata }); } catch (error) { console.error("Falha ao gravar auditoria", error); }
}

export async function listAudit(limit = 10) {
  if (env.demoMode) return [
    { id: 1, actor: env.adminEmail || "admin", action: "batch.create", entity_type: "fiscal_batch", metadata: { orders: 18 }, created_at: "2026-08-27T18:30:00.000Z" },
    { id: 2, actor: env.adminEmail || "admin", action: "document.cancel", entity_type: "fiscal_document", metadata: {}, created_at: "2026-08-26T20:12:00.000Z" },
  ];
  const db = adminSupabase(); const { data, error } = await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit); if (error) throw error; return data || [];
}

export async function recordExport(start: string, end: string, count: number, actor: string) {
  if (env.demoMode) return;
  const db = adminSupabase(); await db.from("fiscal_exports").insert({ period_start: start, period_end: end, documents_count: count, created_by: actor }); await audit(actor, "accounting.export", "fiscal_export", null, { start, end, count });
}

export async function listExports(limit = 12) {
  if (env.demoMode) return [{ id: "demo-export", period_start: "2026-08-01", period_end: "2026-08-31", documents_count: 438, created_by: env.adminEmail || "admin", created_at: "2026-08-27T20:00:00.000Z" }];
  const db = adminSupabase(); const { data, error } = await db.from("fiscal_exports").select("*").order("created_at", { ascending: false }).limit(limit); if (error) throw error; return data || [];
}
