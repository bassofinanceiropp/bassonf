"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessQueueButton({ batchId, compact = false }: { batchId: string; compact?: boolean }) {
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("Processar pendentes");
  const router = useRouter();

  async function processQueue() {
    setRunning(true);
    try {
      let total = 0;
      for (let i = 0; i < 60; i++) {
        const res = await fetch("/api/fiscal/process-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao processar lote");
        const processed = Number(data.processed || 0);
        total += processed;
        setLabel(processed > 0 ? `Processados: ${total}` : "Atualizando...");
        if (processed === 0) break;
      }
      setLabel("Concluído");
      router.refresh();
    } catch (error: any) {
      setLabel(error?.message || "Falha ao processar");
    } finally {
      setRunning(false);
    }
  }

  return <button className={`btn ${compact ? "btn-sm" : "btn-primary"}`} onClick={processQueue} disabled={running}>{running ? label : "Processar pendentes"}</button>;
}
