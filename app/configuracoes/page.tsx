import { guardPage } from "@/lib/auth/guard";
import { Shell } from "@/components/Shell";
import { env } from "@/lib/env";
import { getFiscalSettings } from "@/lib/repo/fiscal";
import { SettingsClient } from "@/components/SettingsClient";

export default async function ConfiguracoesPage(){
  const session=await guardPage(); const settings=await getFiscalSettings();
  return <Shell active="/configuracoes" email={session.email}>
    <div className="page-head"><div><div className="page-kicker">Administração</div><h1 className="page-title">Configurações</h1><p className="page-desc">Dados fiscais, ambiente, diagnóstico das integrações e checklist para sair da homologação com segurança.</p></div></div>
    <SettingsClient initialSettings={settings} demoMode={env.demoMode} focusDeployEnv={env.focusEnv}/>
  </Shell>
}
