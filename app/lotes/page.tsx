import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { listBatches } from "@/lib/repo/fiscal";
import { currency, dateTime } from "@/lib/utils";
import { ProcessQueueButton } from "@/components/ProcessQueueButton";
import { Icon } from "@/components/Icon";

export default async function LotesPage() {
  const session = await guardPage(); let batches: any[] = []; try { batches = await listBatches(); } catch {}
  return <Shell active="/lotes" email={session.email}>
    <div className="page-head"><div><div className="page-kicker">Processamento</div><h1 className="page-title">Lotes de emissão</h1><p className="page-desc">Cada rodada é persistente. Se a aba fechar, o lote pode ser retomado sem perder o histórico.</p></div></div>
    <div className="card result-card"><div className="table-toolbar"><div><strong>{batches.length} lote(s)</strong><span>Rodadas mais recentes</span></div></div><div className="table-wrap"><table><thead><tr><th>Lote</th><th>Criado</th><th>Pedidos</th><th>Autorizadas</th><th>Falhas</th><th>Valor autorizado</th><th>Progresso</th><th>Status</th><th></th></tr></thead><tbody>{batches.map((b:any)=>{const done=Number(b.authorized_count||0)+Number(b.rejected_count||0);const pct=Math.min(100,Math.round((done/Math.max(1,Number(b.orders_count||0)))*100));return <tr key={b.id}><td><strong>#{String(b.id).slice(0,8).toUpperCase()}</strong><span className="table-sub">{String(b.id).slice(0,18)}</span></td><td>{dateTime(b.created_at)}</td><td>{b.orders_count}</td><td>{b.authorized_count||0}</td><td>{b.rejected_count||0}</td><td><strong>{currency(Number(b.total_amount||0))}</strong></td><td><div className="table-progress"><div className="progress"><span style={{width:`${pct}%`}}/></div><small>{pct}%</small></div></td><td><span className={`badge ${b.status==='completed'?'green':'orange'}`}><span className="badge-dot"/>{b.status==='completed'?'Finalizado':'Processando'}</span></td><td><div className="actions-row">{b.status!=='completed'&&<ProcessQueueButton batchId={b.id} compact/>}<a className="icon-btn" title="Abrir lote" href={`/lotes/${b.id}`}><Icon name="arrow" size={16}/></a></div></td></tr>})}</tbody></table></div>{!batches.length&&<div className="empty-state"><div className="empty-icon"><Icon name="layers" size={28}/></div><strong>Nenhum lote criado</strong><span>As rodadas de emissão aparecerão aqui.</span></div>}</div>
  </Shell>
}
