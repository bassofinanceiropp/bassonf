export const env = {
  demoMode: process.env.DEMO_MODE !== "false",
  appName: process.env.APP_NAME || "Basso Fiscal",
  sessionSecret: process.env.APP_SESSION_SECRET || "",
  adminEmail: process.env.APP_ADMIN_EMAIL || "",
  adminPassword: process.env.APP_ADMIN_PASSWORD || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "fiscal-documents",
  ordersApiUrl: process.env.BASSO_ORDERS_API_URL || "",
  ordersApiKey: process.env.BASSO_ORDERS_API_KEY || "",
  focusEnv: (process.env.FOCUS_NFE_ENV || "homologacao") as "homologacao" | "producao",
  focusToken: process.env.FOCUS_NFE_TOKEN || "",
  focusBaseUrl: process.env.FOCUS_NFE_BASE_URL || "",
  focusEmitPath: process.env.FOCUS_NFE_EMIT_PATH || "/v2/nfce",
  focusCancelPathTemplate: process.env.FOCUS_NFE_CANCEL_PATH_TEMPLATE || "/v2/nfce/{ref}",
  focusConsultPathTemplate: process.env.FOCUS_NFE_CONSULT_PATH_TEMPLATE || "/v2/nfce/{ref}",
  companySlug: process.env.COMPANY_SLUG || "la-forneria-basso",
  companyName: process.env.COMPANY_NAME || "La Forneria Basso",
  companyDocument: process.env.COMPANY_DOCUMENT || "",
  companyIe: process.env.COMPANY_IE || "",
  companyCrt: process.env.COMPANY_CRT || "",
  companyUf: process.env.COMPANY_UF || "SP",
};

export function authConfigurationIssues() {
  const issues: string[] = [];
  if (!env.sessionSecret || env.sessionSecret.length < 32) issues.push("APP_SESSION_SECRET deve ter pelo menos 32 caracteres.");
  if (!env.adminEmail) issues.push("APP_ADMIN_EMAIL não configurado.");
  if (!env.adminPassword || env.adminPassword.length < 10) issues.push("APP_ADMIN_PASSWORD deve ter pelo menos 10 caracteres.");
  return issues;
}

export function productionConfigurationIssues() {
  const issues = [...authConfigurationIssues()];
  if (!env.supabaseUrl) issues.push("NEXT_PUBLIC_SUPABASE_URL não configurado.");
  if (!env.supabaseServiceRoleKey) issues.push("SUPABASE_SERVICE_ROLE_KEY não configurado.");
  if (!env.ordersApiUrl) issues.push("BASSO_ORDERS_API_URL não configurada.");
  if (!env.ordersApiKey) issues.push("BASSO_ORDERS_API_KEY não configurada.");
  if (!env.focusToken) issues.push("FOCUS_NFE_TOKEN não configurado.");
  return issues;
}
