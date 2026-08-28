import type { FiscalStatus } from "@/lib/types";

const labels: Record<FiscalStatus, [string, string]> = {
  not_issued: ["Não emitido", "gray"],
  queued: ["Na fila", "orange"],
  processing: ["Processando", "orange"],
  authorized: ["Autorizada", "green"],
  rejected: ["Rejeitada", "red"],
  technical_failure: ["Falha técnica", "red"],
  cancelled: ["Cancelada", "gray"],
};
export function StatusBadge({ status }: { status: FiscalStatus }) {
  const [label, color] = labels[status] || [status, "gray"];
  return <span className={`badge ${color}`}>{label}</span>;
}
