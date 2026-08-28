import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { getBatchDetail } from "@/lib/repo/fiscal";
import { currency, dateTime } from "@/lib/utils";
import { ProcessQueueButton } from "@/components/ProcessQueueButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/Icon";

export default async function LotePage({params}:{params:Promise<{id:string}>}){
  const session=await guardPage();const {id}=await params;let detail:any=null;try{detail=await getBatchDetail(id);}catch{}
  if(!detail)return <Shell active="/lotes" email={session.email}><div className="empty-state"><strong>Lote não encontrado</strong><a className="btn" href="/lotes">Voltar</a></div></Shell>;
  const {batch,items}=detail;const done=items.filter((i:any)=>["authorized","rejected","technical_failure"].includes(i.status)).length;const pct=Math.round((done/Math.max(1,batch.orders_count))*100);
  return <Shell active="/lotes" email={session.email}>
    <div className="page-head"><div><a className="back-link" href="/lotes">← Todos os lotes</a><div className="page-kicker">Detalhe da rodada</div><h1 className="page-title">Lote #{String(batch.id).slice(0,8).toUpperCase()}</h1><p className="page-desc">Criado em {dateTime(batch.created_at)} • {batch.orders_count} pedidos.</p></div>{batch.status!=="completed"&&<ProcessQueueButton batchId={batch.id}/>}</div>
    <div className="grid grid-4"><div className="card stat-card"><span>Pedidos</span><strong>{batch.orders_count}</strong><em>Total no lote</em></div><div className="card stat-card"><span>Autorizadas</span><strong>{batch.authorized_count||0}</strong><em>Concluídas</em></div><div className="card stat-card"><span>Falhas</span><strong>{batch.rejected_count||0}</strong><em>Requerem atenção</em></div><div className="card stat-card"><span>Valor autorizado</span><strong>{currency(Number(batch.total_amount||0))}</strong><em>NFC-e válidas</em></div></div>
    <div className="card card-pad" style={{marginTop:16}}><div className="progress-head"><div><strong>Progresso do lote</strong><span>{done} de {batch.orders_count} tratados</span></div><strong>{pct}%</strong></div><div className="progress"><span style={{width:`${pct}%`}}/></div></div>
    <div className="card result-card" style={{marginTop:16}}><div className="table-toolbar"><div><strong>Itens do lote</strong><span>Histórico individual por pedido</span></div></div><div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Valor</th><th>Status</th><th>Tentativas</th><th>Última mensagem</th></tr></thead><tbody>{items.map((item:any)=><tr key={item.id}><td><strong>#{item.order_number||item.external_order_id}</strong></td><td>{currency(Number(item.total_amount||0))}</td><td><StatusBadge status={item.status}/></td><td>{item.attempts||0}</td><td>{item.error_message?<span className="error-text"><Icon name="alert" size={14}/>{item.error_message}</span>:<span className="muted">Sem erro</span>}</td></tr>)}</tbody></table></div></div>
  </Shell>
}
