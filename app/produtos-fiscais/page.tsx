import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { listFiscalProducts, listProfileRows } from "@/lib/repo/fiscal";
import { FiscalProductsClient } from "@/components/FiscalProductsClient";

export default async function ProdutosFiscaisPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }){
  const session=await guardPage(); const params=await searchParams; const q=params.q||""; const status=params.status||"all";
  let result={products:[] as any[],total:0,page:1,pageSize:50}; let profiles:any[]=[];
  try{result=await listFiscalProducts({q,status},1,50);profiles=await listProfileRows();}catch{}
  return <Shell active="/produtos-fiscais" email={session.email}>
    <div className="page-head"><div><div className="page-kicker">Cadastro tributário</div><h1 className="page-title">Produtos fiscais</h1><p className="page-desc">Configure produtos individualmente ou aplique perfis fiscais em massa. A pré-validação usa exatamente estes dados.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>NCM, CFOP, CST/CSOSN, CEST, PIS, COFINS e ICMS devem ser validados pela contabilidade. O sistema não determina enquadramento tributário automaticamente.</div>
    <FiscalProductsClient initialProducts={result.products} initialTotal={result.total} profiles={profiles} initialQuery={q} initialStatus={status}/>
  </Shell>
}
