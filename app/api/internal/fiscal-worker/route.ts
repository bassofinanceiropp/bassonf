import { NextResponse } from "next/server";
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

async function runWorker() {
  if (env.demoMode) return { demo: true, processed: 0, message: "Worker desabilitado no modo demonstração." };
  const profiles = await getProfiles();
  await recoverStaleBatchItems(10);
  const items = await getQueuedBatchItems(20);
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

  for (const batchId of touched) await refreshBatch(batchId);
  return { processed: results.length, results };
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret") || new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== env.workerSecret) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await runWorker());
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await runWorker());
}
