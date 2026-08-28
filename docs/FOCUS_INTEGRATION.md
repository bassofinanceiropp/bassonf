# Focus NFe

A integração fica isolada em `lib/focus/provider.ts`.

## Estratégia

1. O frontend nunca conversa diretamente com a Focus.
2. `FOCUS_NFE_TOKEN` existe somente no ambiente do servidor.
3. Cada pedido usa referência determinística no formato `la-forneria-basso-order-<id>`.
4. O banco possui proteção contra documento ativo duplicado por pedido.
5. O worker processa no máximo 20 itens por execução e reenvia falhas técnicas até 3 tentativas.
6. Rejeição fiscal não entra em loop automático.
7. XML/PDF autorizados são copiados para storage privado quando o provedor disponibiliza artefatos.

## Homologação obrigatória

Antes de produção, valide com a documentação vigente da Focus e com a contabilidade:

- credencial/CNPJ cadastrado na Focus;
- ambiente de homologação;
- CSC/Token NFC-e quando aplicável;
- certificado e configurações exigidas pelo provedor;
- CRT/regime;
- NCM, CEST, CFOP, CST/CSOSN;
- PIS/COFINS/ICMS;
- regras para adicionais, descontos, entrega, meio a meio e pagamentos;
- payload atual do endpoint de NFC-e;
- cancelamento e prazos aplicáveis.

O adapter foi construído para que qualquer ajuste de payload fique concentrado em um único arquivo.
