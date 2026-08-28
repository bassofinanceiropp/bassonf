import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { listBatches } from "@/lib/repo/fiscal";
import { currency, dateTime } from "@/lib/utils";
import { ProcessQueueButton } from "@/components/ProcessQueueButton";

export default async function LotesPage() {
  const session = await guardPage();
  let batches: any[] = []; try { batches = await listBatches(); } catch {}
  return <Shell active="/lotes" email={session.email}>
    <div className="page-head"><div><h1 className="page-title">Lotes de emissão</h1><p className="page-desc">Cada rodada fica registrada. Fechar o navegador não apaga nem reinicia o lote.</p></div></div>
    <div className="card"><div className="table-wrap" style={{border:0}}><table><thead><tr><th>Lote</th><th>Criado</th><th>Pedidos</th><th>Autorizadas</th><th>Falhas</th><th>Valor autorizado</th><th>Status</th><th>Ação</th></tr></thead><tbody>{batches.map((b:any)=><tr key={b.id}><td><strong>{String(b.id).slice(0,16)}</strong></td><td>{dateTime(b.created_at)}</td><td>{b.orders_count}</td><td>{b.authorized_count||0}</td><td>{b.rejected_count||0}</td><td>{currency(Number(b.total_amount||0))}</td><td><span className={`badge ${b.status==='completed'?'green':'orange'}`}>{b.status==='completed'?'Finalizado':'Processando'}</span></td><td>{b.status==='completed'?'—':<ProcessQueueButton batchId={b.id} compact />}</td></tr>)}</tbody></table></div>{!batches.length&&<div className="empty">Nenhum lote criado.</div>}</div>
  </Shell>
}
