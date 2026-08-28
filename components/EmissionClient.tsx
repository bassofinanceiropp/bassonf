"use client";

import { useMemo, useState } from "react";
import type { FiscalOrder, ValidationIssue } from "@/lib/types";
import { asDateInput, currency, dateTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Icon } from "./Icon";

const paymentLabel: Record<string,string> = { pix:"PIX", cash:"Dinheiro", debit:"Débito", credit:"Crédito", other:"Outro" };
const sourceLabel: Record<string,string> = { cardapio:"Cardápio", pdv:"PDV", mesa:"Mesa", ifood:"iFood", "99food":"99Food", other:"Outro" };

function dateMinus(days:number){ const d=new Date(); d.setDate(d.getDate()-days); return asDateInput(d); }
function firstDay(){ const t=asDateInput(); return `${t.slice(0,7)}-01`; }
function isEligible(order:FiscalOrder){ return order.status !== "cancelled" && ["not_issued","rejected","technical_failure"].includes(order.fiscalStatus); }

export function EmissionClient({ initialStart, initialEnd }: { initialStart: string; initialEnd: string }) {
  const [filters,setFilters]=useState({start:initialStart,end:initialEnd,payment:"all",source:"all",fiscalStatus:"not_issued",orderStatus:"completed",q:"",minValue:"",maxValue:""});
  const [orders,setOrders]=useState<FiscalOrder[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState<{type:"info"|"error"|"success";text:string}|null>(null);
  const [modal,setModal]=useState<"validation"|"review"|null>(null);
  const [issues,setIssues]=useState<ValidationIssue[]>([]);
  const [progress,setProgress]=useState<{batchId:string;done:number;total:number}|null>(null);

  const eligibleOrders=useMemo(()=>orders.filter(isEligible),[orders]);
  const selectedOrders=useMemo(()=>orders.filter(o=>selected.includes(o.id)),[orders,selected]);
  const selectedTotal=selectedOrders.reduce((s,o)=>s+o.total,0);
  const selectedByPayment=useMemo(()=>selectedOrders.reduce((acc,o)=>{acc[o.paymentMethod]=(acc[o.paymentMethod]||0)+1;return acc;},{} as Record<string,number>),[selectedOrders]);
  const selectedBySource=useMemo(()=>selectedOrders.reduce((acc,o)=>{acc[o.source]=(acc[o.source]||0)+1;return acc;},{} as Record<string,number>),[selectedOrders]);

  async function search() {
    setLoading(true); setMessage(null); setSelected([]);
    try {
      const qs=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!=="") as [string,string][]).toString();
      const res=await fetch(`/api/orders?${qs}`,{cache:"no-store"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Falha ao buscar pedidos");
      setOrders(data.orders||[]);
      setMessage((data.orders||[]).length?null:{type:"info",text:"Nenhum pedido encontrado com esses filtros."});
    } catch(e:any){setMessage({type:"error",text:e.message||"Erro inesperado"});}
    finally{setLoading(false);}
  }

  function applyPreset(type:string){
    const today=asDateInput();
    if(type==="today") setFilters(f=>({...f,start:today,end:today}));
    if(type==="yesterday"){const d=dateMinus(1);setFilters(f=>({...f,start:d,end:d}));}
    if(type==="7d") setFilters(f=>({...f,start:dateMinus(6),end:today}));
    if(type==="month") setFilters(f=>({...f,start:firstDay(),end:today}));
  }

  function toggle(id:string){ const order=orders.find(o=>o.id===id); if(!order||!isEligible(order)) return; setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]); }
  function toggleAll(){ const ids=eligibleOrders.map(o=>o.id); const all=ids.length>0&&ids.every(id=>selected.includes(id)); setSelected(all?[]:ids); }

  async function prevalidate(){
    if(!selectedOrders.length){setMessage({type:"error",text:"Selecione pelo menos um pedido elegível."});return;}
    setLoading(true); setMessage(null);
    try{
      const res=await fetch("/api/fiscal/prevalidate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orders:selectedOrders})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Falha na validação");
      setIssues(data.issues||[]); setModal("validation");
    }catch(e:any){setMessage({type:"error",text:e.message||"Erro inesperado"});} finally{setLoading(false);}
  }

  function goReview(){setModal("review");}

  async function createBatch(validOnly=false){
    const blocked=new Set(issues.filter(i=>i.severity!=="warning").map(i=>i.orderId));
    const payloadOrders=validOnly?selectedOrders.filter(o=>!blocked.has(o.id)):selectedOrders;
    if(!payloadOrders.length){setMessage({type:"error",text:"Nenhum pedido válido para emitir."}); setModal(null); return;}
    setLoading(true); setMessage(null);
    try{
      const res=await fetch("/api/fiscal/batches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orders:payloadOrders})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Falha ao criar lote");
      setModal(null);
      if(data.demo){
        const emittedIds = new Set(payloadOrders.map(o=>o.id));
        setOrders(current=>current.map(o=>emittedIds.has(o.id)?{...o,fiscalStatus:"authorized"}:o));
        setSelected([]);
        setMessage({type:"success",text:`Lote ${String(data.batch.id).slice(0,12)} criado. ${payloadOrders.length} emissão(ões) simulada(s) com sucesso.`});
      } else {
        setSelected([]);
        let processedTotal=0;
        setProgress({batchId:data.batch.id,done:0,total:payloadOrders.length});
        for(let i=0;i<80;i++){
          const processadorRes=await fetch("/api/fiscal/process-queue",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({batchId:data.batch.id})});
          const processadorData=await processadorRes.json();
          if(!processadorRes.ok) throw new Error(processadorData.error||"Falha ao processar fila fiscal");
          const processed=Number(processadorData.processed||0);
          processedTotal+=processed;
          setProgress({batchId:data.batch.id,done:Math.min(processedTotal,payloadOrders.length),total:payloadOrders.length});
          if(processed===0||processedTotal>=payloadOrders.length) break;
        }
        await search();
        setProgress(null);
        setMessage({type:"success",text:`Lote ${String(data.batch.id).slice(0,12)} tratado. ${processedTotal} item(ns) processado(s). Pendências podem ser retomadas em Lotes.`});
      }
    }catch(e:any){setProgress(null);setMessage({type:"error",text:e.message||"Erro inesperado"});} finally{setLoading(false);}
  }

  const blocking=issues.filter(i=>i.severity!=="warning");
  const warnings=issues.filter(i=>i.severity==="warning");
  const grouped=useMemo(()=>{
    const map=new Map<string,{label:string;issues:ValidationIssue[]}>();
    for(const issue of blocking){const key=issue.sku?`sku:${issue.sku}`:`code:${issue.code}`;const label=issue.productName?`${issue.productName} (${issue.sku})`:issue.message;const current=map.get(key)||{label,issues:[]};current.issues.push(issue);map.set(key,current);} return Array.from(map.values());
  },[blocking]);

  return <>
    <div className="card filter-card">
      <div className="quick-presets"><span>Período rápido</span><button onClick={()=>applyPreset("today")}>Hoje</button><button onClick={()=>applyPreset("yesterday")}>Ontem</button><button onClick={()=>applyPreset("7d")}>7 dias</button><button onClick={()=>applyPreset("month")}>Este mês</button></div>
      <div className="filters filters-emission">
        <div className="field"><label>Data inicial</label><input className="input" type="date" value={filters.start} onChange={e=>setFilters({...filters,start:e.target.value})}/></div>
        <div className="field"><label>Data final</label><input className="input" type="date" value={filters.end} onChange={e=>setFilters({...filters,end:e.target.value})}/></div>
        <div className="field"><label>Pagamento</label><select className="select" value={filters.payment} onChange={e=>setFilters({...filters,payment:e.target.value})}><option value="all">Todos</option><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="debit">Débito</option><option value="credit">Crédito</option></select></div>
        <div className="field"><label>Origem</label><select className="select" value={filters.source} onChange={e=>setFilters({...filters,source:e.target.value})}><option value="all">Todas</option><option value="cardapio">Cardápio</option><option value="pdv">PDV</option><option value="mesa">Mesa</option><option value="ifood">iFood</option><option value="99food">99Food</option></select></div>
        <div className="field"><label>Status fiscal</label><select className="select" value={filters.fiscalStatus} onChange={e=>setFilters({...filters,fiscalStatus:e.target.value})}><option value="not_issued">Não emitidos</option><option value="all">Todos</option><option value="rejected">Rejeitados</option><option value="technical_failure">Falha técnica</option><option value="authorized">Autorizados</option></select></div>
        <div className="field"><label>Status pedido</label><select className="select" value={filters.orderStatus} onChange={e=>setFilters({...filters,orderStatus:e.target.value})}><option value="completed">Concluído</option><option value="paid">Pago</option><option value="all">Todos</option></select></div>
        <div className="field"><label>Pedido / cliente</label><input className="input" placeholder="Ex.: 1842" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></div>
        <div className="field"><label>Valor mínimo</label><input className="input" inputMode="decimal" placeholder="0,00" value={filters.minValue} onChange={e=>setFilters({...filters,minValue:e.target.value.replace(",",".")})}/></div>
        <div className="field"><label>Valor máximo</label><input className="input" inputMode="decimal" placeholder="Sem limite" value={filters.maxValue} onChange={e=>setFilters({...filters,maxValue:e.target.value.replace(",",".")})}/></div>
        <button className="btn btn-primary filter-submit" onClick={search} disabled={loading}><Icon name="search" size={17}/>{loading?"Buscando…":"Buscar pedidos"}</button>
      </div>
    </div>

    {message&&<div className={`notice ${message.type==="error"?"red":message.type==="success"?"green":""}`} style={{marginTop:14}}>{message.text}</div>}
    {progress&&<div className="card progress-card"><div className="progress-head"><div><strong>Processando lote {String(progress.batchId).slice(0,12)}</strong><span>{progress.done} de {progress.total} tratados</span></div><strong>{Math.round((progress.done/Math.max(1,progress.total))*100)}%</strong></div><div className="progress"><span style={{width:`${(progress.done/Math.max(1,progress.total))*100}%`}}/></div></div>}

    <div className="card result-card">
      <div className="table-toolbar"><div><strong>{orders.length} pedido(s) encontrado(s)</strong><span>{eligibleOrders.length} elegíveis para emissão</span></div><button className="btn btn-sm" onClick={toggleAll} disabled={!eligibleOrders.length}><Icon name="check" size={15}/>{eligibleOrders.length&&eligibleOrders.every(o=>selected.includes(o.id))?"Limpar elegíveis":"Selecionar elegíveis"}</button></div>
      <div className="table-wrap"><table><thead><tr><th className="sticky-check"><input className="check" type="checkbox" checked={eligibleOrders.length>0&&eligibleOrders.every(o=>selected.includes(o.id))} onChange={toggleAll}/></th><th>Pedido</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Origem</th><th>Valor</th><th>Status fiscal</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className={selected.includes(o.id)?"row-selected":""}><td className="sticky-check"><input className="check" type="checkbox" disabled={!isEligible(o)} checked={selected.includes(o.id)} onChange={()=>toggle(o.id)}/></td><td><strong>#{o.number}</strong></td><td>{dateTime(o.orderedAt)}</td><td>{o.customerName||<span className="muted">Não informado</span>}</td><td>{paymentLabel[o.paymentMethod]}</td><td>{sourceLabel[o.source]}</td><td><strong>{currency(o.total)}</strong></td><td><StatusBadge status={o.fiscalStatus}/></td></tr>)}</tbody></table></div>
      {!orders.length&&<div className="empty-state"><div className="empty-icon"><Icon name="receipt" size={28}/></div><strong>Busque os pedidos que deseja emitir</strong><span>Use data, pagamento e origem para montar a rodada fiscal.</span></div>}
    </div>

    {!!selected.length&&<div className="selection-bar"><div className="selection-summary"><strong>{selected.length} pedido(s)</strong><span>{currency(selectedTotal)}</span><div className="selection-chips">{Object.entries(selectedByPayment).map(([k,v])=><em key={k}>{paymentLabel[k]} {v}</em>)}</div></div><div className="actions-row"><button className="btn btn-ghost" onClick={()=>setSelected([])}>Limpar</button><button className="btn btn-primary" onClick={prevalidate} disabled={loading}><Icon name="check" size={17}/>Validar {selected.length} pedido(s)</button></div></div>}

    {modal==="validation"&&<div className="modal-backdrop"><div className="modal modal-wide"><button className="modal-close" onClick={()=>setModal(null)}><Icon name="close"/></button><div className="modal-kicker">Pré-validação fiscal</div><h2>{blocking.length?"Existem pendências antes da emissão":"Pedidos prontos para a rodada"}</h2><p className="modal-copy">{selectedOrders.length} pedidos • {currency(selectedTotal)}</p>
      <div className="validation-stats"><div><strong>{selectedOrders.length-blocking.reduce((s,i)=>s.add(i.orderId),new Set<string>()).size}</strong><span>prontos</span></div><div className={blocking.length?"danger":""}><strong>{new Set(blocking.map(i=>i.orderId)).size}</strong><span>bloqueados</span></div><div><strong>{warnings.length}</strong><span>avisos</span></div></div>
      {grouped.length>0&&<div className="issue-list">{grouped.map((g,i)=><div className="issue-item" key={i}><div className="issue-icon"><Icon name="alert" size={17}/></div><div><strong>{g.label}</strong><span>{g.issues.length===1?`Pedido #${g.issues[0].orderNumber}`:`Afeta ${new Set(g.issues.map(x=>x.orderId)).size} pedidos`}</span></div>{g.issues[0].sku&&<a href={`/produtos-fiscais?q=${encodeURIComponent(g.issues[0].sku)}`} className="btn btn-sm">Corrigir produto</a>}</div>)}</div>}
      {warnings.length>0&&<div className="notice" style={{marginTop:14}}><strong>{warnings.length} aviso(s)</strong><br/>{warnings.slice(0,3).map(w=>w.message).join(" • ")}</div>}
      <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Voltar</button>{blocking.length?<button className="btn btn-primary" onClick={()=>createBatch(true)}>Emitir somente os válidos</button>:<button className="btn btn-primary" onClick={goReview}>Revisar emissão</button>}</div>
    </div></div>}

    {modal==="review"&&<div className="modal-backdrop"><div className="modal modal-wide"><button className="modal-close" onClick={()=>setModal(null)}><Icon name="close"/></button><div className="modal-kicker">Revisão final</div><h2>Confirmar rodada de emissão</h2><p className="modal-copy">Confira o resumo antes de enviar os documentos para a fila fiscal.</p>
      <div className="review-total"><span>Total selecionado</span><strong>{currency(selectedTotal)}</strong><em>{selectedOrders.length} pedidos</em></div>
      <div className="grid grid-2 review-grid"><div className="soft-card"><span>Formas de pagamento</span>{Object.entries(selectedByPayment).map(([k,v])=><div className="kpi-line" key={k}><span>{paymentLabel[k]}</span><strong>{v}</strong></div>)}</div><div className="soft-card"><span>Origens</span>{Object.entries(selectedBySource).map(([k,v])=><div className="kpi-line" key={k}><span>{sourceLabel[k]}</span><strong>{v}</strong></div>)}</div></div>
      <div className="notice">A data usada no filtro localiza o pedido original. A autorização fiscal será feita com a data aceita no momento da transmissão à Focus/SEFAZ.</div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModal("validation")}>Voltar</button><button className="btn btn-primary" onClick={()=>createBatch(false)} disabled={loading}><Icon name="receipt" size={17}/>{loading?"Criando lote…":`Emitir ${selectedOrders.length} NFC-e`}</button></div>
    </div></div>}
  </>;
}
