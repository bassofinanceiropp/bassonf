-- Basso Fiscal / PedidoPro Fiscal
-- Banco PRÓPRIO do módulo fiscal. Não execute no banco principal da Basso.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.fiscal_settings (
  id uuid primary key default gen_random_uuid(),
  company_slug text not null unique,
  company_name text not null,
  provider text not null default 'focus_nfe',
  environment text not null default 'homologacao' check (environment in ('homologacao','producao')),
  document_type text not null default 'nfce',
  series text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_product_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ncm text,
  cest text,
  cfop text,
  cst_csosn text,
  origin text default '0',
  unit text not null default 'UN',
  pis_code text,
  cofins_code text,
  icms_rate numeric(8,4),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_products (
  id uuid primary key default gen_random_uuid(),
  external_product_id text,
  sku text not null unique,
  product_name text not null,
  profile_id uuid references public.fiscal_product_profiles(id) on delete set null,
  overrides jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_orders (
  id uuid primary key default gen_random_uuid(),
  external_order_id text not null unique,
  order_number text not null,
  ordered_at timestamptz not null,
  customer_name text,
  customer_tax_id text,
  payment_method text not null,
  source text not null,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  delivery_fee numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  order_status text not null,
  snapshot jsonb not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued' check (status in ('queued','processing','completed','cancelled')),
  orders_count integer not null default 0,
  authorized_count integer not null default 0,
  rejected_count integer not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.fiscal_batches(id) on delete cascade,
  external_order_id text not null,
  status text not null default 'queued' check (status in ('queued','processing','authorized','rejected','technical_failure','cancelled')),
  attempts integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique(batch_id, external_order_id)
);

create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  external_order_id text not null,
  batch_id uuid references public.fiscal_batches(id) on delete set null,
  provider text not null default 'focus_nfe',
  provider_reference text not null,
  document_type text not null default 'nfce',
  status text not null check (status in ('not_issued','queued','processing','authorized','rejected','technical_failure','cancelled')),
  number text,
  series text,
  access_key text,
  protocol text,
  total_amount numeric(14,2) not null,
  order_date timestamptz not null,
  issued_at timestamptz,
  cancelled_at timestamptz,
  xml_path text,
  pdf_path text,
  qr_code text,
  error_code text,
  error_message text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Impede duas emissões simultâneas/ativas para o mesmo pedido.
create unique index if not exists fiscal_documents_one_active_per_order
on public.fiscal_documents(external_order_id)
where status in ('queued','processing','authorized');

create index if not exists fiscal_documents_status_idx on public.fiscal_documents(status);
create index if not exists fiscal_documents_order_date_idx on public.fiscal_documents(order_date);
create index if not exists fiscal_documents_issued_at_idx on public.fiscal_documents(issued_at);
create index if not exists fiscal_documents_access_key_idx on public.fiscal_documents(access_key);
create index if not exists fiscal_batch_items_queue_idx on public.fiscal_batch_items(status, created_at);

create table if not exists public.fiscal_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.fiscal_documents(id) on delete cascade,
  event_type text not null,
  status text,
  message text,
  provider_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fiscal_exports (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  documents_count integer not null default 0,
  file_path text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.fiscal_products_view as
select
  p.sku,
  p.product_name,
  p.active,
  coalesce(p.overrides->>'ncm', pr.ncm) as ncm,
  coalesce(p.overrides->>'cest', pr.cest) as cest,
  coalesce(p.overrides->>'cfop', pr.cfop) as cfop,
  coalesce(p.overrides->>'cstCsosn', pr.cst_csosn) as cst_csosn,
  coalesce(p.overrides->>'origin', pr.origin) as origin,
  coalesce(p.overrides->>'unit', pr.unit, 'UN') as unit,
  coalesce(p.overrides->>'pisCode', pr.pis_code) as pis_code,
  coalesce(p.overrides->>'cofinsCode', pr.cofins_code) as cofins_code,
  coalesce(nullif(p.overrides->>'icmsRate','')::numeric, pr.icms_rate) as icms_rate
from public.fiscal_products p
left join public.fiscal_product_profiles pr on pr.id = p.profile_id;

create or replace view public.fiscal_documents_view as
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

-- Updated_at
drop trigger if exists fiscal_settings_updated_at on public.fiscal_settings;
create trigger fiscal_settings_updated_at before update on public.fiscal_settings for each row execute function public.set_updated_at();
drop trigger if exists fiscal_product_profiles_updated_at on public.fiscal_product_profiles;
create trigger fiscal_product_profiles_updated_at before update on public.fiscal_product_profiles for each row execute function public.set_updated_at();
drop trigger if exists fiscal_products_updated_at on public.fiscal_products;
create trigger fiscal_products_updated_at before update on public.fiscal_products for each row execute function public.set_updated_at();
drop trigger if exists fiscal_orders_updated_at on public.fiscal_orders;
create trigger fiscal_orders_updated_at before update on public.fiscal_orders for each row execute function public.set_updated_at();
drop trigger if exists fiscal_batches_updated_at on public.fiscal_batches;
create trigger fiscal_batches_updated_at before update on public.fiscal_batches for each row execute function public.set_updated_at();
drop trigger if exists fiscal_documents_updated_at on public.fiscal_documents;
create trigger fiscal_documents_updated_at before update on public.fiscal_documents for each row execute function public.set_updated_at();

-- RLS: o frontend NÃO acessa estas tabelas diretamente.
alter table public.fiscal_settings enable row level security;
alter table public.fiscal_product_profiles enable row level security;
alter table public.fiscal_products enable row level security;
alter table public.fiscal_orders enable row level security;
alter table public.fiscal_batches enable row level security;
alter table public.fiscal_batch_items enable row level security;
alter table public.fiscal_documents enable row level security;
alter table public.fiscal_events enable row level security;
alter table public.fiscal_exports enable row level security;
alter table public.audit_logs enable row level security;

-- Nenhuma policy pública é criada. O backend utiliza SERVICE_ROLE.

-- Bucket privado para XML/PDF. Execute no Supabase do módulo Fiscal.
insert into storage.buckets (id, name, public)
values ('fiscal-documents', 'fiscal-documents', false)
on conflict (id) do update set public = false;

-- Criação transacional de lote + itens + documentos em estado queued.
-- Se qualquer pedido já possuir documento ativo/autorizado, o índice parcial aborta
-- a transação inteira; não fica lote pela metade.
create or replace function public.create_fiscal_batch(p_created_by text, p_orders jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_order jsonb;
begin
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' or jsonb_array_length(p_orders) = 0 then
    raise exception 'Nenhum pedido informado';
  end if;
  if jsonb_array_length(p_orders) > 500 then
    raise exception 'Limite de 500 pedidos por lote';
  end if;

  insert into public.fiscal_batches(status, orders_count, created_by)
  values ('queued', jsonb_array_length(p_orders), p_created_by)
  returning id into v_batch_id;

  for v_order in select * from jsonb_array_elements(p_orders)
  loop
    insert into public.fiscal_batch_items(batch_id, external_order_id, status)
    values (v_batch_id, v_order->>'external_order_id', 'queued');

    insert into public.fiscal_documents(
      external_order_id, batch_id, provider, provider_reference, document_type,
      status, total_amount, order_date
    ) values (
      v_order->>'external_order_id', v_batch_id, 'focus_nfe',
      v_order->>'provider_reference', 'nfce', 'queued',
      (v_order->>'total_amount')::numeric,
      (v_order->>'order_date')::timestamptz
    );
  end loop;

  return v_batch_id;
end;
$$;
revoke all on function public.create_fiscal_batch(text, jsonb) from public, anon, authenticated;
