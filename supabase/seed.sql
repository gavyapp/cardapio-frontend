-- Dados de exemplo: o cardápio real da Stack Burguer (Orleans – SC),
-- igual ao protótipo, um login de lojista para testar o painel e pedidos
-- de exemplo em todos os status.
--
-- Roda sozinho no `supabase db reset` e no `supabase start` local
-- (config.toml → [db.seed]). Num projeto remoto só roda com
-- `supabase db push --include-seed`, e nunca deve ir para produção:
-- a senha do login de teste está aqui no repositório.
--
-- Login do painel: dono@stackburguer.test / stack1234
--
-- Se a loja já existe (slug stack-burguer), não recria o cardápio; se ela
-- já tem pedidos, não cria pedidos. Pode rodar mais de uma vez sem duplicar.
--
-- Preço do produto é o preço cheio. Os descontos que o protótipo mostra
-- (Combo The Classic e Porção com Cheddar e Bacon) são promoções e
-- ficam fora daqui. Fotos também ficam de fora até o upload existir.

do $seed$
declare
  v_store   uuid;
  v_user    uuid := 'a0000000-5eed-4000-8000-000000000001';
  v_cat     uuid;
  v_product uuid;
  v_group   uuid;

  -- Grupos de complementos: chave → (nome, mín., máx., opções [nome, preço])
  v_groups  jsonb := $json$
  {
    "adicionais": { "name": "Adicionais", "min": 0, "max": 6, "options": [
      ["Burger", 9], ["Bacon", 4], ["Farofa de Bacon", 4], ["Alface", 1],
      ["Tomate", 2], ["Cebola Roxa", 2], ["Cebola Caramelizada", 3],
      ["Fatia de Cheddar", 3], ["Molho de Queijo", 5],
      ["Molho Mostarda e Mel", 3], ["Pepino Agridoce", 4],
      ["Abacaxi enrolado no Bacon", 7] ] },
    "coca_combo": { "name": "Coca-Cola do combo", "min": 1, "max": 1, "options": [
      ["Tradicional", 0], ["Zero", 0] ] },
    "coca": { "name": "Versão", "min": 1, "max": 1, "options": [
      ["Tradicional", 0], ["Zero", 0] ] }
  }
  $json$;

  -- Categorias na ordem do cardápio, cada uma com seus produtos.
  -- groups = chaves de v_groups, na ordem em que aparecem no produto.
  v_menu    jsonb := $json$
  [
    { "name": "Burgers", "products": [
      { "name": "The Chicken Little", "price": 35, "groups": ["adicionais"],
        "description": "Pão cervejinha longo, filé de frango à milanesa, fatia de queijo cheddar, alface americana e tomate." },
      { "name": "The Spicy Honey", "price": 31, "groups": ["adicionais"],
        "description": "Pão brioche, molho mostarda e mel, pepino agridoce, bacon, fatia de queijo cheddar e burger (140g)." },
      { "name": "Billy, The Kid", "price": 30, "groups": ["adicionais"],
        "description": "Pão australiano, farofa de bacon, molho barbecue, molho de queijo e burger (140g)." },
      { "name": "Bonnie & Clyde", "price": 30, "groups": ["adicionais"],
        "description": "Pão australiano, cebola caramelizada, bacon, fatia de queijo cheddar e burger (140g)." },
      { "name": "The Tropical", "price": 29, "groups": ["adicionais"],
        "description": "Pão brioche, abacaxi na brasa embrulhado no bacon, molho barbecue, molho de queijo e burger (140g)." },
      { "name": "The Original", "price": 28, "groups": ["adicionais"],
        "description": "Pão cervejinha, alface, tomate, cebola roxa, molho de queijo e burger (140g)." },
      { "name": "The Flash", "price": 28, "groups": ["adicionais"],
        "description": "Pão brioche, geleia de pimenta, bacon, molho de queijo e burger (140g)." },
      { "name": "The Classic", "price": 27, "groups": ["adicionais"], "badges": ["Mais vendido"],
        "description": "Pão brioche, bacon, fatia de queijo cheddar e burger (140g)." }
    ] },
    { "name": "Combos", "products": [
      { "name": "Combo The Chicken Little", "price": 45, "groups": ["coca_combo", "adicionais"],
        "description": "The Chicken Little + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo The Spicy Honey", "price": 41, "groups": ["coca_combo", "adicionais"],
        "description": "The Spicy Honey + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo Billy, The Kid", "price": 40, "groups": ["coca_combo", "adicionais"],
        "description": "Billy, The Kid + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo Bonnie & Clyde", "price": 40, "groups": ["coca_combo", "adicionais"],
        "description": "Bonnie & Clyde + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo The Tropical", "price": 39, "groups": ["coca_combo", "adicionais"],
        "description": "The Tropical + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo The Original", "price": 38, "groups": ["coca_combo", "adicionais"],
        "description": "The Original + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo The Flash", "price": 38, "groups": ["coca_combo", "adicionais"],
        "description": "The Flash + batatinha + Coca lata (tradicional ou zero)." },
      { "name": "Combo The Classic", "price": 42, "groups": ["coca_combo", "adicionais"],
        "description": "The Classic + batatinha + Coca lata (tradicional ou zero)." }
    ] },
    { "name": "Acompanhamentos", "products": [
      { "name": "Batatinha", "price": 5, "suggested": true },
      { "name": "Porção de Batata", "price": 20 },
      { "name": "Porção de Batata com Cheddar e Bacon", "price": 30 },
      { "name": "Pote de Molho de Queijo", "price": 7 },
      { "name": "Pote de Maionese Caseira", "price": 3 }
    ] },
    { "name": "Bebidas", "products": [
      { "name": "Coca-Cola Lata", "price": 7, "groups": ["coca"], "suggested": true,
        "description": "Tradicional ou zero." }
    ] },
    { "name": "Sobremesas", "products": [
      { "name": "The Cookies", "price": 15, "suggested": true,
        "description": "Nutella com gotas de chocolate." }
    ] }
  ]
  $json$;

  v_group_ids jsonb := '{}';
  v_key     text;
  v_g       jsonb;
  v_c       jsonb;
  v_p       jsonb;
  v_i       int;
  v_j       int;
  v_k       int;
begin
  if exists (select 1 from public.stores where slug = 'stack-burguer') then
    raise notice 'Seed: loja stack-burguer já existe, nada a fazer';
    return;
  end if;

  -- Loja
  insert into public.stores (slug, name, phone, street, number, district, city, state, settings)
  values (
    'stack-burguer', 'Stack Burguer', '(11) 3456-7890',
    'Rua das Acácias', '214', 'Centro', 'Orleans', 'SC',
    jsonb_build_object(
      'delivery_fee', 6,
      'payment_methods', jsonb_build_array('DINHEIRO', 'CARTAO', 'PIX')
    )
  )
  returning id into v_store;

  -- Horários: quinta a sábado, 18:30 às 23:00 (0 = domingo)
  insert into public.store_hours (store_id, weekday, opens_at, closes_at)
  select v_store, d, '18:30', '23:00' from unnest(array[4, 5, 6]) as d;

  -- Grupos de complementos e suas opções
  for v_key, v_g in select * from jsonb_each(v_groups) loop
    insert into public.complement_groups (store_id, name, min_select, max_select)
    values (v_store, v_g ->> 'name', (v_g ->> 'min')::smallint, (v_g ->> 'max')::smallint)
    returning id into v_group;

    v_group_ids := v_group_ids || jsonb_build_object(v_key, v_group);

    v_i := 0;
    for v_c in select * from jsonb_array_elements(v_g -> 'options') loop
      insert into public.complements (store_id, complement_group_id, name, price, sort_order)
      values (v_store, v_group, v_c ->> 0, (v_c ->> 1)::numeric, v_i);
      v_i := v_i + 1;
    end loop;
  end loop;

  -- Categorias, produtos e os grupos de cada produto
  v_i := 0;
  for v_c in select * from jsonb_array_elements(v_menu) loop
    insert into public.categories (store_id, name, sort_order)
    values (v_store, v_c ->> 'name', v_i)
    returning id into v_cat;
    v_i := v_i + 1;

    v_j := 0;
    for v_p in select * from jsonb_array_elements(v_c -> 'products') loop
      insert into public.products
        (store_id, category_id, name, description, price, badges, is_suggested, sort_order)
      values (
        v_store, v_cat, v_p ->> 'name', v_p ->> 'description', (v_p ->> 'price')::numeric,
        coalesce(array(select jsonb_array_elements_text(v_p -> 'badges')), '{}'),
        coalesce((v_p ->> 'suggested')::boolean, false),
        v_j
      )
      returning id into v_product;
      v_j := v_j + 1;

      v_k := 0;
      for v_key in select jsonb_array_elements_text(coalesce(v_p -> 'groups', '[]')) loop
        insert into public.product_complement_groups (store_id, product_id, complement_group_id, sort_order)
        values (v_store, v_product, (v_group_ids ->> v_key)::uuid, v_k);
        v_k := v_k + 1;
      end loop;
    end loop;
  end loop;

  -- Login de teste do painel (dono da loja). O trigger de auth.users
  -- cria o perfil em public.profiles.
  if not exists (select 1 from auth.users where email = 'dono@stackburguer.test') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      'dono@stackburguer.test', extensions.crypt('stack1234', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Dono Stack Burguer"}', now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      v_user::text, v_user,
      jsonb_build_object('sub', v_user::text, 'email', 'dono@stackburguer.test', 'email_verified', true),
      'email', now(), now()
    );
  end if;

  insert into public.store_users (store_id, user_id, role)
  select v_store, id, 'OWNER' from auth.users where email = 'dono@stackburguer.test';
end
$seed$;

-- Pedidos de exemplo da Stack Burguer, um em cada status, para testar o
-- quadro e o detalhe do pedido no painel antes de o checkout existir.
--
-- Cada pedido entra pelo create_order e anda pelo update_order_status como
-- o dono do seed, então os eventos têm user_id e passam pelas mesmas
-- regras do painel. Depois os horários são espalhados pelas últimas duas
-- horas, para ter pedido recente e pedido atrasado.
--
-- Se a loja já tem pedido, não faz nada, então rodar de novo não duplica.
do $orders$
declare
  v_store    uuid;
  v_user     uuid;
  v_override boolean;
  v_o        jsonb;
  v_item     jsonb;
  v_comp     jsonb;
  v_items    jsonb;
  v_comps    jsonb;
  v_order    uuid;
  v_created  timestamptz;
  v_step     interval;
  v_status   text;
  v_i        int;
  v_count    int;

  -- Cada pedido: cliente, entrega ou retirada, pagamento, itens (produto
  -- e complementos [grupo, opção] pelo nome), caminho de status, motivo
  -- de rejeição ou cancelamento, se já está pago e há quantos minutos
  -- chegou.
  v_orders   jsonb := $json$
  [
    { "name": "Ana Souza", "phone": "48999000001", "mode": "ENTREGA", "payment": "PIX",
      "address": { "street": "Rua Coronel Marcos Rovaris", "number": "120", "district": "Centro",
                   "complement": "Apto 302" },
      "items": [
        { "product": "The Classic", "quantity": 2, "complements": [["Adicionais", "Bacon"]] },
        { "product": "Coca-Cola Lata", "complements": [["Versão", "Zero"]] } ],
      "path": [], "minutes_ago": 3 },
    { "name": "Bruno Lima", "phone": "48999000002", "mode": "RETIRADA", "payment": "DINHEIRO",
      "change_for": 50,
      "items": [
        { "product": "Combo The Original", "notes": "Sem cebola roxa",
          "complements": [["Coca-Cola do combo", "Tradicional"]] } ],
      "path": [], "minutes_ago": 7 },
    { "name": "Carla Mendes", "phone": "48999000003", "mode": "ENTREGA", "payment": "CARTAO",
      "notes": "Interfone quebrado, ligar quando chegar",
      "address": { "street": "Rua Pedro Bernardo Warmling", "number": "45", "district": "Murialdo",
                   "reference": "Casa amarela de esquina" },
      "items": [
        { "product": "The Spicy Honey" },
        { "product": "Batatinha" } ],
      "path": ["EM_PREPARO"], "minutes_ago": 18 },
    { "name": "Diego Rocha", "phone": "48999000004", "mode": "RETIRADA", "payment": "PIX",
      "items": [
        { "product": "Porção de Batata com Cheddar e Bacon" },
        { "product": "Coca-Cola Lata", "quantity": 2, "complements": [["Versão", "Tradicional"]] } ],
      "path": ["EM_PREPARO", "PRONTO"], "paid": true, "minutes_ago": 32 },
    { "name": "Elisa Martins", "phone": "48999000005", "mode": "ENTREGA", "payment": "DINHEIRO",
      "change_for": 100,
      "address": { "street": "Rua Vereador Arno Kuhnen", "number": "780", "district": "Vila Nova" },
      "items": [
        { "product": "Combo The Chicken Little",
          "complements": [["Coca-Cola do combo", "Zero"], ["Adicionais", "Fatia de Cheddar"]] },
        { "product": "The Cookies" } ],
      "path": ["EM_PREPARO", "A_CAMINHO"], "minutes_ago": 46 },
    { "name": "Gabriela Nunes", "phone": "48999000007", "mode": "ENTREGA", "payment": "CARTAO",
      "address": { "street": "Estrada Geral Rio Pinheiros", "number": "s/n", "district": "Rio Pinheiros" },
      "items": [ { "product": "The Tropical" } ],
      "path": ["REJEITADO"], "reason": "Endereço fora da área de entrega", "minutes_ago": 60 },
    { "name": "Henrique Alves", "phone": "48999000008", "mode": "RETIRADA", "payment": "CARTAO",
      "items": [ { "product": "The Flash" }, { "product": "Pote de Maionese Caseira" } ],
      "path": ["EM_PREPARO", "CANCELADO"], "reason": "Cliente desistiu", "minutes_ago": 75 },
    { "name": "Fábio Costa", "phone": "48999000006", "mode": "ENTREGA", "payment": "PIX",
      "address": { "street": "Rua Sete de Setembro", "number": "310", "district": "Centro" },
      "items": [
        { "product": "Billy, The Kid" },
        { "product": "Bonnie & Clyde", "complements": [["Adicionais", "Burger"]] } ],
      "path": ["EM_PREPARO", "A_CAMINHO", "CONCLUIDO"], "paid": true, "minutes_ago": 95 }
  ]
  $json$;
begin
  select id, is_open_override into v_store, v_override
  from public.stores where slug = 'stack-burguer';
  if not found then
    raise notice 'Seed: loja stack-burguer não existe, sem pedidos de exemplo';
    return;
  end if;

  if exists (select 1 from public.orders where store_id = v_store) then
    raise notice 'Seed: loja stack-burguer já tem pedidos, nada a fazer';
    return;
  end if;

  -- As mudanças de status rodam como o dono da loja.
  select id into v_user from auth.users where email = 'dono@stackburguer.test';
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  -- Loja aberta só enquanto cria os pedidos.
  update public.stores set is_open_override = true where id = v_store;

  -- Do mais antigo para o mais recente, para o número seguir a ordem
  for v_o in
    select value from jsonb_array_elements(v_orders)
    order by (value ->> 'minutes_ago')::int desc
  loop
    -- Itens no formato do create_order, com ids pelos nomes
    v_items := '[]';
    for v_item in select * from jsonb_array_elements(v_o -> 'items') loop
      v_comps := '[]';
      for v_comp in select * from jsonb_array_elements(coalesce(v_item -> 'complements', '[]')) loop
        v_comps := v_comps || jsonb_build_object('complement_id', (
          select c.id
          from public.complements c
          join public.complement_groups g on g.id = c.complement_group_id
          where c.store_id = v_store and g.name = v_comp ->> 0 and c.name = v_comp ->> 1
        ));
      end loop;

      v_items := v_items || jsonb_build_object(
        'product_id', (select id from public.products
                       where store_id = v_store and name = v_item ->> 'product'),
        'quantity', coalesce((v_item ->> 'quantity')::int, 1),
        'notes', v_item ->> 'notes',
        'complements', v_comps);
    end loop;

    v_order := (public.create_order(
      v_store,
      (v_o ->> 'mode')::public.order_mode,
      v_o ->> 'name',
      v_o ->> 'phone',
      (v_o ->> 'payment')::public.payment_method,
      v_items,
      v_o -> 'address',
      (v_o ->> 'change_for')::numeric,
      v_o ->> 'notes'
    ) ->> 'id')::uuid;

    -- Caminho de status, cada passo alguns minutos depois do anterior
    v_created := now() - make_interval(mins => (v_o ->> 'minutes_ago')::int);
    v_step := least(interval '10 minutes',
      make_interval(mins => (v_o ->> 'minutes_ago')::int)
        / (jsonb_array_length(v_o -> 'path') + 1));
    -- Evento de criação do pedido
    update public.order_events
       set created_at = v_created
     where order_id = v_order and from_status is null;

    v_i := 0;
    for v_status in select jsonb_array_elements_text(v_o -> 'path') loop
      v_i := v_i + 1;
      perform public.update_order_status(
        v_order,
        v_status::public.order_status,
        case when v_status in ('REJEITADO', 'CANCELADO') then v_o ->> 'reason' end);

      update public.order_events
         set created_at = v_created + v_step * v_i
       where order_id = v_order and to_status = v_status::public.order_status;
    end loop;

    if (v_o ->> 'paid')::boolean then
      perform public.set_order_paid(v_order, true);
    end if;

    -- Horários do pedido de acordo com os eventos
    update public.orders o
       set created_at   = v_created,
           read_at      = case when o.status <> 'RECEBIDO' then v_created + interval '1 minute' end,
           accepted_at  = (select e.created_at from public.order_events e
                           where e.order_id = o.id and e.to_status = 'EM_PREPARO'),
           completed_at = case when o.status in ('CONCLUIDO', 'REJEITADO', 'CANCELADO')
                            then (select max(e.created_at) from public.order_events e
                                  where e.order_id = o.id) end
     where o.id = v_order;
  end loop;

  update public.stores set is_open_override = v_override where id = v_store;
  perform set_config('request.jwt.claims', '', true);

  -- Confere que o seed deixou um pedido em cada status
  select count(distinct status) into v_count from public.orders where store_id = v_store;
  if v_count <> 7 then
    raise exception 'Seed: pedidos de exemplo cobrem % status, esperado 7', v_count;
  end if;
end
$orders$;
