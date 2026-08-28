import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { AccountingClient } from "@/components/AccountingClient";

export default async function ContabilidadePage(){const session=await guardPage();return <Shell active="/contabilidade" email={session.email}><div className="page-head"><div><h1 className="page-title">Contabilidade</h1><p className="page-desc">Exporte por período apenas os documentos fiscais autorizados registrados no módulo.</p></div></div><AccountingClient/><div className="notice" style={{marginTop:16}}>Os XMLs ficam em storage privado do projeto Fiscal; o sistema principal da Basso não recebe acesso a esse armazenamento.</div></Shell>}
