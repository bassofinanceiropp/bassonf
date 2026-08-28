# Contrato da API de pedidos da Basso

O projeto Fiscal é separado do sistema Basso. Em produção, o recomendado é expor no sistema operacional da Basso um endpoint **somente leitura** para o Fiscal consultar pedidos.

## Request

`GET BASSO_ORDERS_API_URL?start=2026-08-01&end=2026-08-01&payment=pix&source=cardapio&q=1051`

Header:

`Authorization: Bearer <BASSO_ORDERS_API_KEY>`

## Response esperado

```json
{
  "orders": [
    {
      "id": "uuid-ou-id-local",
      "externalId": "1051",
      "number": "1051",
      "orderedAt": "2026-08-01T22:42:00.000Z",
      "customerName": "João",
      "customerTaxId": null,
      "paymentMethod": "pix",
      "source": "cardapio",
      "fulfillment": "delivery",
      "total": 107.90,
      "subtotal": 107.90,
      "discount": 0,
      "deliveryFee": 0,
      "status": "completed",
      "items": [
        {
          "id": "item-1",
          "sku": "PIZ-MARG-G",
          "name": "Pizza Margherita Grande",
          "quantity": 1,
          "unitPrice": 89.90,
          "total": 89.90
        }
      ]
    }
  ]
}
```

## Valores aceitos

- `paymentMethod`: `pix`, `cash`, `debit`, `credit`, `other`
- `source`: `cardapio`, `pdv`, `mesa`, `ifood`, `99food`, `other`
- `status`: `paid`, `completed`, `cancelled`
- `fulfillment` (opcional): `delivery`, `pickup`, `dine_in`

> O endpoint operacional **não precisa conhecer o status fiscal**. O Basso Fiscal sobrepõe `not_issued/queued/authorized/...` usando o banco fiscal separado. Se o campo `fiscalStatus` vier na resposta ele é aceito, mas é opcional.

## Segurança

A chave deve dar acesso apenas ao endpoint fiscal de leitura. Não forneça Service Role do banco principal da Basso ao projeto Fiscal.
