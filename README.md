# Basso Fiscal — PedidoPro Fiscal

Projeto independente para emissão e gestão de NFC-e da La Forneria Basso usando Focus NFe.

**Este projeto não altera, não depende do deploy e não compartilha segredos com o projeto principal da Basso.** A integração operacional ocorre por uma API de pedidos somente leitura.

## O que está pronto

- login administrativo por sessão HTTP-only;
- dashboard fiscal;
- filtros por data do pedido, pagamento, origem, status fiscal e número do pedido;
- seleção individual e em lote;
- pré-validação de produtos/totais;
- proteção contra emissão duplicada;
- criação de lotes persistentes;
- processador de emissão em pequenos grupos;
- adapter isolado para Focus NFe;
- homologação/produção por variáveis de ambiente;
- tratamento separado de rejeição fiscal e falha técnica;
- até 3 tentativas para falhas técnicas;
- histórico de lotes;
- histórico de documentos;
- cancelamento via backend;
- arquivamento privado de XML/PDF quando disponibilizados pelo provedor;
- exportação ZIP para contabilidade;
- cadastro/visualização de perfis fiscais;
- SQL completo para Supabase exclusivo;
- modo demonstração sem emissão real.

## Arquitetura

```text
Sistema Basso (separado)
        |
        | API read-only de pedidos
        v
Basso Fiscal (este projeto)
        |
        | backend server-only
        v
Focus NFe
        |
        v
SEFAZ
```

O banco do módulo Fiscal também é separado:

```text
Supabase Basso            Supabase Basso Fiscal
(pedidos/PDV/mesas)       (documentos/lotes/XML/logs)
       |                          ^
       +--- API read-only -------+
```

## Requisitos

- Node.js 22+
- npm
- Supabase exclusivo para este projeto em produção
- conta/credencial Focus NFe
- endpoint de pedidos read-only no sistema Basso

## Rodar em demonstração

1. Copie `.env.example` para `.env.local`.
2. Mantenha `DEMO_MODE=true`.
3. Troque ao menos:
   - `APP_SESSION_SECRET`
   - `APP_ADMIN_EMAIL`
   - `APP_ADMIN_PASSWORD`
4. Instale e rode:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

No modo demonstração, a interface usa pedidos fictícios e **não envia nada à Focus/SEFAZ**.

## Banco fiscal

Crie um Supabase novo e execute:

```text
sql/001_schema.sql
```

Não execute esse SQL no banco principal da Basso.

Depois configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=fiscal-documents
```

A Service Role nunca vai para o browser.

## Integração com os pedidos da Basso

Implemente no projeto principal da Basso um endpoint somente leitura conforme:

`docs/ORDER_SOURCE_CONTRACT.md`

Depois configure:

```env
BASSO_ORDERS_API_URL=https://basso.exemplo.com/api/fiscal/orders
BASSO_ORDERS_API_KEY=chave-read-only-forte
```

O Basso Fiscal não precisa receber acesso ao banco principal.

## Focus NFe

Variáveis:

```env
FOCUS_NFE_ENV=homologacao
FOCUS_NFE_TOKEN=...
FOCUS_NFE_BASE_URL=
FOCUS_NFE_EMIT_PATH=/v2/nfce
FOCUS_NFE_CANCEL_PATH_TEMPLATE=/v2/nfce/{ref}
```

O adapter fica em:

`lib/focus/provider.ts`

### Observação importante

O projeto está preparado para a Focus, mas os **dados tributários e o payload final devem ser validados em homologação com a documentação vigente da Focus e com a contabilidade da Basso** antes da primeira emissão real. Não trate os perfis de demonstração como orientação fiscal.

Veja `docs/FOCUS_INTEGRATION.md`.

## Fluxo de emissão

1. Acesse **Emitir NFC-e**.
2. Escolha a data original do pedido.
3. Filtre por PIX/dinheiro/débito/crédito e origem.
4. Marque pedidos.
5. Clique **Pré-validar e emitir**.
6. O sistema verifica:
   - itens;
   - total;
   - perfil fiscal;
   - NCM/CFOP/CST/CSOSN;
   - emissão ativa/duplicada.
7. O lote é criado.
8. Em produção, o processador executa os itens.
9. Autorizadas, rejeitadas e falhas ficam registradas individualmente.

A data usada no filtro é a **data do pedido**. O sistema não falsifica data anterior de autorização fiscal.

## Processamento da fila no Vercel Hobby

Este projeto não usa agendamento automático da Vercel. O processamento é iniciado somente pela interface autenticada.

Quando um lote é criado pela tela **Emitir NFC-e**, o navegador autenticado chama:

```text
POST /api/fiscal/process-queue
```

A rota exige a sessão administrativa e processa até 10 itens por chamada. A interface repete chamadas curtas até esvaziar o lote, evitando uma única função longa.

Se a aba for fechada durante o processamento, o lote permanece salvo. Acesse **Lotes de emissão** e use **Processar pendentes** para continuar.

Isso mantém o módulo compatível com o Vercel Hobby sem tarefas agendadas.

## Falhas e retentativas

- HTTP 5xx/rede: `technical_failure`, com até 3 tentativas automáticas.
- erro de validação/rejeição: `rejected`, sem loop automático.
- cada documento usa uma referência determinística por pedido.
- índice parcial no banco impede duas emissões ativas/autorizadas para o mesmo pedido.

## XML e PDF

Quando a Focus retorna caminhos para XML/DANFC-e, o processador tenta copiar os arquivos para o bucket privado `fiscal-documents`.

Estrutura:

```text
la-forneria-basso/
  2026/
    08/
      xml/
      pdf/
```

O download passa por uma API autenticada. O bucket não é público.

## Contabilidade

Em **Contabilidade**, escolha o período e clique em **Gerar ZIP**.

O pacote contém:

```text
Basso-Fiscal-AAAA-MM-DD-a-AAAA-MM-DD.zip
  XML/
  PDF/
  Relatorios/fiscal.csv
  LEIA-ME.txt
```

A exportação considera documentos autorizados no período informado.

## Produção

Antes de produção, conclua `docs/PRODUCTION_CHECKLIST.md`.

Só então:

```env
DEMO_MODE=false
FOCUS_NFE_ENV=producao
```

## Segurança

- sem token Focus no frontend;
- sem Service Role no frontend;
- cookie de sessão HTTP-only;
- segredo de sessão mantido somente no backend;
- bucket fiscal privado;
- RLS habilitado sem policies públicas;
- API da Basso deve ser read-only;
- sem acesso direto do Fiscal ao banco operacional da pizzaria;
- limite de 500 pedidos por lote;
- proteção de duplicidade no backend e no banco.

## Estrutura resumida

```text
app/
  dashboard/
  emissao/
  lotes/
  documentos/
  contabilidade/
  produtos-fiscais/
  configuracoes/
  api/
components/
lib/
  focus/
  orders/
  repo/
sql/
docs/
```

## O que ainda depende de dados reais da Basso

O código não inventa credenciais nem dados fiscais. Para entrar em produção ainda serão necessários:

- CNPJ/IE/CRT e configurações NFC-e;
- credencial Focus;
- dados fiscais aprovados pelo contador para os produtos;
- URL/chave do endpoint de pedidos da Basso;
- Supabase novo do módulo Fiscal.

Isso é intencional para que o ZIP seja seguro e não altere nenhum sistema atual sozinho.
