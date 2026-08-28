import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { getProfiles } from "@/lib/repo/fiscal";

export default async function ProdutosFiscaisPage(){
  const session=await guardPage(); let profiles:any[]=[]; try{profiles=await getProfiles();}catch{}
  return <Shell active="/produtos-fiscais" email={session.email}>
    <div className="page-head"><div><h1 className="page-title">Produtos fiscais</h1><p className="page-desc">Mapa tributário usado na pré-validação e na montagem do payload enviado à Focus NFe.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>NCM, CFOP, CST/CSOSN, CEST, PIS, COFINS e ICMS devem ser conferidos pela contabilidade antes de produção. Os dados de demonstração não são orientação tributária.</div>
    <div className="card"><div className="table-wrap" style={{border:0}}><table><thead><tr><th>SKU</th><th>Produto</th><th>NCM</th><th>CEST</th><th>CFOP</th><th>CST/CSOSN</th><th>Origem</th><th>Un.</th></tr></thead><tbody>{profiles.map((p:any)=><tr key={p.sku}><td><code>{p.sku}</code></td><td><strong>{p.name}</strong></td><td>{p.ncm||<span className="badge red">Pendente</span>}</td><td>{p.cest||"—"}</td><td>{p.cfop||"—"}</td><td>{p.cstCsosn||"—"}</td><td>{p.origin||"—"}</td><td>{p.unit||"UN"}</td></tr>)}</tbody></table></div>{!profiles.length&&<div className="empty">Nenhum perfil fiscal cadastrado.</div>}</div>
  </Shell>
}
