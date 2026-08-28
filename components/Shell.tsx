import Link from "next/link";
import { env } from "@/lib/env";

const nav = [
  ["/dashboard", "Visão geral"],
  ["/emissao", "Emitir notas"],
  ["/lotes", "Lotes de emissão"],
  ["/documentos", "Documentos"],
  ["/contabilidade", "Contabilidade"],
  ["/produtos-fiscais", "Produtos fiscais"],
  ["/configuracoes", "Configurações"],
];

export function Shell({ children, active, email }: { children: React.ReactNode; active: string; email: string }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-kicker">PedidoPro Fiscal</div>
        <div className="brand-title">La Forneria Basso</div>
        <div className="brand-sub">Módulo independente de NFC-e</div>
      </div>
      <nav className="nav">
        {nav.map(([href, label]) => <Link className={active === href ? "active" : ""} href={href} key={href}>{label}</Link>)}
      </nav>
      <div className="sidebar-foot">
        <div className="muted" style={{fontSize:12, marginBottom:10}}>{email}</div>
        <form action="/api/auth/logout" method="post"><button className="btn btn-ghost" style={{width:"100%"}}>Sair</button></form>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="top-title">{env.appName}</div>
        <div className="top-meta"><span className="dot" /> {env.demoMode ? "Modo demonstração" : env.focusEnv === "producao" ? "Produção" : "Homologação"}</div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>
}
