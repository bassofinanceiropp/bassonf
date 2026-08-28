"use client";
import { useMemo, useState } from "react";
import { asDateInput, currency, dateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/Icon";

const paymentLabel:Record<string,string>={pix:"PIX",cash:"Dinheiro",debit:"Débito",credit:"Crédito",other:"Outro"};
const sourceLabel:Record<string,string>={cardapio:"Cardápio",pdv:"PDV",mesa:"Mesa",ifood:"iFood","99food":"99Food",other:"Outro"};

export function DocumentsClient({ initial, initialTotal, initialFilters = {} }: { initial: any[]; initialTotal: number; initialFilters?: Partial<{start:string;end:string;orderStart:string;orderEnd:string;status:string;payment:string;source:string;q:string}> }) {
  const today=asDateInput();
  const [docs,setDocs]=useState(initial);
  const [total,setTotal]=useState(initialTotal);
  const [page,setPage]=useState(1);
  const [filters,setFilters]=useState({start:initialFilters.start||"",end:initialFilters.end||"",orderStart:initialFilters.orderStart||"",orderEnd:initialFilters.orderEnd||"",status:initialFilters.status||"all",payment:initialFilters.payment||"all",source:initialFilters.source||"all",q:initialFilters.q||""});
  const [message,setMessage]=useState<{type:"error"|"success"|"info";text:string}|null>(null);
  const [loading,setLoading]=useState(false);
  const [drawer,setDrawer]=useState<any|null>(null);
  const [events,setEvents]=useState<any[]>([]);
  const [cancelOpen,setCancelOpen]=useState(false);
  const [justification,setJustification]=useState("");
  const pageSize=50;
  const pages=Math.max(1,Math.ceil(total/pageSize));

  async function search(nextPage=1){
    setLoading(true);setMessage(null);
    try{
      const qs=new URLSearchParams({...filters,page:String(nextPage),pageSize:String(pageSize)}).toString();
      const res=await fetch(`/api/fiscal/documents?${qs}`,{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao consultar documentos");
      setDocs(data.documents||[]);setTotal(Number(data.total||0));setPage(nextPage);
    }catch(e:any){setMessage({type:"error",text:e.message||"Erro inesperado"});}finally{setLoading(false);}
  }

  async function openDetail(doc:any){
    setDrawer(doc);setEvents([]);
    try{const res=await fetch(`/api/fiscal/documents/${doc.id}`,{cache:"no-store"});const data=await res.json();if(res.ok){setDrawer(data.document);setEvents(data.events||[]);}}catch{}
  }

  async function cancel(){
    if(!drawer)return;
    if(justification.trim().length<15){setMessage({type:"error",text:"A justificativa deve ter pelo menos 15 caracteres."});return;}
    setLoading(true);
    try{
      const res=await fetch(`/api/fiscal/documents/${drawer.id}/cancel`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({justification})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao cancelar");
      setDocs(ds=>ds.map(d=>d.id===drawer.id?{...d,status:"cancelled",cancelled_at:new Date().toISOString()}:d));
      setDrawer({...drawer,status:"cancelled",cancelled_at:new Date().toISOString()});setCancelOpen(false);setJustification("");setMessage({type:"success",text:`NFC-e do pedido #${drawer.order_number||drawer.external_order_id} cancelada.`});
      await openDetail({...drawer,status:"cancelled"});
    }catch(e:any){setMessage({type:"error",text:e.message||"Falha ao cancelar"});}finally{setLoading(false);}
  }

  async function copyKey(key:string){try{await navigator.clipboard.writeText(key);setMessage({type:"success",text:"Chave de acesso copiada."});}catch{setMessage({type:"error",text:"Não foi possível copiar a chave."});}}
  const range=useMemo(()=>docs.length?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} de ${total}`:`0 de ${total}`,[docs,page,total]);

  return <>
    <div className="card filter-card">
      <div className="filters filters-docs">
        <div className="field"><label>Emissão inicial</label><input className="input" type="date" value={filters.start} max={today} onChange={e=>setFilters({...filters,start:e.target.value})}/></div>
        <div className="field"><label>Emissão final</label><input className="input" type="date" value={filters.end} max={today} onChange={e=>setFilters({...filters,end:e.target.value})}/></div><div className="field"><label>Pedido inicial</label><input className="input" type="date" value={filters.orderStart} max={today} onChange={e=>setFilters({...filters,orderStart:e.target.value})}/></div><div className="field"><label>Pedido final</label><input className="input" type="date" value={filters.orderEnd} max={today} onChange={e=>setFilters({...filters,orderEnd:e.target.value})}/></div>
        <div className="field"><label>Status</label><select className="select" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="all">Todos</option><option value="authorized">Autorizadas</option><option value="rejected">Rejeitadas</option><option value="technical_failure">Falha técnica</option><option value="cancelled">Canceladas</option><option value="processing">Processando</option></select></div>
        <div className="field"><label>Pagamento</label><select className="select" value={filters.payment} onChange={e=>setFilters({...filters,payment:e.target.value})}><option value="all">Todos</option><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="debit">Débito</option><option value="credit">Crédito</option></select></div>
        <div className="field"><label>Origem</label><select className="select" value={filters.source} onChange={e=>setFilters({...filters,source:e.target.value})}><option value="all">Todas</option><option value="cardapio">Cardápio</option><option value="pdv">PDV</option><option value="mesa">Mesa</option><option value="ifood">iFood</option><option value="99food">99Food</option></select></div>
        <div className="field field-grow"><label>Pedido, NFC-e, chave ou cliente</label><input className="input" placeholder="Buscar..." value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")search(1)}}/></div>
        <button className="btn btn-primary filter-submit" onClick={()=>search(1)} disabled={loading}><Icon name="filter" size={16}/>{loading?"Filtrando…":"Aplicar filtros"}</button>
      </div>
    </div>
    {message&&<div className={`notice ${message.type==="error"?"red":message.type==="success"?"green":""}`} style={{marginTop:14}}>{message.text}</div>}
    <div className="card result-card">
      <div className="table-toolbar"><div><strong>Documentos fiscais</strong><span>{range}</span></div><div className="pagination"><button className="btn btn-sm" disabled={page<=1||loading} onClick={()=>search(page-1)}>Anterior</button><span>Página {page} / {pages}</span><button className="btn btn-sm" disabled={page>=pages||loading} onClick={()=>search(page+1)}>Próxima</button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Emissão</th><th>NFC-e</th><th>Pagamento</th><th>Origem</th><th>Valor</th><th>Status</th><th>Chave</th><th></th></tr></thead><tbody>{docs.map((d:any)=><tr key={d.id}><td><strong>#{d.order_number||d.external_order_id}</strong><span className="table-sub">{d.customer_name||"Consumidor"}</span></td><td>{d.issued_at?dateTime(d.issued_at):"—"}</td><td>{d.number||"—"}</td><td>{paymentLabel[d.payment_method]||"—"}</td><td>{sourceLabel[d.source]||"—"}</td><td><strong>{currency(Number(d.total_amount||0))}</strong></td><td><StatusBadge status={d.status}/></td><td><span className="mono-key">{d.access_key?`${d.access_key.slice(0,8)}…${d.access_key.slice(-6)}`:"—"}</span></td><td><button className="icon-btn" title="Ver documento" onClick={()=>openDetail(d)}><Icon name="eye" size={17}/></button></td></tr>)}</tbody></table></div>
      {!docs.length&&<div className="empty-state"><div className="empty-icon"><Icon name="file" size={28}/></div><strong>Nenhum documento encontrado</strong><span>Ajuste os filtros ou emita a primeira NFC-e.</span><a className="btn btn-primary" href="/emissao">Emitir NFC-e</a></div>}
    </div>

    {drawer&&<div className="drawer-backdrop" onMouseDown={()=>setDrawer(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><div><div className="modal-kicker">Documento fiscal</div><h2>NFC-e {drawer.number||"—"}</h2><span>Pedido #{drawer.order_number||drawer.external_order_id}</span></div><button className="modal-close static" onClick={()=>setDrawer(null)}><Icon name="close"/></button></div>
      <div className="drawer-status"><StatusBadge status={drawer.status}/><strong>{currency(Number(drawer.total_amount||0))}</strong></div>
      <div className="detail-grid"><div><span>Emissão</span><strong>{drawer.issued_at?dateTime(drawer.issued_at):"—"}</strong></div><div><span>Série</span><strong>{drawer.series||"—"}</strong></div><div><span>Protocolo</span><strong>{drawer.protocol||"—"}</strong></div><div><span>Pagamento</span><strong>{paymentLabel[drawer.payment_method]||"—"}</strong></div></div>
      <div className="detail-block"><span>Chave de acesso</span><div className="copy-line"><code>{drawer.access_key||"Não disponível"}</code>{drawer.access_key&&<button className="icon-btn" onClick={()=>copyKey(drawer.access_key)} title="Copiar chave"><Icon name="copy" size={16}/></button>}</div></div>
      {drawer.error_message&&<div className="notice red"><strong>Problema na emissão</strong><br/>{drawer.error_message}{drawer.error_code&&<><br/><small>Código: {drawer.error_code}</small></>}</div>}
      <div className="drawer-actions">{drawer.xml_path&&<a className="btn" href={`/api/fiscal/file?path=${encodeURIComponent(drawer.xml_path)}`}><Icon name="download" size={16}/>XML</a>}{drawer.pdf_path&&<a className="btn" href={`/api/fiscal/file?path=${encodeURIComponent(drawer.pdf_path)}`}><Icon name="download" size={16}/>DANFC-e</a>}{drawer.qr_code&&/^https?:/.test(drawer.qr_code)&&<a className="btn" target="_blank" rel="noreferrer" href={drawer.qr_code}>QR Code</a>}{drawer.status==='authorized'&&<button className="btn btn-danger" onClick={()=>setCancelOpen(true)}>Cancelar NFC-e</button>}</div>
      <div className="timeline"><h3>Histórico</h3>{events.map((e:any)=><div className="timeline-item" key={e.id}><span className={`timeline-dot ${e.status||""}`}/><div><strong>{e.message||e.event_type}</strong><span>{dateTime(e.created_at)}</span></div></div>)}{!events.length&&<span className="muted">Nenhum evento registrado.</span>}</div>
    </aside></div>}

    {cancelOpen&&drawer&&<div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={()=>setCancelOpen(false)}><Icon name="close"/></button><div className="modal-kicker">Ação crítica</div><h2>Cancelar NFC-e {drawer.number||""}</h2><p className="modal-copy">A solicitação será enviada à Focus/SEFAZ e está sujeita às regras e prazos fiscais aplicáveis.</p><div className="field"><label>Justificativa</label><textarea className="textarea" rows={4} maxLength={255} value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Descreva o motivo do cancelamento..."/><small className="field-hint">{justification.length}/255 • mínimo 15 caracteres</small></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setCancelOpen(false)}>Voltar</button><button className="btn btn-danger" disabled={loading||justification.trim().length<15} onClick={cancel}>{loading?"Cancelando…":"Confirmar cancelamento"}</button></div></div></div>}
  </>;
}
