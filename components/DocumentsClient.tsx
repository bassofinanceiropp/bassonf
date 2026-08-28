"use client";
import { useState } from "react";
import { currency, dateTime } from "@/lib/utils";

export function DocumentsClient({ initial }: { initial: any[] }) {
  const [docs,setDocs]=useState(initial); const [message,setMessage]=useState("");
  async function cancel(doc:any){
    const justification=window.prompt("Justificativa do cancelamento (mínimo 15 caracteres):");
    if(!justification) return;
    const res=await fetch(`/api/fiscal/documents/${doc.id}/cancel`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({justification})});
    const data=await res.json(); if(!res.ok){setMessage(data.error||"Falha ao cancelar");return;}
    setDocs(ds=>ds.map(d=>d.id===doc.id?{...d,status:"cancelled"}:d)); setMessage(`NFC-e do pedido #${doc.order_number} cancelada.`);
  }
  return <>{message&&<div className="notice" style={{marginBottom:14}}>{message}</div>}<div className="card"><div className="table-wrap" style={{border:0}}><table><thead><tr><th>Pedido</th><th>Emissão</th><th>NFC-e</th><th>Valor</th><th>Status</th><th>Chave</th><th>Ações</th></tr></thead><tbody>{docs.map((d:any)=><tr key={d.id}><td><strong>#{d.order_number||d.external_order_id}</strong></td><td>{d.issued_at?dateTime(d.issued_at):"—"}</td><td>{d.number||"—"}</td><td>{currency(Number(d.total_amount||0))}</td><td><span className={`badge ${d.status==='authorized'?'green':d.status==='rejected'?'red':'gray'}`}>{d.status==='authorized'?'Autorizada':d.status==='rejected'?'Rejeitada':d.status==='cancelled'?'Cancelada':d.status}</span></td><td><span style={{fontFamily:"monospace",fontSize:11}}>{d.access_key?`${d.access_key.slice(0,8)}…${d.access_key.slice(-6)}`:"—"}</span></td><td><div className="actions-row">{d.xml_path&&<a className="btn btn-sm" href={`/api/fiscal/file?path=${encodeURIComponent(d.xml_path)}`}>XML</a>}{d.pdf_path&&<a className="btn btn-sm" href={`/api/fiscal/file?path=${encodeURIComponent(d.pdf_path)}`}>PDF</a>}{d.status==='authorized'&&<button className="btn btn-sm btn-danger" onClick={()=>cancel(d)}>Cancelar</button>}</div></td></tr>)}</tbody></table></div>{!docs.length&&<div className="empty">Nenhum documento fiscal encontrado.</div>}</div></>
}
