import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { fetchOrders } from "@/lib/orders/source";
import { currency, dateOnly, dateTime, monthRange } from "@/lib/utils";
import { getProductStats, listAudit, listBatches, overlayFiscalStatuses } from "@/lib/repo/fiscal";
import { env } from "@/lib/env";
import { Icon } from "@/components/Icon";

const actionLabel:Record<string,string>={"batch.create":"Lote criado","document.cancel":"NFC-e cancelada","settings.update":"Configurações alteradas","orders.sync":"Pedidos sincronizados","accounting.export":"Pacote contábil gerado","auth.login":"Login realizado","product.update":"Produto fiscal alterado","product.bulk_profile":"Perfil aplicado em massa"};

export default async function DashboardPage() {
  const session = await guardPage();
  let orders = [] as Awaited<ReturnType<typeof fetchOrders>>;
  let audits:any[]=[];let products={total:0,complete:0,incomplete:0,unassigned:0};let batches:any[]=[];
  try { const range = monthRange(); orders = await overlayFiscalStatuses(await fetchOrders(range)); } catch { orders = []; }
  try { audits=await listAudit(6); } catch {}
  try { products=await getProductStats(); } catch {}
  try { batches=await listBatches(5); } catch {}
  const authorized = orders.filter((o) => o.fiscalStatus === "authorized");
  const pending = orders.filter((o) => o.fiscalStatus === "not_issued");
  const rejected = orders.filter((o) => ["rejected","technical_failure"].includes(o.fiscalStatus));
  const documentedValue = authorized.reduce((s,o)=>s+o.total,0);
  const days = Array.from(new Set(orders.map(o=>o.orderedAt.slice(0,10)))).sort();
  const chart=days.map(day=>({day,count:orders.filter(o=>o.orderedAt.slice(0,10)===day&&o.fiscalStatus==="authorized").length,value:orders.filter(o=>o.orderedAt.slice(0,10)===day&&o.fiscalStatus==="authorized").reduce((s,o)=>s+o.total,0)}));
  const chartMax=Math.max(1,...chart.map(d=>d.count));
  const attention=[
    rejected.length?{label:`${rejected.length} documento(s) com problema`,href:"/documentos?status=rejected",kind:"danger"}:null,
    products.incomplete?{label:`${products.incomplete} produto(s) fiscais incompletos`,href:"/produtos-fiscais?status=incomplete",kind:"warning"}:null,
    batches.some(b=>b.status!=="completed")?{label:"Existe lote ainda em processamento",href:"/lotes",kind:"warning"}:null,
  ].filter(Boolean) as any[];

  return <Shell active="/dashboard" email={session.email}>
    <div className="page-head dashboard-head"><div><div className="page-kicker">PedidoPro Fiscal</div><h1 className="page-title">Visão geral</h1><p className="page-desc">Acompanhe a operação fiscal, pendências e emissões reais com base nos pedidos carregados.</p></div><a className="btn btn-primary" href="/emissao"><Icon name="receipt" size={17}/>Nova emissão</a></div>
    <div className="grid grid-4">
      <div className="card stat-card accent"><span>Pedidos disponíveis</span><strong>{orders.length}</strong><em>Fonte operacional</em></div>
      <div className="card stat-card"><span>Sem emissão</span><strong>{pending.length}</strong><em>Aguardando seleção</em></div>
      <div className="card stat-card"><span>NFC-e autorizadas</span><strong>{authorized.length}</strong><em>No conjunto carregado</em></div>
      <div className="card stat-card"><span>Valor autorizado</span><strong>{currency(documentedValue)}</strong><em>Documentos válidos</em></div>
    </div>

    <div className="grid dashboard-grid" style={{marginTop:16}}>
      <div className="card card-pad chart-card">
        <div className="section-head"><div><div className="section-kicker">Evolução</div><h2>Emissões por dia</h2></div><span className="badge gray">Dados reais</span></div>
        {chart.length?<><div className="bar-chart">{chart.map(item=><div className="bar-col" key={item.day} title={`${dateOnly(`${item.day}T12:00:00-03:00`)} • ${item.count} NFC-e • ${currency(item.value)}`}><div className="bar-value">{item.count}</div><div className="bar-track"><span style={{height:`${Math.max(item.count?10:2,(item.count/chartMax)*100)}%`}}/></div><small>{item.day.slice(8,10)}</small></div>)}</div><div className="chart-legend"><span>Quantidade de NFC-e autorizadas por data original do pedido</span></div></>:<div className="empty-state compact"><strong>Sem dados para o gráfico</strong><span>As emissões autorizadas aparecerão aqui.</span></div>}
      </div>
      <div className="card card-pad attention-card">
        <div className="section-head"><div><div className="section-kicker">Operação</div><h2>Atenção necessária</h2></div><span className={`badge ${attention.length?"orange":"green"}`}><span className="badge-dot"/>{attention.length?`${attention.length} pendência(s)`:"Tudo certo"}</span></div>
        {attention.length?<div className="attention-list">{attention.map((item,i)=><a href={item.href} key={i}><span className={`attention-icon ${item.kind}`}><Icon name="alert" size={17}/></span><strong>{item.label}</strong><Icon name="arrow" size={16}/></a>)}</div>:<div className="success-state"><span><Icon name="check" size={22}/></span><div><strong>Nenhuma pendência crítica</strong><p>O conjunto carregado não apresenta rejeições ou cadastros incompletos.</p></div></div>}
        <div className="integration-strip"><div><span className={env.demoMode?"status-orb demo":"status-orb online"}/><strong>Focus NFe</strong><em>{env.demoMode?"Simulação":env.focusToken?"Configurada":"Pendente"}</em></div><div><span className={env.demoMode?"status-orb demo":env.ordersApiUrl?"status-orb online":"status-orb offline"}/><strong>Pedidos Basso</strong><em>{env.demoMode?"Demo":env.ordersApiUrl?"Configurada":"Pendente"}</em></div></div>
      </div>
    </div>

    <div className="grid grid-2" style={{marginTop:16}}>
      <div className="card card-pad">
        <div className="section-head"><div><div className="section-kicker">Cobertura fiscal</div><h2>Produtos</h2></div><a href="/produtos-fiscais" className="text-link">Gerenciar <Icon name="arrow" size={14}/></a></div>
        <div className="coverage-row"><div><strong>{products.complete}</strong><span>completos</span></div><div><strong>{products.incomplete}</strong><span>incompletos</span></div><div><strong>{products.unassigned}</strong><span>sem perfil</span></div></div>
        <div className="progress"><span style={{width:`${products.total?Math.round((products.complete/products.total)*100):0}%`}}/></div>
        <p className="muted small">{products.total?`${Math.round((products.complete/products.total)*100)}% dos ${products.total} produtos estão prontos para pré-validação.`:"Sincronize os pedidos para formar o catálogo fiscal."}</p>
      </div>
      <div className="card card-pad">
        <div className="section-head"><div><div className="section-kicker">Auditoria</div><h2>Atividade recente</h2></div></div>
        <div className="activity-list">{audits.map((a:any)=><div className="activity-item" key={a.id}><span className="activity-dot"/><div><strong>{actionLabel[a.action]||a.action}</strong><span>{a.actor||"Sistema"} • {dateTime(a.created_at)}</span></div></div>)}{!audits.length&&<div className="empty-state compact"><span>Nenhuma atividade registrada.</span></div>}</div>
      </div>
    </div>

    <div className="card day-summary-card" style={{marginTop:16}}>
      <div className="card-pad section-head"><div><div className="section-kicker">Operação histórica</div><h2>Resumo por dia do pedido</h2></div></div>
      {days.length ? days.slice().reverse().map((day) => {
        const list=orders.filter(o=>o.orderedAt.slice(0,10)===day);const pix=list.filter(o=>o.paymentMethod==='pix');const emitted=list.filter(o=>o.fiscalStatus==='authorized');
        return <div className="day-card" key={day}><div><div className="day-value">{dateOnly(`${day}T12:00:00-03:00`)}</div><div className="muted small">{list.length} pedidos</div></div><div><span>PIX</span><strong>{pix.length}</strong></div><div><span>Autorizadas</span><strong>{emitted.length}</strong></div><div><span>Pedidos</span><strong>{currency(list.reduce((s,o)=>s+o.total,0))}</strong></div><div><span>Documentado</span><strong>{currency(emitted.reduce((s,o)=>s+o.total,0))}</strong></div><a className="icon-btn" title="Ver pedidos" href={`/emissao?start=${day}&end=${day}`}><Icon name="arrow" size={17}/></a></div>
      }) : <div className="empty-state"><div className="empty-icon"><Icon name="dashboard" size={28}/></div><strong>Nenhum pedido disponível</strong><span>Configure a fonte de pedidos ou permaneça no modo demonstração.</span></div>}
    </div>
  </Shell>
}
