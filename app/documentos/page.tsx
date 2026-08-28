import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { listDocuments } from "@/lib/repo/fiscal";
import { DocumentsClient } from "@/components/DocumentsClient";

export default async function DocumentosPage() {
  const session=await guardPage(); let docs:any[]=[]; try{docs=await listDocuments({},500);}catch{}
  return <Shell active="/documentos" email={session.email}><div className="page-head"><div><h1 className="page-title">Documentos fiscais</h1><p className="page-desc">Histórico de NFC-e, chaves, XML/DANFC-e arquivados e cancelamentos.</p></div></div><DocumentsClient initial={docs}/></Shell>
}
