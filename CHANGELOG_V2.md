# Basso Fiscal V2 — Mega Update

## Interface e UX
- redesign dark premium alinhado à Basso;
- sidebar com ícones e navegação mobile;
- dashboard com dados reais, pendências e cobertura fiscal;
- tabelas, drawers, modais, empty states, loading e feedback operacional;
- filtros rápidos e seleção em massa segura.

## Emissão
- filtros por período, pagamento, origem, status, pedido/cliente e valor;
- presets Hoje/Ontem/7 dias/Este mês;
- pré-validação com erros e avisos;
- resumo antes da emissão;
- seleção apenas de pedidos elegíveis;
- lotes persistentes e processamento manual compatível com Vercel Hobby;
- idempotência, prevenção de duplicidade e retry seguro consultando a Focus pela ref.

## Produtos fiscais
- cadastro e edição;
- perfis fiscais reutilizáveis;
- aplicação de perfil em massa;
- filtros por completude;
- indicador de cobertura fiscal.

## Documentos e lotes
- paginação e filtros;
- drawer de documento com eventos;
- XML/DANFC-e;
- cancelamento por modal com justificativa;
- página detalhada do lote e retomada de pendências.

## Contabilidade
- prévia do período;
- ZIP organizado com XML, PDF, CSV, XLSX, resumo PDF e LEIA-ME;
- histórico de exportações.

## Configuração e segurança
- checklist de produção;
- health check das integrações;
- dados da empresa editáveis;
- rate-limit no login;
- sessão HTTP-only assinada;
- proteção de origem em operações críticas;
- headers de segurança;
- auditoria;
- sem defaults inseguros;
- sem Vercel Cron.

## Banco
Para uma instalação V1 já existente, rode apenas:

`sql/003_v2_update.sql`

Para instalação nova, rode 001, 002 e 003 nessa ordem.
