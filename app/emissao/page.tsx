import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { EmissionClient } from "@/components/EmissionClient";
import { asDateInput } from "@/lib/utils";

export default async function EmissaoPage({ searchParams }: { searchParams: Promise<{start?:string;end?:string}> }) {
  const session=await guardPage(); const params=await searchParams; const today=asDateInput();
  return <Shell active="/emissao" email={session.email}>
    <div className="page-head"><div><div className="page-kicker">Emissão em lote</div><h1 className="page-title">Emitir NFC-e</h1><p className="page-desc">Encontre pedidos por data, pagamento e origem, selecione somente os que entram na rodada e valide tudo antes de transmitir.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>A data do filtro localiza o pedido histórico. O sistema não retroage a data de autorização fiscal; a emissão usa a data efetivamente aceita pela Focus/SEFAZ.</div>
    <EmissionClient initialStart={params.start||today} initialEnd={params.end||params.start||today}/>
  </Shell>
}
