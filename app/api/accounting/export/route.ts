import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listDocuments, recordExport } from "@/lib/repo/fiscal";
import { downloadStored } from "@/lib/storage";
import { env } from "@/lib/env";
import { buildSimplePdf, buildXlsx } from "@/lib/accounting";

function csvValue(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || start;
    if (!start || !end) return NextResponse.json({ error: "Informe o período." }, { status: 400 });
    const documents = await listDocuments({ start, end, status: "authorized" }, 5000);
    const zip = new JSZip();
    const header = ["Pedido","Data Pedido","Data Emissão","NFC-e","Série","Chave","Valor","Pagamento","Origem","Cliente","CPF/CNPJ","Status"];
    const rows = documents.map((d: any) => [d.order_number,d.ordered_at,d.issued_at,d.number,d.series,d.access_key,Number(d.total_amount || 0),d.payment_method,d.source,d.customer_name,d.customer_tax_id,d.status]);
    const allRows = [header, ...rows];
    zip.file("Relatorios/fiscal.csv", allRows.map(r => r.map(csvValue).join(";")).join("\n"));
    zip.file("Relatorios/fiscal.xlsx", await buildXlsx(allRows));
    const total = documents.reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0);
    const paymentLabels:Record<string,string>={pix:"PIX",cash:"Dinheiro",debit:"Debito",credit:"Credito",other:"Outro"};
    const sourceLabels:Record<string,string>={cardapio:"Cardapio",pdv:"PDV",mesa:"Mesa",ifood:"iFood","99food":"99Food",other:"Outro"};
    const summarize = (key:string, labels:Record<string,string>) => Object.entries(documents.reduce((acc:Record<string,{count:number;total:number}>,d:any)=>{const k=String(d[key]||"other");const row=acc[k]||{count:0,total:0};row.count++;row.total+=Number(d.total_amount||0);acc[k]=row;return acc;},{})).map(([k,v])=>`${labels[k]||k}: ${v.count} docs / R$ ${v.total.toFixed(2)}`);
    zip.file("Relatorios/resumo.pdf", buildSimplePdf([
      "LA FORNERIA BASSO - RELATORIO FISCAL",
      `Periodo: ${start} a ${end}`,
      `Documentos autorizados: ${documents.length}`,
      `Valor total: R$ ${total.toFixed(2)}`,
      "", "POR PAGAMENTO", ...summarize("payment_method",paymentLabels),
      "", "POR ORIGEM", ...summarize("source",sourceLabels),
      "", `Gerado em: ${new Date().toISOString()}`,
    ]));
    zip.file("LEIA-ME.txt", `La Forneria Basso - pacote fiscal\nPeríodo: ${start} a ${end}\nDocumentos autorizados: ${documents.length}\nValor total: R$ ${total.toFixed(2)}\nGerado em: ${new Date().toISOString()}\n`);

    if (!env.demoMode) {
      for (const doc of documents as any[]) {
        if (doc.xml_path) {
          try { zip.file(`XML/${doc.access_key || doc.number || doc.id}.xml`, await downloadStored(doc.xml_path)); } catch {}
        }
        if (doc.pdf_path) {
          try { zip.file(`PDF/${doc.number || doc.id}.pdf`, await downloadStored(doc.pdf_path)); } catch {}
        }
      }
    }

    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await recordExport(start, end, documents.length, session.email);
    const body = Uint8Array.from(bytes).buffer;
    const name = `Basso-Fiscal-${start}-a-${end}.zip`;
    return new NextResponse(body, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao gerar pacote" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
