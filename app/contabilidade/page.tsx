import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { AccountingClient } from "@/components/AccountingClient";
import { listExports } from "@/lib/repo/fiscal";
import { dateOnly, dateTime } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function ContabilidadePage(){
  const session=await guardPage();let exportsList:any[]=[];try{exportsList=await listExports();}catch{}
  return <Shell active="/contabilidade" email={session.email}><div className="page-head"><div><div className="page-kicker">Fechamento mensal</div><h1 className="page-title">Contabilidade</h1><p className="page-desc">Gere um pacote organizado por período com arquivos fiscais e relatórios prontos para conferência.</p></div></div><AccountingClient/>
    <div className="card result-card" style={{marginTop:16}}><div className="table-toolbar"><div><strong>Exportações recentes</strong><span>Histórico de pacotes gerados</span></div></div><div className="table-wrap"><table><thead><tr><th>Período</th><th>Documentos</th><th>Gerado por</th><th>Data</th><th></th></tr></thead><tbody>{exportsList.map((item:any)=><tr key={item.id}><td><strong>{dateOnly(`${item.period_start}T12:00:00-03:00`)} → {dateOnly(`${item.period_end}T12:00:00-03:00`)}</strong></td><td>{item.documents_count}</td><td>{item.created_by||"Sistema"}</td><td>{dateTime(item.created_at)}</td><td><a className="btn btn-sm" href={`/api/accounting/export?start=${item.period_start}&end=${item.period_end}`}><Icon name="download" size={14}/>Gerar novamente</a></td></tr>)}</tbody></table></div>{!exportsList.length&&<div className="empty-state"><div className="empty-icon"><Icon name="briefcase" size={28}/></div><strong>Nenhuma exportação registrada</strong><span>O histórico aparecerá depois do primeiro pacote.</span></div>}</div>
    <div className="notice" style={{marginTop:16}}>Os XMLs ficam no storage privado do projeto Fiscal. O sistema operacional da Basso não recebe acesso direto a esse armazenamento.</div>
  </Shell>
}
