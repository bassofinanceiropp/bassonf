import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { emitNfce } from "@/lib/focus/provider";
import { archiveFocusArtifacts } from "@/lib/storage";
import {
  beginDocument,
  claimBatchItem,
  failDocument,
  finishBatchItem,
  finishDocument,
  getExistingDocument,
  getProfiles,
  getQueuedBatchItems,
  loadSnapshot,
  refreshBatch,
  recoverStaleBatchItems,
} from "@/lib/repo/fiscal";

async function runWorker(batchId?: string) {
  if (env.demoMode) return { demo: true, processed: 0, message: "Worker desabilitado no modo demonstração." };
  const profiles = await getProfiles();
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
      const response = await emitNfce(order, profiles);
      const raw = String(response?.status || response?.status_sefaz || "").toLowerCase();
      const authorized = raw.includes("autoriz") || !!response?.chave_nfe || !!response?.chave;
      await finishDocument(document.id, response);
      if (authorized) {
        try { await archiveFocusArtifacts(document.id, order.externalId, response); }
        catch (archiveError) { console.error("Falha ao arquivar XML/PDF", archiveError); }
      }
      await finishBatchItem(item.id, authorized ? "authorized" : "rejected", authorized ? undefined : response?.mensagem || response?.message);
      results.push({ orderId: order.externalId, status: authorized ? "authorized" : "rejected" });
    } catch (error: any) {
      if (document?.id) await failDocument(document.id, error);
      const statusCode = Number(error?.status || 0);
      const technical = statusCode >= 500 || statusCode === 0;
      await finishBatchItem(item.id, technical ? "technical_failure" : "rejected", error?.message || "Falha na emissão");
      results.push({ orderId: item.external_order_id, status: technical ? "technical_failure" : "rejected", message: error?.message });
    }
  }

  for (const id of touched) await refreshBatch(id);
  return { processed: results.length, results, batchId: batchId || null };
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await request.json().catch(() => ({}));
    const batchId = typeof body?.batchId === "string" && body.batchId ? body.batchId : undefined;
    return NextResponse.json(await runWorker(batchId));
  } catch (error: any) {
    const unauthorized = error?.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Não autorizado" : (error?.message || "Falha ao processar fila fiscal") }, { status: unauthorized ? 401 : 500 });
  }
}
