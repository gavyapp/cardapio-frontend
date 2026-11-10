"use client";

import {
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { SortableList } from "@/components/molecules/sortable-list";
import {
  CategoryList,
  type CategoryActions,
} from "@/components/organisms/category-list";
import { ProductEditor } from "@/components/organisms/product-editor";
import type {
  ActionResult,
  ActionResultWith,
} from "@/lib/panel/action-result";
import type {
  CategoryItem,
  ComplementGroupDraft,
  ComplementGroupItem,
  EditableProduct,
  ProductDraft,
} from "@/lib/catalog/types";
import { isBlockingGroup } from "@/lib/catalog/complement-rules";
import {
  NEW_ITEM,
  PRODUCT_PARAM,
  SEARCH_PARAM,
} from "@/lib/catalog/params";
import {
  formatCurrency,
  normalizeSearch,
} from "@/lib/format";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";
import { useSearchParamState } from "@/lib/hooks/use-search-param-state";
import { cn } from "@/lib/utils";

export type ProductActions = {
  save: (
    draft: ProductDraft,
  ) => Promise<ActionResultWith<string>>;
  duplicate: (
    productId: string,
  ) => Promise<ActionResultWith<string>>;
  setAvailability: (
    productId: string,
    isAvailable: boolean,
  ) => Promise<ActionResult>;
  setSuggested: (
    productId: string,
    isSuggested: boolean,
  ) => Promise<ActionResult>;
  reorder: (
    categoryId: string,
    orderedIds: string[],
  ) => Promise<ActionResult>;
  remove: (productId: string) => Promise<ActionResult>;
  saveGroup: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
};

// Alça, foto, produto, preço, sugerir, disponível, menu.
const ROW_GRID =
  "grid grid-cols-[44px_40px_minmax(0,1fr)_44px_36px] items-center gap-x-3 sm:grid-cols-[44px_40px_minmax(0,1fr)_96px_136px_80px_36px] sm:gap-x-4";

/**
 * Tela de produtos: cada categoria é um cartão (ativar, renomear, excluir,
 * arrastar) com a tabela dos produtos dela. Na linha do produto dá para
 * sugerir no carrinho, esgotar, editar, duplicar e excluir; clicar na linha
 * abre o editor lateral. A busca do cabeçalho filtra por nome e descrição.
 */
export function ProductList({
  storeId,
  categories,
  products,
  groups,
  actions,
  categoryActions,
}: {
  storeId: string;
  categories: CategoryItem[];
  products: EditableProduct[];
  groups: ComplementGroupItem[];
  actions: ProductActions;
  categoryActions: CategoryActions;
}) {
  const { items, optimistic } = useOptimisticList(products);
  const [deleting, setDeleting] =
    useState<EditableProduct | null>(null);
  // Categoria do "+ Adicionar produto" que abriu o editor.
  const [newInCategory, setNewInCategory] = useState<
    string | undefined
  >(undefined);
  const [editorParam, setEditorParam] =
    useSearchParamState(PRODUCT_PARAM);
  const [searchParam] = useSearchParamState(SEARCH_PARAM);
  const [, startTransition] = useTransition();

  const editing =
    items.find((product) => product.id === editorParam) ??
    null;
  const editorOpen = editorParam === NEW_ITEM || !!editing;
  const groupsById = new Map(
    groups.map((group) => [group.id, group]),
  );
  const search = normalizeSearch(searchParam ?? "");

  function openNew(categoryId?: string) {
    setNewInCategory(categoryId);
    setEditorParam(NEW_ITEM);
  }

  function patch(
    product: EditableProduct,
    change: Partial<EditableProduct>,
    save: () => Promise<ActionResult>,
  ) {
    optimistic(
      items.map((item) =>
        item.id === product.id
          ? { ...item, ...change }
          : item,
      ),
      save,
    );
  }

  function reorder(
    categoryId: string,
    next: EditableProduct[],
  ) {
    const others = items.filter(
      (item) => item.categoryId !== categoryId,
    );
    optimistic([...others, ...next], () =>
      actions.reorder(
        categoryId,
        next.map((item) => item.id),
      ),
    );
  }

  function duplicate(product: EditableProduct) {
    setEditorParam(null);
    startTransition(async () => {
      const result = await actions.duplicate(product.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${product.name}" duplicado`);
      // A cópia abre no editor assim que chega do servidor.
      setEditorParam(result.data);
    });
  }

  function renderRow(
    product: EditableProduct,
    dragHandle: ReactNode,
  ) {
    const linkedGroups = product.groupIds.flatMap((id) => {
      const group = groupsById.get(id);
      return group ? [group] : [];
    });
    const blocking = linkedGroups.find(isBlockingGroup);
    const open = () => setEditorParam(product.id);

    return (
      <div
        onClick={open}
        className={cn(
          ROW_GRID,
          "min-h-14 cursor-pointer border-t py-2 pr-3 pl-1 hover:bg-muted/40 sm:pr-6",
        )}
      >
        {dragHandle}
        <span
          className={cn(
            "flex size-10 items-center justify-center overflow-hidden rounded-control",
            product.imageUrl
              ? "bg-muted"
              : "border border-dashed text-center text-caption leading-none text-muted-foreground",
            !product.isAvailable && "opacity-60",
          )}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            "sem foto"
          )}
        </span>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-0.5 leading-tight",
            !product.isAvailable && "opacity-60",
          )}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                open();
              }}
              className="rounded-control text-left text-body font-medium outline-none focus-visible:ring-1 focus-visible:ring-foreground"
            >
              {product.name}
              {product.isAvailable ? null : (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · esgotado
                </span>
              )}
            </button>
            {product.isSuggested ? (
              <Badge variant="muted" className="sm:hidden">
                Sugerido
              </Badge>
            ) : null}
          </span>
          <span className="truncate text-support text-muted-foreground">
            {linkedGroups.length
              ? `Complementos: ${linkedGroups.map((group) => group.name).join(", ")}`
              : "Sem complementos"}
          </span>
          {product.badges.length > 0 ? (
            <span className="text-support text-muted-foreground">
              Selos: {product.badges.join(", ")}
            </span>
          ) : null}
          {blocking ? (
            <span className="text-support leading-snug text-destructive">
              Não pode ser pedido: &quot;{blocking.name}
              &quot; está sem opções disponíveis
            </span>
          ) : null}
          <span className="tabular text-support sm:hidden">
            {formatCurrency(product.price)}
          </span>
        </div>
        <span className="tabular hidden text-right text-body sm:block">
          {formatCurrency(product.price)}
        </span>
        <span
          className="hidden h-11 items-center sm:flex"
          onClick={(event) => event.stopPropagation()}
          title={
            product.isAvailable
              ? undefined
              : "Produto esgotado não pode ser sugerido"
          }
        >
          <Switch
            disabled={!product.isAvailable}
            checked={product.isSuggested}
            onCheckedChange={(checked) =>
              patch(product, { isSuggested: checked }, () =>
                actions.setSuggested(product.id, checked),
              )
            }
            aria-label={
              product.isSuggested
                ? `Parar de sugerir ${product.name} no carrinho`
                : `Sugerir ${product.name} no carrinho`
            }
          />
        </span>
        <span
          className="flex h-11 items-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Switch
            checked={product.isAvailable}
            onCheckedChange={(checked) =>
              patch(
                product,
                // Esgotar tira a sugestão no carrinho junto, como no banco.
                checked
                  ? { isAvailable: true }
                  : {
                      isAvailable: false,
                      isSuggested: false,
                    },
                () =>
                  actions.setAvailability(
                    product.id,
                    checked,
                  ),
              )
            }
            aria-label={
              product.isAvailable
                ? `Esgotar ${product.name}`
                : `Disponibilizar ${product.name}`
            }
          />
        </span>
        <span onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Mais ações de ${product.name}`}
                />
              }
            >
              <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-50"
            >
              <DropdownMenuItem onClick={open}>
                Editar produto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicate(product)}
              >
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleting(product)}
              >
                Excluir produto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
    );
  }

  const tableHeader = (
    <div
      aria-hidden
      className={cn(
        ROW_GRID,
        "hidden h-10 pr-6 pl-1 text-caption font-medium text-muted-foreground sm:grid",
      )}
    >
      <span />
      <span />
      <span>Produto</span>
      <span className="text-right">Preço</span>
      <span>Sugerir no carrinho</span>
      <span>Disponível</span>
      <span />
    </div>
  );

  function renderCategoryProducts(category: CategoryItem) {
    const inCategory = items.filter(
      (product) => product.categoryId === category.id,
    );
    return (
      <div>
        {inCategory.length > 0 ? tableHeader : null}
        <SortableList
          items={inCategory}
          onReorder={(next) => reorder(category.id, next)}
          handleLabel={(product) => `Mover ${product.name}`}
          renderItem={renderRow}
        />
        {inCategory.length === 0 ? (
          <p className="px-4 py-4 text-support text-muted-foreground sm:px-6">
            Nenhum produto nesta categoria.
          </p>
        ) : null}
        <div className="border-t px-4 py-2 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openNew(category.id)}
          >
            + Adicionar produto
          </Button>
        </div>
      </div>
    );
  }

  function renderSearchResults() {
    const sections = categories
      .map((category) => ({
        category,
        matches: items.filter(
          (product) =>
            product.categoryId === category.id &&
            normalizeSearch(
              `${product.name} ${product.description}`,
            ).includes(search),
        ),
      }))
      .filter((section) => section.matches.length > 0);

    if (sections.length === 0) {
      return (
        <p className="rounded-surface border bg-card px-6 py-10 text-center text-body text-muted-foreground">
          Nenhum produto encontrado para &quot;
          {(searchParam ?? "").trim()}&quot;.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {sections.map(({ category, matches }) => (
          <section
            key={category.id}
            aria-label={category.name}
            className="rounded-surface border bg-card"
          >
            <h2 className="flex min-h-14 items-center border-b px-4 text-body font-semibold sm:px-6">
              {category.name}
            </h2>
            {tableHeader}
            {matches.map((product) => (
              <div key={product.id}>
                {renderRow(product, <span />)}
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      {search ? (
        renderSearchResults()
      ) : (
        <CategoryList
          categories={categories}
          actions={categoryActions}
          renderContent={renderCategoryProducts}
        />
      )}

      <ProductEditor
        open={editorOpen}
        onOpenChange={(open) =>
          !open && setEditorParam(null)
        }
        product={editing}
        defaultCategoryId={newInCategory}
        storeId={storeId}
        categories={categories}
        groups={groups}
        onSave={async (draft) => {
          const result = await actions.save(draft);
          if (result.ok) {
            toast.success(
              draft.id ? "Produto salvo" : "Produto criado",
            );
          }
          return result;
        }}
        onCreateCategory={categoryActions.create}
        onSaveGroup={actions.saveGroup}
        onDuplicate={duplicate}
        onDelete={(product) => {
          setEditorParam(null);
          setDeleting(product);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={
          deleting
            ? `Excluir "${deleting.name}"?`
            : "Excluir produto?"
        }
        description="O produto some do painel e do cardápio. Pedidos já feitos não mudam."
        confirmLabel="Excluir produto"
        onConfirm={async () => {
          if (!deleting) return null;
          const result = await actions.remove(deleting.id);
          if (!result.ok) return result.error;
          toast.success("Produto excluído");
          return null;
        }}
      />
    </>
  );
}
