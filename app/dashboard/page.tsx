import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { fetchOrders } from "@/lib/orders/source";
import { currency, dateOnly } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await guardPage();
  let orders = [] as Awaited<ReturnType<typeof fetchOrders>>;
  try { orders = await fetchOrders({}); } catch { orders = []; }
  const authorized = orders.filter((o) => o.fiscalStatus === "authorized");
  const pending = orders.filter((o) => o.fiscalStatus === "not_issued");
  const rejected = orders.filter((o) => o.fiscalStatus === "rejected");
  const documentedValue = authorized.reduce((s,o)=>s+o.total,0);
  const days = Array.from(new Set(orders.map(o=>o.orderedAt.slice(0,10)))).sort();
  return <Shell active="/dashboard" email={session.email}>
    <div className="page-head"><div><h1 className="page-title">Visão geral fiscal</h1><p className="page-desc">Acompanhe o que está pendente, autorizado e com inconsistência antes de qualquer emissão.</p></div></div>
    <div className="grid grid-4">
      <div className="card card-pad"><div className="stat-label">Pedidos disponíveis</div><div className="stat-value">{orders.length}</div><div className="stat-note">Fonte integrada</div></div>
      <div className="card card-pad"><div className="stat-label">Sem emissão</div><div className="stat-value">{pending.length}</div><div className="stat-note">Aguardando seleção</div></div>
      <div className="card card-pad"><div className="stat-label">Autorizadas</div><div className="stat-value">{authorized.length}</div><div className="stat-note">NFC-e válidas</div></div>
      <div className="card card-pad"><div className="stat-label">Valor autorizado</div><div className="stat-value">{currency(documentedValue)}</div><div className="stat-note">No conjunto carregado</div></div>
    </div>
    <div className="grid grid-2" style={{marginTop:16}}>
      <div className="card card-pad">
        <h2 className="section-title">Emissões por dia</h2>
        <div className="mini-chart">{(days.length?days:["a","b","c","d","e"]).map((d,i)=><div title={d} key={d} className="mini-bar" style={{height:`${28 + ((i*37)%70)}%`}} />)}</div>
      </div>
      <div className="card card-pad">
        <h2 className="section-title">Saúde fiscal</h2>
        <div className="grid" style={{gap:12}}>
          <div className="kpi-line"><span className="muted">Autorizadas</span><strong>{authorized.length}</strong></div>
          <div className="kpi-line"><span className="muted">Rejeitadas</span><strong>{rejected.length}</strong></div>
          <div className="kpi-line"><span className="muted">Sem emissão</span><strong>{pending.length}</strong></div>
          <div className="notice">O painel operacional da Basso continua independente. Este projeto apenas consulta/sinagendamentoiza pedidos e executa operações fiscais.</div>
        </div>
      </div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <div className="card-pad"><h2 className="section-title">Resumo por data do pedido</h2></div>
      {days.length ? days.map((day) => {
        const list=orders.filter(o=>o.orderedAt.slice(0,10)===day);
        const pix=list.filter(o=>o.paymentMethod==='pix');
        const emitted=list.filter(o=>o.fiscalStatus==='authorized');
        return <div className="day-card" key={day}><div><div className="day-value">{dateOnly(`${day}T12:00:00-03:00`)}</div><div className="muted" style={{fontSize:12}}>{list.length} pedidos</div></div><div><div className="muted" style={{fontSize:11}}>PIX</div><strong>{pix.length}</strong></div><div><div className="muted" style={{fontSize:11}}>Emitidos</div><strong>{emitted.length}</strong></div><div><div className="muted" style={{fontSize:11}}>Total</div><strong>{currency(list.reduce((s,o)=>s+o.total,0))}</strong></div><div><div className="muted" style={{fontSize:11}}>Documentado</div><strong>{currency(emitted.reduce((s,o)=>s+o.total,0))}</strong></div><a className="btn btn-sm" href={`/emissao?start=${day}&end=${day}`}>Ver pedidos</a></div>
      }) : <div className="empty">Nenhum pedido disponível. Configure a fonte de pedidos.</div>}
    </div>
  </Shell>
}
