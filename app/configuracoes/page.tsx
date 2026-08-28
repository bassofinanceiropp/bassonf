import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { env } from "@/lib/env";

function State({ok}:{ok:boolean}){return <span className={`badge ${ok?'green':'red'}`}>{ok?'Configurado':'Pendente'}</span>}
export default async function ConfiguracoesPage(){
  const session=await guardPage();
  return <Shell active="/configuracoes" email={session.email}>
    <div className="page-head"><div><h1 className="page-title">Configurações</h1><p className="page-desc">Diagnóstico de integração. Segredos nunca são exibidos no navegador.</p></div></div>
    <div className="grid grid-2">
      <div className="card card-pad"><h2 className="section-title">Aplicação</h2><div className="grid" style={{gap:12}}><div className="kpi-line"><span className="muted">Modo</span><strong>{env.demoMode?'Demonstração':'Produção técnica'}</strong></div><div className="kpi-line"><span className="muted">Empresa</span><strong>{env.companyName}</strong></div><div className="kpi-line"><span className="muted">UF</span><strong>{env.companyUf}</strong></div></div></div>
      <div className="card card-pad"><h2 className="section-title">Focus NFe</h2><div className="grid" style={{gap:12}}><div className="kpi-line"><span className="muted">Ambiente</span><strong>{env.focusEnv}</strong></div><div className="kpi-line"><span className="muted">Token</span><State ok={!!env.focusToken}/></div><div className="kpi-line"><span className="muted">CNPJ/IE</span><State ok={!!env.companyDocument&&!!env.companyIe}/></div></div></div>
      <div className="card card-pad"><h2 className="section-title">Banco fiscal</h2><div className="grid" style={{gap:12}}><div className="kpi-line"><span className="muted">Supabase URL</span><State ok={!!env.supabaseUrl}/></div><div className="kpi-line"><span className="muted">Service Role</span><State ok={!!env.supabaseServiceRoleKey}/></div><div className="kpi-line"><span className="muted">Bucket</span><strong>{env.storageBucket}</strong></div></div></div>
      <div className="card card-pad"><h2 className="section-title">Integração Basso</h2><div className="grid" style={{gap:12}}><div className="kpi-line"><span className="muted">API de pedidos</span><State ok={!!env.ordersApiUrl}/></div><div className="kpi-line"><span className="muted">Chave read-only</span><State ok={!!env.ordersApiKey}/></div><div className="kpi-line"><span className="muted">Separação</span><span className="badge green">Projeto independente</span></div></div></div>
    </div>
    <div className="notice" style={{marginTop:16}}>Comece sempre em <code>DEMO_MODE=true</code>. Depois configure Supabase próprio, API read-only de pedidos e Focus em homologação. Só então desative o demo.</div>
  </Shell>
}
