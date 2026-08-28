-- EXEMPLOS APENAS PARA ESTRUTURA.
-- NÃO USE EM PRODUÇÃO sem validação da contabilidade da Basso.
-- NCM/CFOP/CST/CSOSN podem variar de acordo com produto, regime e operação.

-- Exemplo de como cadastrar um perfil depois que o contador enviar os valores corretos:
-- insert into public.fiscal_product_profiles
-- (name, ncm, cest, cfop, cst_csosn, origin, unit, pis_code, cofins_code)
-- values ('PIZZAS', '<NCM_VALIDADO>', null, '<CFOP_VALIDADO>', '<CSOSN_VALIDADO>', '0', 'UN', '<PIS>', '<COFINS>');

-- Exemplo de produto:
-- insert into public.fiscal_products (external_product_id, sku, product_name, profile_id)
-- select 'id-produto-basso', 'PIZ-MARG-G', 'Pizza Margherita Grande', id
-- from public.fiscal_product_profiles where name = 'PIZZAS';
