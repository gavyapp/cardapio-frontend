-- Dados de exemplo: o cardápio real da Stack Burguer (Orleans – SC),
-- igual ao protótipo, e um login de lojista para testar o painel.
--
-- Roda sozinho no `supabase db reset` e no `supabase start` local
-- (config.toml → [db.seed]). Num projeto remoto só roda com
-- `supabase db push --include-seed`, e nunca deve ir para produção:
-- a senha do login de teste está aqui no repositório.
--
-- Login do painel: dono@stackburguer.test / stack1234
--
-- Se a loja já existe (slug stack-burguer), não faz nada, então pode
-- rodar mais de uma vez sem duplicar.
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
