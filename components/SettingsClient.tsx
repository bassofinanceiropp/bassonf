"use client";

import { useEffect, useState } from "react";
import type { CompanyFiscalSettings, IntegrationHealthItem } from "@/lib/types";
import { Icon } from "@/components/Icon";

function HealthBadge({status}:{status:string}){
  const cls=status==="online"||status==="configured"?"green":status==="demo"||status==="warning"?"orange":"red";
  const label=status==="online"?"Online":status==="configured"?"Configurado":status==="demo"?"Demo":status==="warning"?"Atenção":"Offline";
  return <span className={`badge ${cls}`}><span className="badge-dot"/>{label}</span>;
}

export function SettingsClient({ initialSettings, demoMode, focusDeployEnv }: { initialSettings: CompanyFiscalSettings; demoMode: boolean; focusDeployEnv: "homologacao"|"producao" }){
  const [settings,setSettings]=useState(initialSettings);
  const [health,setHealth]=useState<IntegrationHealthItem[]>([]);
  const [checklist,setChecklist]=useState<any[]>([]);
  const [productStats,setProductStats]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState<{type:"error"|"success"|"info";text:string}|null>(null);
  const [productionConfirm,setProductionConfirm]=useState(false);

  async function testHealth(){
    setLoading(true);setMessage(null);
    try{const res=await fetch("/api/fiscal/health",{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha no diagnóstico");setHealth(data.items||[]);setChecklist(data.checklist||[]);setProductStats(data.products||null);}
    catch(e:any){setMessage({type:"error",text:e.message||"Erro"});}finally{setLoading(false);}
  }
  useEffect(()=>{void testHealth();},[]);

  async function save(){
    setLoading(true);setMessage(null);
    try{const res=await fetch("/api/fiscal/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao salvar");setSettings(data.settings?{
      ...settings,
      id:data.settings.id||settings.id,
    }:settings);setMessage({type:"success",text:demoMode?"Configuração validada no modo demonstração. Em produção ela será persistida no Supabase.":"Configurações fiscais salvas."});await testHealth();}
    catch(e:any){setMessage({type:"error",text:e.message||"Erro"});}finally{setLoading(false);}
  }

  async function sync(){
    setLoading(true);setMessage(null);
    try{const res=await fetch("/api/orders/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha na sincronização");setMessage({type:"success",text:data.demo?"Sincronização real está bloqueada no modo demonstração.":`${data.synced} pedido(s) e ${data.products} produto(s) sincronizados.`});await testHealth();}
    catch(e:any){setMessage({type:"error",text:e.message||"Erro"});}finally{setLoading(false);}
  }

  const done=checklist.filter(c=>c.ok).length;
  return <>
    {message&&<div className={`notice ${message.type==="error"?"red":message.type==="success"?"green":""}`} style={{marginBottom:16}}>{message.text}</div>}
    <div className="grid grid-2 settings-layout">
      <div className="card card-pad">
        <div className="section-head"><div><div className="section-kicker">Empresa</div><h2>Dados fiscais da Basso</h2></div><span className="badge gray">NFC-e</span></div>
        <div className="grid grid-2 form-grid">
          <div className="field span-2"><label>Razão / nome empresarial</label><input className="input" value={settings.companyName} onChange={e=>setSettings({...settings,companyName:e.target.value})}/></div>
          <div className="field"><label>CNPJ</label><input className="input" placeholder="00.000.000/0000-00" value={settings.companyDocument||""} onChange={e=>setSettings({...settings,companyDocument:e.target.value})}/></div>
          <div className="field"><label>Inscrição Estadual</label><input className="input" value={settings.companyIe||""} onChange={e=>setSettings({...settings,companyIe:e.target.value})}/></div>
          <div className="field"><label>CRT / regime</label><input className="input" placeholder="Ex.: 1" value={settings.companyCrt||""} onChange={e=>setSettings({...settings,companyCrt:e.target.value})}/></div>
          <div className="field"><label>UF</label><select className="select" value={settings.companyUf||"SP"} onChange={e=>setSettings({...settings,companyUf:e.target.value})}><option value="SP">SP</option></select></div>
          <div className="field"><label>Ambiente fiscal</label><select className="select" value={settings.environment} onChange={e=>{const value=e.target.value as "homologacao"|"producao";if(value==="producao"&&settings.environment!=="producao")setProductionConfirm(true);else setSettings({...settings,environment:value})}}><option value="homologacao">Homologação</option><option value="producao">Produção</option></select><small className="field-hint">Deploy Focus: {focusDeployEnv}. Produção real exige os dois em produção.</small></div>
          <div className="field"><label>Série NFC-e</label><input className="input" value={settings.series||""} onChange={e=>setSettings({...settings,series:e.target.value})}/></div><div className="field"><label>Status do módulo</label><label className="toggle-line"><input type="checkbox" checked={settings.active} onChange={e=>setSettings({...settings,active:e.target.checked})}/><span>{settings.active?"Ativo":"Pausado"}</span></label></div>
        </div>
        <div className="divider"/>
        <h3 className="form-subtitle">Endereço fiscal</h3>
        <div className="grid grid-3 form-grid">
          <div className="field span-2"><label>Logradouro</label><input className="input" value={settings.addressStreet||""} onChange={e=>setSettings({...settings,addressStreet:e.target.value})}/></div>
          <div className="field"><label>Número</label><input className="input" value={settings.addressNumber||""} onChange={e=>setSettings({...settings,addressNumber:e.target.value})}/></div>
          <div className="field"><label>Bairro</label><input className="input" value={settings.addressDistrict||""} onChange={e=>setSettings({...settings,addressDistrict:e.target.value})}/></div>
          <div className="field"><label>Cidade</label><input className="input" value={settings.addressCity||""} onChange={e=>setSettings({...settings,addressCity:e.target.value})}/></div>
          <div className="field"><label>Código IBGE</label><input className="input" value={settings.addressCityCode||""} onChange={e=>setSettings({...settings,addressCityCode:e.target.value})}/></div>
          <div className="field"><label>CEP</label><input className="input" value={settings.addressZip||""} onChange={e=>setSettings({...settings,addressZip:e.target.value})}/></div>
          <div className="field span-2"><label>Complemento</label><input className="input" value={settings.addressComplement||""} onChange={e=>setSettings({...settings,addressComplement:e.target.value})}/></div>
        </div>
        <div className="form-actions"><button className="btn btn-primary" onClick={save} disabled={loading}><Icon name="check" size={16}/>{loading?"Salvando…":"Salvar configurações"}</button></div>
      </div>

      <div className="grid settings-side">
        <div className="card card-pad">
          <div className="section-head"><div><div className="section-kicker">Diagnóstico</div><h2>Integrações</h2></div><button className="icon-btn" title="Atualizar diagnóstico" onClick={testHealth} disabled={loading}><Icon name="refresh" size={17}/></button></div>
          <div className="health-list">{health.map(item=><div className="health-row" key={item.key}><div><strong>{item.label}</strong><span>{item.detail}</span></div><HealthBadge status={item.status}/></div>)}{!health.length&&<div className="skeleton-lines"><i/><i/><i/><i/></div>}</div>
          <button className="btn" style={{marginTop:16,width:"100%"}} onClick={sync} disabled={loading}><Icon name="refresh" size={16}/>Sincronizar pedidos e produtos</button>
        </div>
        <div className="card card-pad">
          <div className="section-head"><div><div className="section-kicker">Prontidão</div><h2>Checklist de produção</h2></div>{checklist.length>0&&<strong className="readiness-number">{done}/{checklist.length}</strong>}</div>
          {checklist.length>0&&<><div className="progress"><span style={{width:`${Math.round((done/checklist.length)*100)}%`}}/></div><div className="checklist">{checklist.map(item=><div key={item.key}><span className={`check-circle ${item.ok?"ok":""}`}>{item.ok?"✓":"!"}</span><span>{item.label}</span></div>)}</div></>}
          {productStats&&<div className="soft-card compact"><div className="kpi-line"><span>Produtos fiscais</span><strong>{productStats.complete}/{productStats.total}</strong></div><div className="kpi-line"><span>Incompletos</span><strong>{productStats.incomplete}</strong></div></div>}
          {demoMode&&<div className="notice" style={{marginTop:14}}>Para emissão real ainda será necessário definir <code>DEMO_MODE=false</code> no Vercel. A interface não altera variável de ambiente por segurança.</div>}
        </div>
      </div>
    </div>
    {productionConfirm&&<div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={()=>setProductionConfirm(false)}><Icon name="close"/></button><div className="modal-kicker">Ação crítica</div><h2>Marcar empresa como produção?</h2><p className="modal-copy">Isso altera a configuração interna da empresa. A transmissão real ainda só ocorrerá se <code>FOCUS_NFE_ENV=producao</code> também estiver definido no Vercel e o modo demonstração estiver desligado.</p><div className="notice">Antes de confirmar, finalize homologação, produtos fiscais, CNPJ, IE e CRT com o contador.</div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setProductionConfirm(false)}>Manter homologação</button><button className="btn btn-danger" onClick={()=>{setSettings({...settings,environment:"producao"});setProductionConfirm(false)}}>Confirmar produção</button></div></div></div>}
  </>;
}
