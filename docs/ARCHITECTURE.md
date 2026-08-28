# Arquitetura

## Princípios

1. Projeto fiscal independente do sistema Basso.
2. Sem acesso irrestrito ao banco operacional.
3. Provider fiscal isolado.
4. Emissão idempotente.
5. Fila persistente.
6. Snapshot do pedido antes da emissão.
7. Artefatos fiscais em storage privado.
8. Nenhuma emissão real em `DEMO_MODE=true`.

## Componentes

### Fonte de pedidos

`lib/orders/source.ts`

Pode usar fixture em demo ou uma API read-only do sistema Basso.

### Repositório fiscal

`lib/repo/fiscal.ts`

Concentra banco, lotes, snapshots e documentos.

### Focus NFe

`lib/focus/provider.ts`

Concentra autenticação, payload, emissão, cancelamento e download de artefatos.

### Worker

`app/api/internal/fiscal-worker/route.ts`

Consome itens `queued`, faz claim atômico, emite, arquiva arquivos e atualiza o lote.

### Storage

`lib/storage.ts`

Copia XML/PDF para bucket privado.
