-- Schema base do projeto de dev (evvisoyaehtvgzvqapmv), criado antes pelo
-- dashboard. Esta migration só versiona o que já existe; correções vêm em
-- migrations seguintes (T04).

-- =========================================================================
-- Enums
-- =========================================================================

create type public.order_mode as enum ('ENTREGA', 'RETIRADA');

create type public.order_status as enum (
  'RECEBIDO', 'EM_PREPARO', 'PRONTO', 'A_CAMINHO', 'CONCLUIDO', 'REJEITADO', 'CANCELADO'
);

create type public.payment_method as enum ('DINHEIRO', 'CARTAO', 'PIX');

create type public.store_role as enum ('OWNER', 'STAFF');

-- =========================================================================
-- Tabelas
-- =========================================================================

create table public.stores (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name text not null,
  phone text,
  street text,
  number text,
  district text,
  city text,
  state text,
  is_open_override boolean,
  settings jsonb default '{}'::jsonb not null,
  plan text,
  active boolean default true not null,
  next_order_number integer default 1 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint stores_pkey primary key (id),
  constraint stores_slug_key unique (slug),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)
);

create table public.profiles (
  id uuid not null,
  name text,
  email text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table public.store_users (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  user_id uuid not null,
  role public.store_role default 'STAFF'::public.store_role not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint store_users_pkey primary key (id),
  constraint store_users_store_id_user_id_key unique (store_id, user_id),
  constraint store_users_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint store_users_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table public.store_hours (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  weekday smallint not null,
  opens_at time without time zone not null,
  closes_at time without time zone not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint store_hours_pkey primary key (id),
  constraint store_hours_weekday_check check ((weekday >= 0) and (weekday <= 6)),
  constraint store_hours_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade
);

create table public.categories (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  name text not null,
  is_available boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint categories_pkey primary key (id),
  constraint categories_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  category_id uuid not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  badges text[] default '{}'::text[] not null,
  is_available boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint products_pkey primary key (id),
  constraint products_price_check check (price >= (0)::numeric),
  constraint products_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete restrict
);

create table public.complement_groups (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  name text not null,
  min_select smallint default 0 not null,
  max_select smallint default 1 not null,
  allow_repeat boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint complement_groups_pkey primary key (id),
  constraint complement_groups_min_select_check check (min_select >= 0),
  constraint complement_groups_max_select_check check (max_select >= 1),
  constraint complement_groups_min_max check (max_select >= min_select),
  constraint complement_groups_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade
);

create table public.complements (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  complement_group_id uuid not null,
  name text not null,
  price numeric(10,2) default 0 not null,
  is_available boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint complements_pkey primary key (id),
  constraint complements_price_check check (price >= (0)::numeric),
  constraint complements_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint complements_complement_group_id_fkey foreign key (complement_group_id) references public.complement_groups(id) on delete cascade
);

create table public.product_complement_groups (
  store_id uuid not null,
  product_id uuid not null,
  complement_group_id uuid not null,
  sort_order integer default 0 not null,
  constraint product_complement_groups_pkey primary key (product_id, complement_group_id),
  constraint product_complement_groups_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint product_complement_groups_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade,
  constraint product_complement_groups_complement_group_id_fkey foreign key (complement_group_id) references public.complement_groups(id) on delete cascade
);

create table public.promotions (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  name text not null,
  kind text not null,
  rule jsonb default '{}'::jsonb not null,
  schedule jsonb default '{}'::jsonb not null,
  is_active boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint promotions_pkey primary key (id),
  constraint promotions_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade
);

create table public.customers (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  phone text not null,
  name text,
  last_address jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint customers_pkey primary key (id),
  constraint customers_store_id_phone_key unique (store_id, phone),
  constraint customers_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  customer_id uuid not null,
  number integer not null,
  public_token text default encode(extensions.gen_random_bytes(16), 'hex'::text) not null,
  status public.order_status default 'RECEBIDO'::public.order_status not null,
  mode public.order_mode not null,
  customer_name text not null,
  customer_phone text not null,
  address jsonb,
  payment_method public.payment_method not null,
  change_for numeric(10,2),
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) default 0 not null,
  discount numeric(10,2) default 0 not null,
  total numeric(10,2) not null,
  applied_promotions jsonb default '[]'::jsonb not null,
  notes text,
  is_paid boolean default false not null,
  rejection_reason text,
  read_at timestamp with time zone,
  accepted_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint orders_pkey primary key (id),
  constraint orders_public_token_key unique (public_token),
  constraint orders_store_id_number_key unique (store_id, number),
  constraint orders_address_required check ((mode <> 'ENTREGA'::public.order_mode) or (address is not null)),
  constraint orders_change_for_check check ((change_for is null) or (change_for >= (0)::numeric)),
  constraint orders_delivery_fee_check check (delivery_fee >= (0)::numeric),
  constraint orders_discount_check check (discount >= (0)::numeric),
  constraint orders_subtotal_check check (subtotal >= (0)::numeric),
  constraint orders_total_check check (total = ((subtotal + delivery_fee) - discount)),
  constraint orders_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint orders_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete restrict
);

create table public.order_items (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  order_id uuid not null,
  product_id uuid,
  name text not null,
  unit_price numeric(10,2) not null,
  quantity smallint not null,
  notes text,
  total numeric(10,2) not null,
  created_at timestamp with time zone default now() not null,
  constraint order_items_pkey primary key (id),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_items_product_id_fkey foreign key (product_id) references public.products(id) on delete set null
);

create table public.order_item_complements (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  order_item_id uuid not null,
  complement_id uuid,
  group_name text not null,
  name text not null,
  price numeric(10,2) not null,
  quantity smallint not null,
  created_at timestamp with time zone default now() not null,
  constraint order_item_complements_pkey primary key (id),
  constraint order_item_complements_quantity_check check (quantity > 0),
  constraint order_item_complements_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint order_item_complements_order_item_id_fkey foreign key (order_item_id) references public.order_items(id) on delete cascade,
  constraint order_item_complements_complement_id_fkey foreign key (complement_id) references public.complements(id) on delete set null
);

create table public.order_events (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  order_id uuid not null,
  user_id uuid,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  created_at timestamp with time zone default now() not null,
  constraint order_events_pkey primary key (id),
  constraint order_events_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint order_events_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_events_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null
);

create table public.push_subscriptions (
  id uuid default gen_random_uuid() not null,
  store_id uuid not null,
  user_id uuid not null,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  constraint push_subscriptions_pkey primary key (id),
  constraint push_subscriptions_endpoint_key unique (endpoint),
  constraint push_subscriptions_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade,
  constraint push_subscriptions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

-- =========================================================================
-- Índices
-- =========================================================================

create index categories_store_idx on public.categories using btree (store_id, sort_order);
create index complement_groups_store_idx on public.complement_groups using btree (store_id, sort_order);
create index complements_group_idx on public.complements using btree (complement_group_id, sort_order);
create index complements_store_idx on public.complements using btree (store_id);
create index order_events_order_idx on public.order_events using btree (order_id, created_at);
create index order_events_store_idx on public.order_events using btree (store_id, created_at desc);
create index order_item_complements_item_idx on public.order_item_complements using btree (order_item_id);
create index order_item_complements_store_idx on public.order_item_complements using btree (store_id);
create index order_items_order_idx on public.order_items using btree (order_id);
create index order_items_store_idx on public.order_items using btree (store_id);
create index orders_customer_idx on public.orders using btree (customer_id);
create index orders_store_status_idx on public.orders using btree (store_id, status, created_at desc);
create index product_complement_groups_store_idx on public.product_complement_groups using btree (store_id);
create index products_store_idx on public.products using btree (store_id, category_id, sort_order);
create index promotions_store_idx on public.promotions using btree (store_id, is_active);
create index push_subscriptions_store_idx on public.push_subscriptions using btree (store_id);
create index store_hours_store_idx on public.store_hours using btree (store_id, weekday);
create index store_users_user_idx on public.store_users using btree (user_id);

-- =========================================================================
-- Funções
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.auth_store_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select store_id
  from public.store_users
  where user_id = auth.uid()
    and deleted_at is null;
$function$;

CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.store_users
    where store_id = p_store_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$function$;

CREATE OR REPLACE FUNCTION public.next_order_number(p_store_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_number integer;
begin
  update public.stores
     set next_order_number = next_order_number + 1
   where id = p_store_id
   returning next_order_number - 1 into v_number;

  if v_number is null then
    raise exception 'Loja não encontrada' using errcode = 'P0002';
  end if;
  return v_number;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(p_store_id uuid, p_mode order_mode, p_customer_name text, p_customer_phone text, p_payment_method payment_method, p_items jsonb, p_address jsonb DEFAULT NULL::jsonb, p_change_for numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_store        public.stores%rowtype;
  v_customer_id  uuid;
  v_order_id     uuid;
  v_number       integer;
  v_token        text;
  v_subtotal     numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount     numeric(10,2) := 0;
  v_total        numeric(10,2);
  v_min_order    numeric(10,2);
  v_free_above   numeric(10,2);

  v_item         jsonb;
  v_comp         jsonb;
  v_product      public.products%rowtype;
  v_complement   public.complements%rowtype;
  v_group        public.complement_groups%rowtype;
  v_item_id      uuid;
  v_qty          smallint;
  v_comp_qty     smallint;
  v_item_total   numeric(10,2);
  v_group_counts jsonb;
  v_group_rec    record;
  v_count        integer;
begin
  -- Loja
  select * into v_store
  from public.stores
  where id = p_store_id and active and deleted_at is null;
  if not found then
    raise exception 'Loja indisponível' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Nome e telefone são obrigatórios' using errcode = 'P0001';
  end if;
  if p_mode = 'ENTREGA' and p_address is null then
    raise exception 'Endereço é obrigatório para entrega' using errcode = 'P0001';
  end if;
  if p_payment_method <> 'DINHEIRO' and p_change_for is not null then
    p_change_for := null;
  end if;

  -- Cliente (upsert por loja + telefone)
  insert into public.customers (store_id, phone, name, last_address)
  values (p_store_id, p_customer_phone, p_customer_name,
          case when p_mode = 'ENTREGA' then p_address else null end)
  on conflict (store_id, phone) do update
    set name         = excluded.name,
        last_address = coalesce(excluded.last_address, public.customers.last_address),
        deleted_at   = null
  returning id into v_customer_id;

  -- Pedido (número e total são preenchidos ao final)
  v_number := public.next_order_number(p_store_id);

  insert into public.orders (
    store_id, customer_id, number, status, mode,
    customer_name, customer_phone, address,
    payment_method, change_for, subtotal, delivery_fee, discount, total, notes
  ) values (
    p_store_id, v_customer_id, v_number, 'RECEBIDO', p_mode,
    p_customer_name, p_customer_phone,
    case when p_mode = 'ENTREGA' then p_address else null end,
    p_payment_method, p_change_for, 0, 0, 0, 0, p_notes
  )
  returning id, public_token into v_order_id, v_token;

  -- Itens
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 1);
    if v_qty < 1 then
      raise exception 'Quantidade inválida' using errcode = 'P0001';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and store_id = p_store_id
      and is_available
      and deleted_at is null;
    if not found then
      raise exception 'Produto indisponível: %', v_item ->> 'product_id' using errcode = 'P0001';
    end if;

    v_item_total := v_product.price * v_qty;

    insert into public.order_items (store_id, order_id, product_id, name, unit_price, quantity, notes, total)
    values (p_store_id, v_order_id, v_product.id, v_product.name, v_product.price, v_qty,
            v_item ->> 'notes', 0)
    returning id into v_item_id;

    -- Complementos do item
    v_group_counts := '{}'::jsonb;
    for v_comp in select * from jsonb_array_elements(coalesce(v_item -> 'complements', '[]'::jsonb)) loop
      v_comp_qty := coalesce((v_comp ->> 'quantity')::int, 1);
      if v_comp_qty < 1 then
        raise exception 'Quantidade de complemento inválida' using errcode = 'P0001';
      end if;

      select c.* into v_complement
      from public.complements c
      join public.product_complement_groups pcg
        on pcg.complement_group_id = c.complement_group_id
       and pcg.product_id = v_product.id
      where c.id = (v_comp ->> 'complement_id')::uuid
        and c.store_id = p_store_id
        and c.is_available
        and c.deleted_at is null;
      if not found then
        raise exception 'Complemento indisponível para o produto %: %', v_product.name, v_comp ->> 'complement_id'
          using errcode = 'P0001';
      end if;

      select * into v_group from public.complement_groups where id = v_complement.complement_group_id;

      if v_comp_qty > 1 and not v_group.allow_repeat then
        raise exception 'O grupo % não permite repetir item', v_group.name using errcode = 'P0001';
      end if;

      -- acumula contagem por grupo para validar min/max
      v_group_counts := jsonb_set(
        v_group_counts,
        array[v_group.id::text],
        to_jsonb(coalesce((v_group_counts ->> v_group.id::text)::int, 0) + v_comp_qty)
      );

      insert into public.order_item_complements
        (store_id, order_item_id, complement_id, group_name, name, price, quantity)
      values
        (p_store_id, v_item_id, v_complement.id, v_group.name, v_complement.name, v_complement.price, v_comp_qty);

      v_item_total := v_item_total + (v_complement.price * v_comp_qty * v_qty);
    end loop;

    -- valida min/max de todos os grupos vinculados ao produto
    for v_group_rec in
      select g.id, g.name, g.min_select, g.max_select
      from public.product_complement_groups pcg
      join public.complement_groups g on g.id = pcg.complement_group_id
      where pcg.product_id = v_product.id and g.deleted_at is null
    loop
      v_count := coalesce((v_group_counts ->> v_group_rec.id::text)::int, 0);
      if v_count < v_group_rec.min_select then
        raise exception 'Escolha pelo menos % em %', v_group_rec.min_select, v_group_rec.name
          using errcode = 'P0001';
      end if;
      if v_count > v_group_rec.max_select then
        raise exception 'Escolha no máximo % em %', v_group_rec.max_select, v_group_rec.name
          using errcode = 'P0001';
      end if;
    end loop;

    update public.order_items set total = v_item_total where id = v_item_id;
    v_subtotal := v_subtotal + v_item_total;
  end loop;

  -- Pedido mínimo, taxa de entrega e total
  v_min_order  := coalesce((v_store.settings ->> 'min_order')::numeric, 0);
  v_free_above := (v_store.settings ->> 'free_delivery_above')::numeric;

  if v_subtotal < v_min_order then
    raise exception 'Pedido mínimo é R$ %', v_min_order using errcode = 'P0001';
  end if;

  if p_mode = 'ENTREGA' then
    v_delivery_fee := coalesce((v_store.settings ->> 'delivery_fee')::numeric, 0);
    if v_free_above is not null and v_subtotal >= v_free_above then
      v_delivery_fee := 0;
    end if;
  end if;

  -- Promoções: regras ainda não definidas; desconto fica 0 no MVP.
  v_total := v_subtotal + v_delivery_fee - v_discount;

  update public.orders
     set subtotal     = v_subtotal,
         delivery_fee = v_delivery_fee,
         discount     = v_discount,
         total        = v_total
   where id = v_order_id;

  insert into public.order_events (store_id, order_id, user_id, from_status, to_status)
  values (p_store_id, v_order_id, null, null, 'RECEBIDO');

  return jsonb_build_object(
    'id', v_order_id,
    'number', v_number,
    'public_token', v_token,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'total', v_total
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status order_status, p_note text DEFAULT NULL::text, p_is_paid boolean DEFAULT NULL::boolean)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_allowed boolean;
begin
  select * into v_order
  from public.orders
  where id = p_order_id and deleted_at is null
  for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0002';
  end if;

  if not public.is_store_member(v_order.store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if v_order.status = p_status then
    return v_order;
  end if;

  -- Transições permitidas
  v_allowed := case v_order.status
    when 'RECEBIDO'   then p_status in ('EM_PREPARO', 'REJEITADO')
    when 'EM_PREPARO' then p_status in ('PRONTO', 'A_CAMINHO', 'CANCELADO')
    when 'PRONTO'     then p_status in ('CONCLUIDO', 'A_CAMINHO', 'CANCELADO')
    when 'A_CAMINHO'  then p_status in ('CONCLUIDO', 'CANCELADO')
    else false
  end;
  if not v_allowed then
    raise exception 'Transição inválida: % → %', v_order.status, p_status using errcode = 'P0001';
  end if;

  if p_status in ('REJEITADO', 'CANCELADO') and coalesce(trim(p_note), '') = '' then
    raise exception 'Informe o motivo' using errcode = 'P0001';
  end if;

  -- Status PRONTO só faz sentido para retirada; A_CAMINHO só para entrega
  if p_status = 'A_CAMINHO' and v_order.mode <> 'ENTREGA' then
    raise exception 'Pedido de retirada não sai para entrega' using errcode = 'P0001';
  end if;

  update public.orders
     set status           = p_status,
         read_at          = coalesce(read_at, now()),
         accepted_at      = case when p_status = 'EM_PREPARO' then coalesce(accepted_at, now()) else accepted_at end,
         completed_at     = case when p_status in ('CONCLUIDO', 'REJEITADO', 'CANCELADO') then now() else completed_at end,
         rejection_reason = case when p_status in ('REJEITADO', 'CANCELADO') then p_note else rejection_reason end,
         is_paid          = coalesce(p_is_paid, is_paid)
   where id = p_order_id
   returning * into v_order;

  insert into public.order_events (store_id, order_id, user_id, from_status, to_status, note)
  values (v_order.store_id, v_order.id, auth.uid(), v_order.status, p_status, p_note);

  return v_order;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_order_read(p_order_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.orders
     set read_at = coalesce(read_at, now())
   where id = p_order_id
     and public.is_store_member(store_id);
$function$;

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', o.id,
    'number', o.number,
    'status', o.status,
    'mode', o.mode,
    'customer_name', o.customer_name,
    'address', o.address,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'discount', o.discount,
    'total', o.total,
    'notes', o.notes,
    'rejection_reason', o.rejection_reason,
    'created_at', o.created_at,
    'accepted_at', o.accepted_at,
    'completed_at', o.completed_at,
    'store', jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'phone', s.phone),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'notes', i.notes,
        'total', i.total,
        'complements', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'group_name', c.group_name, 'name', c.name, 'price', c.price, 'quantity', c.quantity
          )), '[]'::jsonb)
          from public.order_item_complements c where c.order_item_id = i.id
        )
      ) order by i.created_at), '[]'::jsonb)
      from public.order_items i where i.order_id = o.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'to_status', e.to_status, 'note', e.note, 'created_at', e.created_at
      ) order by e.created_at), '[]'::jsonb)
      from public.order_events e where e.order_id = o.id
    )
  )
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.public_token = p_token
    and o.deleted_at is null;
$function$;

-- next_order_number só é chamada por create_order (security definer).
revoke all on function public.next_order_number(uuid) from public, anon, authenticated;

-- =========================================================================
-- Triggers
-- =========================================================================

create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger complement_groups_set_updated_at before update on public.complement_groups for each row execute function public.set_updated_at();
create trigger complements_set_updated_at before update on public.complements for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger promotions_set_updated_at before update on public.promotions for each row execute function public.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();
create trigger store_hours_set_updated_at before update on public.store_hours for each row execute function public.set_updated_at();
create trigger store_users_set_updated_at before update on public.store_users for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();

-- Cria o profile quando um usuário se cadastra no Supabase Auth.
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.categories enable row level security;
alter table public.complement_groups enable row level security;
alter table public.complements enable row level security;
alter table public.customers enable row level security;
alter table public.order_events enable row level security;
alter table public.order_item_complements enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.product_complement_groups enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.promotions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.store_hours enable row level security;
alter table public.store_users enable row level security;
alter table public.stores enable row level security;

-- stores
create policy "public read stores" on public.stores
  for select to public using (active and (deleted_at is null));
create policy "members manage stores" on public.stores
  for all to authenticated using (public.is_store_member(id)) with check (public.is_store_member(id));

-- profiles
create policy "own profile read" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- store_users
create policy "members read store_users" on public.store_users
  for select to authenticated using (public.is_store_member(store_id));
create policy "owners manage store_users" on public.store_users
  for all to authenticated
  using (exists (
    select 1 from public.store_users su
    where su.store_id = store_users.store_id
      and su.user_id = auth.uid()
      and su.role = 'OWNER'::public.store_role
      and su.deleted_at is null
  ))
  with check (exists (
    select 1 from public.store_users su
    where su.store_id = store_users.store_id
      and su.user_id = auth.uid()
      and su.role = 'OWNER'::public.store_role
      and su.deleted_at is null
  ));

-- store_hours
create policy "public read store_hours" on public.store_hours
  for select to public using (deleted_at is null);
create policy "members manage store_hours" on public.store_hours
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- categories
create policy "public read categories" on public.categories
  for select to public using (deleted_at is null);
create policy "members manage categories" on public.categories
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- products
create policy "public read products" on public.products
  for select to public using (deleted_at is null);
create policy "members manage products" on public.products
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- complement_groups
create policy "public read complement_groups" on public.complement_groups
  for select to public using (deleted_at is null);
create policy "members manage complement_groups" on public.complement_groups
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- complements
create policy "public read complements" on public.complements
  for select to public using (deleted_at is null);
create policy "members manage complements" on public.complements
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- product_complement_groups
create policy "public read product_complement_groups" on public.product_complement_groups
  for select to public using (true);
create policy "members manage product_complement_groups" on public.product_complement_groups
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- promotions
create policy "public read active promotions" on public.promotions
  for select to public using (is_active and (deleted_at is null));
create policy "members manage promotions" on public.promotions
  for all to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- customers
create policy "members read customers" on public.customers
  for select to authenticated using (public.is_store_member(store_id));
create policy "members update customers" on public.customers
  for update to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- orders
create policy "members read orders" on public.orders
  for select to authenticated using (public.is_store_member(store_id));
create policy "members update orders" on public.orders
  for update to authenticated using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- order_items
create policy "members read order_items" on public.order_items
  for select to authenticated using (public.is_store_member(store_id));

-- order_item_complements
create policy "members read order_item_complements" on public.order_item_complements
  for select to authenticated using (public.is_store_member(store_id));

-- order_events
create policy "members read order_events" on public.order_events
  for select to authenticated using (public.is_store_member(store_id));

-- push_subscriptions
create policy "members manage push_subscriptions" on public.push_subscriptions
  for all to authenticated
  using (public.is_store_member(store_id) and (user_id = auth.uid()))
  with check (public.is_store_member(store_id) and (user_id = auth.uid()));

-- =========================================================================
-- Storage
-- =========================================================================

-- Imagens da loja; o primeiro nível da pasta é o store_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public read store-assets" on storage.objects
  for select to public using (bucket_id = 'store-assets'::text);
create policy "members upload store-assets" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'store-assets'::text) and public.is_store_member(((storage.foldername(name))[1])::uuid));
create policy "members update store-assets" on storage.objects
  for update to authenticated
  using ((bucket_id = 'store-assets'::text) and public.is_store_member(((storage.foldername(name))[1])::uuid));
create policy "members delete store-assets" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'store-assets'::text) and public.is_store_member(((storage.foldername(name))[1])::uuid));

-- =========================================================================
-- Realtime
-- =========================================================================

alter publication supabase_realtime add table public.orders, public.order_events;
