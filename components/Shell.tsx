import Link from "next/link";
import { env } from "@/lib/env";
import { Icon } from "@/components/Icon";

const nav = [
  ["/dashboard", "Visão geral", "dashboard"],
  ["/emissao", "Emitir notas", "receipt"],
  ["/lotes", "Lotes de emissão", "layers"],
  ["/documentos", "Documentos", "file"],
  ["/contabilidade", "Contabilidade", "briefcase"],
  ["/produtos-fiscais", "Produtos fiscais", "package"],
  ["/configuracoes", "Configurações", "settings"],
];

export function Shell({ children, active, email }: { children: React.ReactNode; active: string; email: string }) {
  const mode = env.demoMode ? "Demonstração" : env.focusEnv === "producao" ? "Produção" : "Homologação";
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">BF</div>
        <div><div className="brand-kicker">PedidoPro Fiscal</div><div className="brand-title">La Forneria Basso</div><div className="brand-sub">Central fiscal independente</div></div>
      </div>
      <nav className="nav">
        {nav.map(([href, label, icon]) => <Link className={active === href || active.startsWith(`${href}/`) ? "active" : ""} href={href} key={href}><Icon name={icon} size={18}/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-foot">
        <div className="user-chip"><div className="user-avatar">{email.slice(0,1).toUpperCase()}</div><div><strong>{email.split("@")[0]}</strong><span>{email}</span></div></div>
        <form action="/api/auth/logout" method="post"><button className="btn btn-ghost sidebar-logout"><Icon name="logout" size={16}/>Sair</button></form>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="top-eyebrow">{env.appName}</div><div className="top-title">Operação fiscal</div></div>
        <div className={`mode-pill ${env.demoMode ? "demo" : env.focusEnv === "producao" ? "prod" : "homolog"}`}><span className="dot" />{mode}</div>
      </header>
      <div className="content">{children}</div>
      <nav className="mobile-nav">{nav.slice(0,4).map(([href,label,icon])=><Link key={href} href={href} className={active === href || active.startsWith(`${href}/`) ? "active" : ""}><Icon name={icon} size={19}/><span>{label === "Visão geral" ? "Início" : label === "Emitir notas" ? "Emitir" : label === "Lotes de emissão" ? "Lotes" : "Docs"}</span></Link>)}<Link href="/configuracoes" className={active==="/configuracoes"?"active":""}><Icon name="settings" size={19}/><span>Mais</span></Link></nav>
    </main>
  </div>
}
