import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; retry?: string }> }) {
  if (await currentSession()) redirect("/dashboard");
  const params = await searchParams;
  const message = params.error === "blocked" ? `Muitas tentativas. Tente novamente em alguns minutos.` : params.error === "config" ? "A autenticação ainda não está configurada corretamente no Vercel." : params.error === "origin" ? "Origem inválida para login." : params.error ? "E-mail ou senha inválidos." : "";
  return <div className="login-shell">
    <div className="login-visual"><div className="login-badge">PEDIDOPRO FISCAL</div><h1>Fiscal simples para uma operação que não pode parar.</h1><p>Pedidos, NFC-e, lotes, documentos e contabilidade em um módulo independente do sistema principal da Basso.</p><div className="login-points"><span>✓ Projeto separado</span><span>✓ Focus NFe isolada no backend</span><span>✓ Histórico e auditoria</span></div></div>
    <div className="card login-card">
      <div className="login-logo">BF</div>
      <div className="page-kicker">La Forneria Basso</div>
      <h2 className="login-title">Acessar central fiscal</h2>
      <p className="login-copy">Entre com as credenciais administrativas configuradas no ambiente do projeto.</p>
      {message && <div className="notice red" style={{marginBottom:16}}>{message}</div>}
      <form action="/api/auth/login" method="post" className="grid" style={{gap:14}}>
        <div className="field"><label>E-mail</label><input className="input input-lg" type="email" name="email" required autoComplete="username" placeholder="financeiro@empresa.com" /></div>
        <div className="field"><label>Senha</label><input className="input input-lg" type="password" name="password" required autoComplete="current-password" placeholder="••••••••••••" /></div>
        <button className="btn btn-primary btn-lg" type="submit" style={{marginTop:4}}>Entrar no Basso Fiscal</button>
      </form>
      <div className="login-security">A sessão é assinada no servidor e as credenciais fiscais não são expostas ao navegador.</div>
    </div>
  </div>
}
