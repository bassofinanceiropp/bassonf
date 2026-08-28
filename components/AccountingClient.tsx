"use client";
import { useEffect, useState } from "react";
import { asDateInput, currency } from "@/lib/utils";
import { Icon } from "@/components/Icon";

const paymentLabel:Record<string,string>={pix:"PIX",cash:"Dinheiro",debit:"Débito",credit:"Crédito",other:"Outro"};
const sourceLabel:Record<string,string>={cardapio:"Cardápio",pdv:"PDV",mesa:"Mesa",ifood:"iFood","99food":"99Food",other:"Outro"};

export function AccountingClient(){
  const today=asDateInput(); const month=today.slice(0,7);
  const [start,setStart]=useState(`${month}-01`); const [end,setEnd]=useState(today);
  const [preview,setPreview]=useState<any|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  async function loadPreview(){setLoading(true);setError("");try{const res=await fetch(`/api/accounting/preview?start=${start}&end=${end}`,{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao calcular período");setPreview(data);}catch(e:any){setError(e.message||"Erro");}finally{setLoading(false);}}
  useEffect(()=>{void loadPreview();},[]);
  return <>
    <div className="card accounting-hero"><div className="accounting-copy"><div className="section-kicker">Fechamento contábil</div><h2>Monte o pacote fiscal do período</h2><p>O ZIP reúne relatório CSV, planilha Excel, resumo PDF e, em produção, todos os XML/DANFC-e arquivados.</p></div><div className="accounting-filter"><div className="field"><label>Data inicial</label><input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><label>Data final</label><input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div><button className="btn" onClick={loadPreview} disabled={loading}><Icon name="refresh" size={16}/>{loading?"Calculando…":"Atualizar prévia"}</button></div></div>
    {error&&<div className="notice red" style={{marginTop:14}}>{error}</div>}
    {preview&&<div className="grid grid-4" style={{marginTop:16}}><div className="card stat-card"><span>Autorizadas</span><strong>{preview.authorized}</strong><em>No período</em></div><div className="card stat-card"><span>Valor total</span><strong>{currency(Number(preview.total||0))}</strong><em>Documentos válidos</em></div><div className="card stat-card"><span>XML arquivados</span><strong>{preview.xml}</strong><em>Disponíveis no storage</em></div><div className="card stat-card"><span>Canceladas</span><strong>{preview.cancelled}</strong><em>No mesmo período</em></div></div>}
    {preview&&<div className="grid grid-2" style={{marginTop:16}}><div className="card card-pad"><div className="section-head"><div><div className="section-kicker">Conciliação</div><h2>Por pagamento</h2></div></div><div className="breakdown-list">{(preview.byPayment||[]).map((row:any)=><div key={row.key}><span>{paymentLabel[row.key]||row.key}</span><strong>{row.count} • {currency(Number(row.total||0))}</strong></div>)}{!(preview.byPayment||[]).length&&<span className="muted">Sem documentos no período.</span>}</div></div><div className="card card-pad"><div className="section-head"><div><div className="section-kicker">Origem</div><h2>Por canal</h2></div></div><div className="breakdown-list">{(preview.bySource||[]).map((row:any)=><div key={row.key}><span>{sourceLabel[row.key]||row.key}</span><strong>{row.count} • {currency(Number(row.total||0))}</strong></div>)}{!(preview.bySource||[]).length&&<span className="muted">Sem documentos no período.</span>}</div></div></div>}
    <div className="card package-card" style={{marginTop:16}}><div><div className="package-icon"><Icon name="briefcase" size={24}/></div><div><strong>Basso-Fiscal-{start}-a-{end}.zip</strong><span>XML • DANFC-e • fiscal.xlsx • fiscal.csv • resumo.pdf</span></div></div><a className="btn btn-primary" href={`/api/accounting/export?start=${start}&end=${end}`}><Icon name="download" size={16}/>Gerar e baixar pacote</a></div>
  </>;
}
