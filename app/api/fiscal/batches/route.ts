import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import type { FiscalOrder } from "@/lib/types";
import { createBatch, getProfiles, getExistingDocument, saveOrderSnapshot } from "@/lib/repo/fiscal";
import { validateOrders } from "@/lib/fiscal";
import { emitNfce } from "@/lib/focus/provider";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const session=await requireSession();
    const body=await request.json(); const orders=(body.orders||[]) as FiscalOrder[];
    if(!orders.length) return NextResponse.json({error:"Nenhum pedido selecionado."},{status:400});
    if(orders.length>500) return NextResponse.json({error:"Limite de 500 pedidos por lote."},{status:400});
    const profiles=await getProfiles();
    const issues=validateOrders(orders,profiles);
    if(issues.length) return NextResponse.json({error:"Há pedidos inválidos. Execute a pré-validação novamente.",issues},{status:422});
    for(const order of orders){if(await getExistingDocument(order.externalId)) return NextResponse.json({error:`Pedido #${order.number} já possui emissão ativa.`},{status:409});}
    if(!env.demoMode){ for(const order of orders){ await saveOrderSnapshot(order); } }
    const batch=await createBatch(orders,session.email);

    // Em DEMO processamos imediatamente apenas para a interface ser testável.
    // Em produção, a função SQL/worker descrita no README deve consumir fiscal_batch_items
    // em pequenos grupos. Isto evita timeout da Vercel e mantém o lote recuperável.
    const results=[] as any[];
    if(env.demoMode){
      for(const order of orders){results.push({orderId:order.externalId,result:await emitNfce(order,profiles)});}
    }
    return NextResponse.json({batch,queued:orders.length,processed:env.demoMode?orders.length:0,results,demo:env.demoMode});
  } catch(e:any){return NextResponse.json({error:e.message||"Erro"},{status:e.message==="UNAUTHORIZED"?401:500});}
}
