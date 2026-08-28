# Validação executada antes do ZIP

- 39 arquivos `.ts/.tsx` parseados/transpilados com TypeScript 5.8.3: OK.
- Checagem estrita com stubs para dependências externas: sem erros locais relevantes após correções.
- Revisão manual das rotas de autenticação, emissão, worker, cancelamento, exportação e storage.
- Concorrência revisada: lote é criado transacionalmente e índice parcial impede documento ativo duplicado por pedido.
- Recuperação de item `processing` travado adicionada.
- Status fiscal é sobreposto a partir do banco Fiscal; o sistema Basso não precisa conhecer o estado fiscal.
- Modo demonstração impede chamada real à Focus.
- Nenhuma credencial real incluída.
- Nenhum repositório, Vercel, Supabase ou serviço externo foi alterado por esta entrega.

## Limitação do ambiente desta entrega

O ambiente de execução não possui acesso aos pacotes npm necessários, então não foi possível executar `npm install` + `npm run build` neste container. O projeto inclui `package.json`, TypeScript e instruções para essa validação assim que as dependências forem instaladas em uma máquina com acesso ao registry npm.

## Antes de produção

A emissão real depende de credenciais Focus, dados fiscais validados pela contabilidade, Supabase exclusivo e endpoint read-only de pedidos. O payload Focus fica isolado para homologação antes de `FOCUS_NFE_ENV=producao`.
