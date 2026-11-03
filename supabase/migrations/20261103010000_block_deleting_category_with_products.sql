-- Categoria só pode ser excluída (deleted_at preenchido) quando não tem mais
-- produto ativo. Produto já excluído não conta: ele continua apontando para a
-- categoria, mas não aparece em lugar nenhum.
--
-- security definer para enxergar todos os produtos da categoria, sem
-- depender do RLS de quem está excluindo.

create or replace function private.block_deleting_category_with_products()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.deleted_at is not null
     and old.deleted_at is null
     and exists (
       select 1 from public.products
       where category_id = new.id
         and deleted_at is null
     ) then
    raise exception 'A categoria tem produtos. Mova ou exclua os produtos antes de excluir a categoria.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

revoke all on function private.block_deleting_category_with_products() from public, anon, authenticated;

create trigger categories_block_deleting_with_products
  before update of deleted_at on public.categories
  for each row execute function private.block_deleting_category_with_products();
