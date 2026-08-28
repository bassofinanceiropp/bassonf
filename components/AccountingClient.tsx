"use client";
import { useState } from "react";
import { asDateInput } from "@/lib/utils";

export function AccountingClient(){
  const today=asDateInput(); const month=today.slice(0,7); const [start,setStart]=useState(`${month}-01`); const [end,setEnd]=useState(today);
  return <div className="card card-pad"><h2 className="section-title">Gerar pacote para contabilidade</h2><p className="muted">Cria um ZIP com relatório CSV e, em produção, os XML/PDF arquivados disponíveis no período.</p><div className="grid grid-3" style={{marginTop:16,alignItems:"end"}}><div className="field"><label>Data inicial</label><input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><label>Data final</label><input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div><a className="btn btn-primary" href={`/api/accounting/export?start=${start}&end=${end}`}>Gerar ZIP</a></div></div>
}
