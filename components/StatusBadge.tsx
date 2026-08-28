import type { FiscalStatus } from "@/lib/types";

const labels: Record<FiscalStatus, string> = {
  not_issued: "Não emitido",
  queued: "Na fila",
  processing: "Processando",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  technical_failure: "Falha técnica",
  cancelled: "Cancelada",
};

export function StatusBadge({ status }: { status: FiscalStatus | string }) {
  const cls = status === "authorized" ? "green" : status === "rejected" || status === "technical_failure" ? "red" : status === "queued" || status === "processing" ? "orange" : "gray";
  return <span className={`badge ${cls}`}><span className="badge-dot" />{labels[status as FiscalStatus] || status}</span>;
}
