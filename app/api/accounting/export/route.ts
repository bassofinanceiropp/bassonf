import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listDocuments } from "@/lib/repo/fiscal";
import { downloadStored } from "@/lib/storage";
import { env } from "@/lib/env";

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || start;
    if (!start || !end) return NextResponse.json({ error: "Informe o período." }, { status: 400 });
    const documents = await listDocuments({ start, end, status: "authorized" }, 2000);
    const zip = new JSZip();
    const header = ["Pedido","Data Pedido","Data Emissão","NFC-e","Série","Chave","Valor","Pagamento","Origem","Status"];
    const rows = documents.map((d: any) => [d.order_number,d.ordered_at,d.issued_at,d.number,d.series,d.access_key,d.total_amount,d.payment_method,d.source,d.status]);
    zip.file("Relatorios/fiscal.csv", [header,...rows].map(r=>r.map(csvValue).join(";")).join("\n"));
    zip.file("LEIA-ME.txt", `La Forneria Basso - pacote fiscal\nPeríodo: ${start} a ${end}\nDocumentos autorizados: ${documents.length}\nGerado em: ${new Date().toISOString()}\n`);

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
    const name = `Basso-Fiscal-${start}-a-${end}.zip`;
    return new NextResponse(bytes, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao gerar pacote" }, { status: e.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
