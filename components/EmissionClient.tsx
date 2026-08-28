"use client";

import { useMemo, useState } from "react";
import type { FiscalOrder, ValidationIssue } from "@/lib/types";
import { currency, dateTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const paymentLabel: Record<string,string> = { pix:"PIX", cash:"Dinheiro", debit:"Débito", credit:"Crédito", other:"Outro" };
const sourceLabel: Record<string,string> = { cardapio:"Cardápio", pdv:"PDV", mesa:"Mesa", ifood:"iFood", "99food":"99Food", other:"Outro" };

export function EmissionClient({ initialStart, initialEnd }: { initialStart: string; initialEnd: string }) {
  const [filters,setFilters]=useState({start:initialStart,end:initialEnd,payment:"all",source:"all",fiscalStatus:"not_issued",q:""});
  const [orders,setOrders]=useState<FiscalOrder[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [modal,setModal]=useState(false);
  const [issues,setIssues]=useState<ValidationIssue[]>([]);
  const selectedOrders=useMemo(()=>orders.filter(o=>selected.includes(o.id)),[orders,selected]);
  const selectedTotal=selectedOrders.reduce((s,o)=>s+o.total,0);

  async function search() {
    setLoading(true); setMessage(""); setSelected([]);
    try {
      const qs=new URLSearchParams(filters).toString();
      const res=await fetch(`/api/orders?${qs}`,{cache:"no-store"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Falha ao buscar pedidos");
      setOrders(data.orders||[]);
      if(!(data.orders||[]).length) setMessage("Nenhum pedido encontrado com esses filtros.");
    } catch(e:any){setMessage(e.message||"Erro inesperado");}
    finally{setLoading(false);}
  }

  function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
  function toggleAll(){setSelected(selected.length===orders.length?[]:orders.map(o=>o.id));}

  async function prevalidate(){
    setLoading(true); setMessage("");
    try{
      const res=await fetch("/api/fiscal/prevalidate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orders:selectedOrders})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Falha na validação");
      setIssues(data.issues||[]); setModal(true);
    }catch(e:any){setMessage(e.message||"Erro inesperado");} finally{setLoading(false);}
  }

  async function createBatch(validOnly=false){
    const blocked=new Set(issues.map(i=>i.orderId));
    const payloadOrders=validOnly?selectedOrders.filter(o=>!blocked.has(o.id)):selectedOrders;
    if(!payloadOrders.length){setMessage("Nenhum pedido válido para emitir."); setModal(false); return;}
    setLoading(true);
    try{
      const res=await fetch("/api/fiscal/batches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orders:payloadOrders})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Falha ao criar lote");
      setModal(false);
      if(data.demo){
        const emittedIds = new Set(payloadOrders.map(o=>o.id));
        setOrders(current=>current.map(o=>emittedIds.has(o.id)?{...o,fiscalStatus:"authorized"}:o));
        setSelected([]);
      } else {
        setSelected([]);
        await search();
      }
      setMessage(`Lote ${data.batch.id} criado. ${data.demo ? `${payloadOrders.length} emissão(ões) simulada(s) com sucesso.` : `${payloadOrders.length} pedido(s) entrou(aram) na fila fiscal.`}`);
    }catch(e:any){setMessage(e.message||"Erro inesperado");} finally{setLoading(false);}
  }

  return <>
    <div className="card card-pad">
      <div className="filters">
        <div className="field"><label>Data inicial</label><input className="input" type="date" value={filters.start} onChange={e=>setFilters({...filters,start:e.target.value})}/></div>
        <div className="field"><label>Data final</label><input className="input" type="date" value={filters.end} onChange={e=>setFilters({...filters,end:e.target.value})}/></div>
        <div className="field"><label>Pagamento</label><select className="select" value={filters.payment} onChange={e=>setFilters({...filters,payment:e.target.value})}><option value="all">Todos</option><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="debit">Débito</option><option value="credit">Crédito</option></select></div>
        <div className="field"><label>Origem</label><select className="select" value={filters.source} onChange={e=>setFilters({...filters,source:e.target.value})}><option value="all">Todas</option><option value="cardapio">Cardápio</option><option value="pdv">PDV</option><option value="mesa">Mesa</option><option value="ifood">iFood</option><option value="99food">99Food</option></select></div>
        <div className="field"><label>Status fiscal</label><select className="select" value={filters.fiscalStatus} onChange={e=>setFilters({...filters,fiscalStatus:e.target.value})}><option value="not_issued">Não emitidos</option><option value="authorized">Autorizados</option><option value="rejected">Rejeitados</option><option value="all">Todos</option></select></div>
        <button className="btn btn-primary" onClick={search} disabled={loading}>{loading?"Carregando...":"Buscar pedidos"}</button>
      </div>
      <div className="field" style={{marginTop:12,maxWidth:360}}><label>Número do pedido</label><input className="input" placeholder="Ex.: 1051" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></div>
    </div>
    {message && <div className="notice" style={{marginTop:14}}>{message}</div>}
    <div className="card" style={{marginTop:16}}>
      <div className="card-pad" style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}><div><h2 className="section-title" style={{marginBottom:4}}>Pedidos encontrados</h2><div className="muted" style={{fontSize:12}}>{orders.length} resultado(s)</div></div>{orders.length>0&&<button className="btn btn-sm" onClick={toggleAll}>{selected.length===orders.length?"Desmarcar todos":"Selecionar página"}</button>}</div>
      {orders.length ? <div className="table-wrap" style={{borderRadius:0,borderLeft:0,borderRight:0,borderBottom:0}}><table><thead><tr><th></th><th>Pedido</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Origem</th><th>Valor</th><th>Fiscal</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><input className="check" type="checkbox" disabled={o.fiscalStatus==="authorized"||o.status==="cancelled"} checked={selected.includes(o.id)} onChange={()=>toggle(o.id)}/></td><td><strong>#{o.number}</strong></td><td>{dateTime(o.orderedAt)}</td><td>{o.customerName||"Consumidor"}</td><td>{paymentLabel[o.paymentMethod]}</td><td>{sourceLabel[o.source]}</td><td><strong>{currency(o.total)}</strong></td><td><StatusBadge status={o.fiscalStatus}/></td></tr>)}</tbody></table></div>:<div className="empty">Use os filtros acima para carregar os pedidos.</div>}
    </div>
    {selected.length>0&&<div className="selection-bar"><div><strong>{selected.length} pedido(s) selecionado(s)</strong><div className="muted" style={{fontSize:12,marginTop:3}}>Valor: {currency(selectedTotal)}</div></div><button className="btn btn-primary" onClick={prevalidate} disabled={loading}>Pré-validar e emitir</button></div>}

    {modal&&<div className="modal-backdrop"><div className="modal"><h2>Confirmar emissão fiscal</h2><p className="muted">A data do filtro localiza o pedido. A autorização fiscal será realizada no momento da emissão, seguindo Focus/SEFAZ.</p>
      <div className="grid grid-2" style={{marginTop:16}}><div className="card card-pad"><div className="stat-label">Selecionados</div><div className="stat-value">{selectedOrders.length}</div></div><div className="card card-pad"><div className="stat-label">Valor</div><div className="stat-value">{currency(selectedTotal)}</div></div></div>
      {issues.length>0?<div className="notice red" style={{marginTop:16}}><strong>{issues.length} problema(s) de validação:</strong><ul>{issues.slice(0,8).map((i,n)=><li key={`${i.orderId}-${n}`}>Pedido #{i.orderNumber}: {i.message}</li>)}</ul></div>:<div className="notice" style={{marginTop:16}}>Todos os pedidos selecionados passaram pela validação estrutural.</div>}
      <div className="modal-footer"><button className="btn" onClick={()=>setModal(false)}>Voltar</button>{issues.length>0&&<button className="btn" onClick={()=>createBatch(true)} disabled={loading}>Emitir somente válidos</button>}{issues.length===0&&<button className="btn btn-primary" onClick={()=>createBatch(false)} disabled={loading}>Confirmar emissão</button>}</div>
    </div></div>}
  </>
}
