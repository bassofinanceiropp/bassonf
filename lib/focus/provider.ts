import { env } from "@/lib/env";
import { safeReference } from "@/lib/utils";
import type { FiscalOrder, ProductFiscalProfile } from "@/lib/types";

function baseUrl() {
  if (env.focusBaseUrl) return env.focusBaseUrl.replace(/\/$/, "");
  return env.focusEnv === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

function authHeader() {
  if (!env.focusToken) throw new Error("FOCUS_NFE_TOKEN não configurado");
  return `Basic ${Buffer.from(`${env.focusToken}:`).toString("base64")}`;
}

function digits(value?: string | null) { return (value || "").replace(/\D/g, ""); }

function presenceCode(order: FiscalOrder) {
  if (order.fulfillment === "delivery" || order.source === "ifood" || order.source === "99food") return 4;
  if (order.source === "cardapio" && !order.fulfillment) return 2;
  return 1;
}

function paymentCode(method: FiscalOrder["paymentMethod"]) {
  const map: Record<string, string> = {
    cash: "01",
    credit: "03",
    debit: "04",
    pix: "17",
    other: "99",
  };
  return map[method] || "99";
}

export function buildFocusPayload(order: FiscalOrder, profiles: ProductFiscalProfile[]) {
  const bySku = new Map(profiles.map((p) => [p.sku, p]));
  const items = order.items.map((item, index) => {
    const profile = bySku.get(item.sku);
    if (!profile) throw new Error(`Produto ${item.name} (${item.sku}) sem perfil fiscal`);
    return {
      numero_item: String(index + 1),
      codigo_produto: item.sku,
      descricao: item.name,
      codigo_ncm: profile.ncm,
      codigo_cest: profile.cest || undefined,
      cfop: profile.cfop,
      unidade_comercial: profile.unit || "UN",
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.unitPrice,
      valor_bruto: item.total,
      icms_origem: profile.origin,
      icms_situacao_tributaria: profile.cstCsosn,
      pis_situacao_tributaria: profile.pisCode || undefined,
      cofins_situacao_tributaria: profile.cofinsCode || undefined,
    };
  });

  // O adapter fica isolado justamente para permitir adequar o payload ao cadastro tributário
  // validado pela contabilidade e à versão vigente da Focus sem mexer no restante do sistema.
  return {
    natureza_operacao: "VENDA",
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    consumidor_final: 1,
    presenca_comprador: presenceCode(order),
    cnpj_emitente: digits(env.companyDocument) || undefined,
    inscricao_estadual_emitente: digits(env.companyIe) || undefined,
    regime_tributario_emitente: env.companyCrt || undefined,
    nome_destinatario: order.customerName || undefined,
    cpf_destinatario: digits(order.customerTaxId).length === 11 ? digits(order.customerTaxId) : undefined,
    cnpj_destinatario: digits(order.customerTaxId).length === 14 ? digits(order.customerTaxId) : undefined,
    itens: items,
    formas_pagamento: [{ forma_pagamento: paymentCode(order.paymentMethod), valor_pagamento: order.total }],
    valor_frete: order.deliveryFee || 0,
    valor_desconto: order.discount || 0,
  };
}

async function focusFetch(path: string, init: RequestInit) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const message = body?.mensagem || body?.message || body?.erro || `Focus NFe HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number; body?: unknown };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function emitNfce(order: FiscalOrder, profiles: ProductFiscalProfile[]) {
  if (env.demoMode) {
    return {
      ref: safeReference(`basso-order-${order.externalId}`),
      status: "autorizado",
      numero: String(9000 + Number(order.number || 0)).slice(-9),
      serie: "1",
      chave_nfe: `DEMO${order.externalId.padStart(40, "0")}`,
      caminho_xml_nota_fiscal: null,
      caminho_danfe: null,
      demo: true,
    };
  }
  const ref = safeReference(`${env.companySlug}-order-${order.externalId}`);
  const payload = buildFocusPayload(order, profiles);
  const path = `${env.focusEmitPath}?ref=${encodeURIComponent(ref)}`;
  const result = await focusFetch(path, { method: "POST", body: JSON.stringify(payload) });
  return { ref, ...result };
}

export async function cancelNfce(ref: string, justification: string) {
  if (env.demoMode) return { status: "cancelado", ref, demo: true };
  const template = env.focusCancelPathTemplate.replace("{ref}", encodeURIComponent(ref));
  const separator = template.includes("?") ? "&" : "?";
  return focusFetch(`${template}${separator}justificativa=${encodeURIComponent(justification)}`, { method: "DELETE" });
}

export async function downloadFocusArtifact(pathOrUrl: string) {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${baseUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha ao baixar artefato fiscal (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
