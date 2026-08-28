import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getProfiles, getExistingDocument } from "@/lib/repo/fiscal";
import { validateOrders } from "@/lib/fiscal";
import type { FiscalOrder, ValidationIssue } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireSession();
    const body=await request.json(); const orders=(body.orders||[]) as FiscalOrder[];
    if(!Array.isArray(orders)||orders.length===0) return NextResponse.json({error:"Selecione pelo menos um pedido."},{status:400});
    if(orders.length>500) return NextResponse.json({error:"Limite de 500 pedidos por lote."},{status:400});
    const profiles=await getProfiles();
    const issues:ValidationIssue[]=validateOrders(orders,profiles);
    for(const order of orders){
      const existing=await getExistingDocument(order.externalId);
      if(existing) issues.push({orderId:order.id,orderNumber:order.number,code:"DUPLICATE",message:"Já existe documento fiscal ativo/na fila para este pedido."});
    }
    return NextResponse.json({issues,validCount:orders.length-new Set(issues.map(i=>i.orderId)).size});
  } catch(e:any){return NextResponse.json({error:e.message||"Erro"},{status:e.message==="UNAUTHORIZED"?401:500});}
}
