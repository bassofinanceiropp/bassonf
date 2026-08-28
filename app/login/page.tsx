import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentSession()) redirect("/dashboard");
  const params = await searchParams;
  return <div className="login-shell">
    <div className="card login-card">
      <div className="login-logo">BF</div>
      <h1 className="login-title">Basso Fiscal</h1>
      <p className="login-copy">Emissão de NFC-e, lotes e exportação para contabilidade em um projeto isolado do sistema operacional da pizzaria.</p>
      {params.error && <div className="notice red" style={{marginBottom:16}}>E-mail ou senha inválidos.</div>}
      <form action="/api/auth/login" method="post" className="grid" style={{gap:14}}>
        <div className="field"><label>E-mail</label><input className="input" type="email" name="email" required autoComplete="username" /></div>
        <div className="field"><label>Senha</label><input className="input" type="password" name="password" required autoComplete="current-password" /></div>
        <button className="btn btn-primary" type="submit" style={{marginTop:4}}>Entrar no módulo fiscal</button>
      </form>
      <div className="muted" style={{fontSize:11, marginTop:18}}>Credenciais definidas apenas por variáveis de ambiente. Troque a senha antes de produção.</div>
    </div>
  </div>
}
