export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function dateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function asDateInput(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function safeReference(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 80);
}

export function digits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function monthRange(date = new Date()) {
  const today = asDateInput(date);
  return { start: `${today.slice(0, 7)}-01`, end: today };
}

export function previousMonthRange(date = new Date()) {
  const now = new Date(date);
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() - 1);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const last = new Date(Date.UTC(year, now.getUTCMonth() + 1, 0)).getUTCDate();
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${String(last).padStart(2, "0")}` };
}
