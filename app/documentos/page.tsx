import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { listDocumentsPage } from "@/lib/repo/fiscal";
import { DocumentsClient } from "@/components/DocumentsClient";

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{start?:string;end?:string;orderStart?:string;orderEnd?:string;status?:string;payment?:string;source?:string;q?:string}> }) {
  const session=await guardPage();
  const params=await searchParams;
  const filters={start:params.start||"",end:params.end||"",orderStart:params.orderStart||"",orderEnd:params.orderEnd||"",status:params.status||"all",payment:params.payment||"all",source:params.source||"all",q:params.q||""};
  let result={documents:[] as any[],total:0,page:1,pageSize:50};
  try{result=await listDocumentsPage(filters,1,50);}catch{}
  return <Shell active="/documentos" email={session.email}><div className="page-head"><div><div className="page-kicker">Histórico fiscal</div><h1 className="page-title">Documentos</h1><p className="page-desc">Consulte NFC-e, arquivos, eventos, rejeições e cancelamentos sem carregar centenas de registros de uma vez.</p></div></div><DocumentsClient initial={result.documents} initialTotal={result.total} initialFilters={filters}/></Shell>
}
