import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { EmissionClient } from "@/components/EmissionClient";
import { asDateInput } from "@/lib/utils";

export default async function EmissaoPage({ searchParams }: { searchParams: Promise<{start?:string;end?:string}> }) {
  const session=await guardPage(); const params=await searchParams; const today=asDateInput();
  return <Shell active="/emissao" email={session.email}>
    <div className="page-head"><div><h1 className="page-title">Emitir NFC-e</h1><p className="page-desc">Filtre pedidos antigos ou atuais, escolha exatamente os que entram na rodada e execute a emissão em lote.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>O sistema nunca altera a data histórica do pedido para simular uma autorização anterior. O filtro é operacional; a emissão segue a data efetiva aceita pela Focus/SEFAZ.</div>
    <EmissionClient initialStart={params.start||today} initialEnd={params.end||params.start||today}/>
  </Shell>
}
