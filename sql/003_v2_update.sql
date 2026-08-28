-- Basso Fiscal V2
-- Rode APÓS 001_schema.sql e 002_example_profiles.sql no Supabase do módulo fiscal.

alter table public.fiscal_settings add column if not exists company_document text;
alter table public.fiscal_settings add column if not exists company_ie text;
alter table public.fiscal_settings add column if not exists company_crt text;
alter table public.fiscal_settings add column if not exists company_uf text default 'SP';
alter table public.fiscal_settings add column if not exists address_street text;
alter table public.fiscal_settings add column if not exists address_number text;
alter table public.fiscal_settings add column if not exists address_complement text;
alter table public.fiscal_settings add column if not exists address_district text;
alter table public.fiscal_settings add column if not exists address_city text;
alter table public.fiscal_settings add column if not exists address_city_code text;
alter table public.fiscal_settings add column if not exists address_zip text;

create table if not exists public.auth_rate_limits (
  key_hash text primary key,
  attempts integer not null default 0,
  window_started timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.auth_rate_limits enable row level security;

create index if not exists fiscal_orders_number_idx on public.fiscal_orders(order_number);
create index if not exists fiscal_orders_payment_idx on public.fiscal_orders(payment_method);
create index if not exists fiscal_orders_source_idx on public.fiscal_orders(source);
create index if not exists fiscal_orders_ordered_at_idx on public.fiscal_orders(ordered_at);
create index if not exists fiscal_batch_items_batch_status_idx on public.fiscal_batch_items(batch_id,status);
create index if not exists fiscal_documents_provider_ref_idx on public.fiscal_documents(provider_reference);
create index if not exists fiscal_events_document_created_idx on public.fiscal_events(document_id,created_at);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

drop view if exists public.fiscal_products_view;
create view public.fiscal_products_view as
select
  p.id,
  p.external_product_id,
  p.sku,
  p.product_name,
  p.profile_id,
  pr.name as profile_name,
  p.active,
  coalesce(nullif(p.overrides->>'ncm',''), pr.ncm) as ncm,
  coalesce(nullif(p.overrides->>'cest',''), pr.cest) as cest,
  coalesce(nullif(p.overrides->>'cfop',''), pr.cfop) as cfop,
  coalesce(nullif(p.overrides->>'cstCsosn',''), pr.cst_csosn) as cst_csosn,
  coalesce(nullif(p.overrides->>'origin',''), pr.origin) as origin,
  coalesce(nullif(p.overrides->>'unit',''), pr.unit, 'UN') as unit,
  coalesce(nullif(p.overrides->>'pisCode',''), pr.pis_code) as pis_code,
  coalesce(nullif(p.overrides->>'cofinsCode',''), pr.cofins_code) as cofins_code,
  coalesce(nullif(p.overrides->>'icmsRate','')::numeric, pr.icms_rate) as icms_rate,
  (
    coalesce(nullif(p.overrides->>'ncm',''), pr.ncm, '') <> '' and
    coalesce(nullif(p.overrides->>'cfop',''), pr.cfop, '') <> '' and
    coalesce(nullif(p.overrides->>'cstCsosn',''), pr.cst_csosn, '') <> ''
  ) as is_complete
from public.fiscal_products p
left join public.fiscal_product_profiles pr on pr.id = p.profile_id;

drop view if exists public.fiscal_documents_view;
create view public.fiscal_documents_view as
select
  d.*,
  o.order_number,
  o.ordered_at,
  o.payment_method,
  o.source,
  o.customer_name,
  o.customer_tax_id
from public.fiscal_documents d
left join public.fiscal_orders o on o.external_order_id = d.external_order_id;

-- Garante que o rate-limit tenha updated_at consistente.
drop trigger if exists auth_rate_limits_updated_at on public.auth_rate_limits;
create trigger auth_rate_limits_updated_at
before update on public.auth_rate_limits
for each row execute function public.set_updated_at();

-- Mantém o bucket fiscal privado.
insert into storage.buckets (id, name, public)
values ('fiscal-documents', 'fiscal-documents', false)
on conflict (id) do update set public = false;
