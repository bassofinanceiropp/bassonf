import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { consultNfce, emitNfce } from "@/lib/focus/provider";
import { archiveFocusArtifacts } from "@/lib/storage";
import {
  addFiscalEvent,
  beginDocument,
  claimBatchItem,
  failDocument,
  finishBatchItem,
  finishDocument,
  getExistingDocument,
  getFiscalSettings,
  getProfiles,
  getQueuedBatchItems,
  loadSnapshot,
  refreshBatch,
  recoverStaleBatchItems,
} from "@/lib/repo/fiscal";
import { requireSameOrigin } from "@/lib/security";

function isAuthorized(response: any) {
  const raw = String(response?.status || response?.status_sefaz || "").toLowerCase();
  return raw.includes("autoriz") || !!response?.chave_nfe || !!response?.chave;
}

async function processQueue(batchId?: string) {
  if (env.demoMode) return { demo: true, processed: 0, message: "Processamento real desabilitado no modo demonstração." };
  const profiles = await getProfiles();
  const settings = await getFiscalSettings();
  await recoverStaleBatchItems(10);
  const items = await getQueuedBatchItems(10, batchId);
  const touched = new Set<string>();
  const results: any[] = [];

  for (const item of items) {
    if (!(await claimBatchItem(item.id))) continue;
    touched.add(item.batch_id);
    let document: any = null;
    try {
      const order = await loadSnapshot(item.external_order_id);
      const existing = await getExistingDocument(order.externalId);
      if (existing?.status === "authorized") {
        await finishBatchItem(item.id, "authorized");
        results.push({ orderId: order.externalId, status: "already_authorized" });
        continue;
      }
      document = await beginDocument(order, item.batch_id);
      await addFiscalEvent(document.id, "attempt", "processing", `Tentativa ${Number(item.attempts || 0) + 1} de emissão.`);

      // Em retentativa, consulta a referência antes de reenviar. Isso evita duplicidade
      // se a SEFAZ autorizou mas a resposta anterior não chegou ao PedidoPro Fiscal.
      if (Number(item.attempts || 0) > 0) {
        const consulted = await consultNfce(document.provider_reference, settings);
        if (consulted && isAuthorized(consulted)) {
          await finishDocument(document.id, consulted);
          try { await archiveFocusArtifacts(document.id, order.externalId, consulted, settings); await addFiscalEvent(document.id, "archive", "authorized", "XML/DANFC-e arquivados no storage privado."); } catch (archiveError: any) { console.error("Falha ao arquivar XML/PDF", archiveError); await addFiscalEvent(document.id, "archive_failure", "warning", archiveError?.message || "Falha ao arquivar XML/DANFC-e."); }
          await finishBatchItem(item.id, "authorized");
          results.push({ orderId: order.externalId, status: "authorized_after_consult" });
          continue;
        }
      }

      const response = await emitNfce(order, profiles, settings);
      const authorized = isAuthorized(response);
      await finishDocument(document.id, response);
      if (authorized) {
        try { await archiveFocusArtifacts(document.id, order.externalId, response, settings); await addFiscalEvent(document.id, "archive", "authorized", "XML/DANFC-e arquivados no storage privado."); }
        catch (archiveError: any) { console.error("Falha ao arquivar XML/PDF", archiveError); await addFiscalEvent(document.id, "archive_failure", "warning", archiveError?.message || "Falha ao arquivar XML/DANFC-e."); }
      }
      await finishBatchItem(item.id, authorized ? "authorized" : "rejected", authorized ? undefined : response?.mensagem || response?.message);
      results.push({ orderId: order.externalId, status: authorized ? "authorized" : "rejected" });
    } catch (error: any) {
      if (document?.id) await failDocument(document.id, error);
      const statusCode = Number(error?.status || 0);
      const technical = statusCode === 0 || statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
      await finishBatchItem(item.id, technical ? "technical_failure" : "rejected", error?.message || "Falha na emissão");
      results.push({ orderId: item.external_order_id, status: technical ? "technical_failure" : "rejected", message: error?.message });
    }
  }

  for (const id of touched) await refreshBatch(id);
  return { processed: results.length, results, batchId: batchId || null };
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireSession();
    const body = await request.json().catch(() => ({}));
    const batchId = typeof body?.batchId === "string" && body.batchId ? body.batchId : undefined;
    return NextResponse.json(await processQueue(batchId));
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "INVALID_ORIGIN" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Não autorizado" : (error?.message || "Falha ao processar fila fiscal") }, { status });
  }
}
