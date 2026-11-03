-- Imagens da loja no bucket store-assets: leitura pública, limite de 2 MB em
-- JPEG, PNG ou WebP, e só membro da loja grava, move ou apaga na pasta
-- "<store_id>/".
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

-- O Storage recusa DELETE direto nas tabelas dele (o certo é a API). O teste
-- precisa do DELETE para conferir a policy, então libera só nesta transação.
select set_config('storage.allow_delete_query', 'true', true);

-- Bucket
select ok(
  (select public from storage.buckets where id = 'store-assets'),
  'bucket store-assets → público para leitura');
select is(
  (select file_size_limit from storage.buckets where id = 'store-assets'),
  2097152::bigint,
  'arquivo acima de 2 MB → recusado pelo limite do bucket');
select is(
  (select allowed_mime_types from storage.buckets where id = 'store-assets'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'arquivo que não é JPEG, PNG ou WebP → recusado pelo bucket');

-- Dado: lojas A e B, cada uma com seu dono, e uma foto já enviada pela loja B
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A'),
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B');
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER'),
  ('5b000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER');
insert into storage.objects (bucket_id, name) values
  ('store-assets', '5b000000-0000-0000-0000-000000000001/product/foto-b.webp');

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('store-assets', '5a000000-0000-0000-0000-000000000001/product/foto-a.webp') $$,
  'dono A envia foto na pasta da loja A → gravada');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('store-assets', '5b000000-0000-0000-0000-000000000001/product/intrusa.webp') $$,
  '42501', null,
  'dono A envia foto na pasta da loja B → negado');
select throws_ok(
  $$ update storage.objects
        set name = '5b000000-0000-0000-0000-000000000001/product/movida.webp'
      where name = '5a000000-0000-0000-0000-000000000001/product/foto-a.webp' $$,
  '42501', null,
  'dono A move a própria foto para a pasta da loja B → negado');

update storage.objects
   set name = '5a000000-0000-0000-0000-000000000001/product/roubada.webp'
 where name = '5b000000-0000-0000-0000-000000000001/product/foto-b.webp';
select is(
  (select count(*)::int from storage.objects
    where name = '5b000000-0000-0000-0000-000000000001/product/foto-b.webp'),
  1,
  'dono A move foto da loja B para a loja A → foto continua na loja B');

delete from storage.objects
 where name = '5b000000-0000-0000-0000-000000000001/product/foto-b.webp';
select is(
  (select count(*)::int from storage.objects
    where name = '5b000000-0000-0000-0000-000000000001/product/foto-b.webp'),
  1,
  'dono A apaga foto da loja B → foto mantida');

delete from storage.objects
 where name = '5a000000-0000-0000-0000-000000000001/product/foto-a.webp';
select is(
  (select count(*)::int from storage.objects
    where name = '5a000000-0000-0000-0000-000000000001/product/foto-a.webp'),
  0,
  'dono A apaga a própria foto (troca de foto) → apagada');

-- Dado: visitante sem login
reset role;
set local role anon;
do $$ begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

select is(
  (select count(*)::int from storage.objects
    where name = '5b000000-0000-0000-0000-000000000001/product/foto-b.webp'),
  1,
  'visitante lê as fotos da loja → visíveis (cardápio público)');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('store-assets', '5a000000-0000-0000-0000-000000000001/product/anonima.webp') $$,
  '42501', null,
  'visitante envia foto → negado');

select * from finish();
rollback;
