# Basso Fiscal V2 — PedidoPro Fiscal

Aplicação **independente** do sistema principal da La Forneria Basso para seleção de pedidos, emissão de NFC-e em lote via Focus NFe, acompanhamento de lotes/documentos e fechamento para contabilidade.

> O projeto principal da Basso continua separado. O Fiscal recebe pedidos por uma API read-only e mantém banco, storage, credenciais e deploy próprios.

## O que mudou na V2

### Operação fiscal
- filtros por data, pagamento, origem, status, pedido/cliente e faixa de valor;
- atalhos de período: Hoje, Ontem, 7 dias e Este mês;
- seleção em massa somente de pedidos elegíveis;
- resumo por pagamento/origem antes da emissão;
- pré-validação com **erros bloqueantes** e **avisos** separados;
- erros agrupados por produto;
- emissão em lotes persistentes;
- processamento em chamadas curtas compatíveis com **Vercel Hobby**, sem Cron;
- retomada manual de lote interrompido;
- consulta da Focus pela mesma `ref` antes de reenviar uma retentativa técnica;
- proteção de duplicidade no backend e índice parcial no banco;
- histórico de eventos por documento;
- cancelamento por modal, com justificativa e auditoria;
- XML/DANFC-e em storage privado.

### Produtos fiscais
- listagem paginada;
- busca e filtros por completude/perfil;
- edição fiscal por produto;
- perfis fiscais reutilizáveis;
- aplicação de perfil em massa;
- sincronização automática dos SKUs encontrados nos pedidos;
- indicador de completude do cadastro.

### Contabilidade
- prévia do período;
- ZIP com:
  - `XML/`;
  - `PDF/`;
  - `Relatorios/fiscal.csv`;
  - `Relatorios/fiscal.xlsx`;
  - `Relatorios/resumo.pdf`;
  - `LEIA-ME.txt`;
- histórico de exportações.

### Segurança e produção
- defaults inseguros de login removidos;
- rate limit de login (Supabase quando disponível + fallback em memória);
- sessão HTTP-only assinada;
- proteção de origem para ações críticas;
- headers de segurança;
- tokens/Service Role exclusivamente server-side;
- auditoria de login, lotes, cancelamentos, configurações, produtos e exportações;
- checklist de prontidão;
- diagnóstico de Supabase, Storage e API de pedidos;
- **dupla confirmação para Focus em produção**: `FOCUS_NFE_ENV=producao` no deploy + empresa em Produção no painel.

### UI/UX
- novo design system dark premium alinhado à identidade Basso;
- sidebar com ícones;
- navegação mobile inferior;
- dashboard sem gráfico fictício: barras usam dados reais;
- tabelas com cabeçalho sticky, seleção destacada e paginação;
- drawers, modais, empty states, skeletons, indicadores e feedbacks operacionais;
- layout responsivo.

---

## Stack

- Next.js 15 / App Router
- React 19
- TypeScript
- Supabase/PostgreSQL
- Supabase Storage privado
- Focus NFe
- Vercel Hobby compatível

## Arquitetura

```text
Sistema Basso (projeto separado)
        |
        | API read-only
        v
Basso Fiscal V2
        |
        | backend server-only
        +------> Supabase Fiscal / Storage
        |
        +------> Focus NFe
                    |
                    v
                  SEFAZ
```

Nenhuma credencial da Focus ou Service Role é enviada ao navegador.

---

## Banco — instalação nova

No **Supabase exclusivo do Basso Fiscal**, rode nesta ordem:

```text
sql/001_schema.sql
sql/002_example_profiles.sql
sql/003_v2_update.sql
```

Não execute esses arquivos no banco principal da Basso.

## Banco — atualização de uma instalação V1

Se você **já executou `001_schema.sql` e `002_example_profiles.sql`**, rode somente:

```text
sql/003_v2_update.sql
```

A migration V2 adiciona:
- dados fiscais/endereço da empresa;
- rate limit persistente;
- índices de consulta;
- view de produtos com completude e perfil;
- campos necessários às telas V2.

---

## Vercel Hobby

Este projeto **não usa Vercel Cron**.

`vercel.json`:

```json
{
  "framework": "nextjs"
}
```

A fila é processada pela interface autenticada em blocos de até 10 itens por chamada:

```text
POST /api/fiscal/process-queue
```

Se a aba fechar, o lote permanece no Supabase. Em **Lotes**, use **Processar pendentes**.

---

## Variáveis de ambiente

Use `.env.example` como referência. Valores reais devem ficar em:

**Vercel → Project → Settings → Environment Variables**

Nunca envie `.env` / `.env.local` ao GitHub.

Para o primeiro deploy seguro:

```env
DEMO_MODE=true
FOCUS_NFE_ENV=homologacao
```

No demo nenhuma emissão real é enviada à Focus/SEFAZ.

---

## Integração com pedidos da Basso

O contrato está em:

`docs/ORDER_SOURCE_CONTRACT.md`

Configure:

```env
BASSO_ORDERS_API_URL=https://SEU-SISTEMA/api/fiscal/orders
BASSO_ORDERS_API_KEY=CHAVE-FORTE-READ-ONLY
```

O Fiscal não precisa acessar diretamente o Supabase operacional da pizzaria.

---

## Focus NFe

Configuração mínima:

```env
FOCUS_NFE_ENV=homologacao
FOCUS_NFE_TOKEN=SEU_TOKEN
```

O adapter está isolado em:

`lib/focus/provider.ts`

A homologação final deve validar o payload contra a documentação vigente da Focus e os dados tributários definidos pela contabilidade.

### Retentativa segura

Quando uma tentativa anterior terminou em falha técnica, antes de reenviar o sistema consulta a mesma referência fiscal. Isso cobre o cenário:

```text
PedidoPro enviou
→ Focus recebeu
→ SEFAZ autorizou
→ resposta de volta caiu
```

Se a consulta encontrar a autorização, o lote é concluído sem nova emissão.

---

## Fluxo principal

```text
Emitir NFC-e
→ escolher período
→ filtrar PIX/cartão/dinheiro/origem
→ selecionar pedidos elegíveis
→ pré-validar
→ revisar resumo
→ criar lote
→ processar
→ acompanhar autorizações/rejeições
```

A data do filtro é a data original do pedido. O sistema não retroage a data de autorização fiscal.

---

## Antes de produção

1. Rode `sql/003_v2_update.sql`.
2. Configure a API read-only da Basso.
3. Sincronize pedidos/produtos.
4. Faça o cadastro tributário com a contabilidade.
5. Configure CNPJ, IE, CRT e endereço no painel.
6. Configure o token da Focus.
7. Teste em homologação.
8. Valide XML e DANFC-e.
9. Valide cancelamento.
10. Confira o pacote da contabilidade.
11. Somente então defina:

```env
DEMO_MODE=false
FOCUS_NFE_ENV=producao
```

12. Na tela **Configurações**, marque o ambiente da empresa como **Produção**.

As duas condições são necessárias para o adapter apontar para a API de produção.

---

## Validação do código

Scripts:

```bash
npm run typecheck
npm run build
```

Faça ambos antes de cada deploy de produção.
