import { env } from "@/lib/env";
import { adminSupabase } from "@/lib/repo/supabase";
import { downloadFocusArtifact } from "@/lib/focus/provider";
import type { CompanyFiscalSettings } from "@/lib/types";

export async function archiveFocusArtifacts(documentId: string, orderId: string, response: any, settings?: CompanyFiscalSettings) {
  if (env.demoMode) return { xmlPath: null, pdfPath: null };
  const db = adminSupabase();
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  let xmlPath: string | null = null;
  let pdfPath: string | null = null;

  const xmlRemote = response?.caminho_xml_nota_fiscal || response?.url_xml;
  if (xmlRemote) {
    const bytes = await downloadFocusArtifact(xmlRemote, settings);
    xmlPath = `${env.companySlug}/${yyyy}/${mm}/xml/${orderId}.xml`;
    const { error } = await db.storage.from(env.storageBucket).upload(xmlPath, bytes, { contentType: "application/xml", upsert: true });
    if (error) throw error;
  }

  const pdfRemote = response?.caminho_danfe || response?.url_danfe;
  if (pdfRemote) {
    const bytes = await downloadFocusArtifact(pdfRemote, settings);
    pdfPath = `${env.companySlug}/${yyyy}/${mm}/pdf/${orderId}.pdf`;
    const { error } = await db.storage.from(env.storageBucket).upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
  }

  const { error: updateError } = await db.from("fiscal_documents").update({ xml_path: xmlPath, pdf_path: pdfPath }).eq("id", documentId);
  if (updateError) throw updateError;
  return { xmlPath, pdfPath };
}

export async function downloadStored(path: string) {
  const db = adminSupabase();
  const { data, error } = await db.storage.from(env.storageBucket).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}
