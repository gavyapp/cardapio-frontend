"use client";

import Link from "next/link";
import {
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
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
import { Input } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { SortableList } from "@/components/molecules/sortable-list";
import {
  ProductEditor,
  type EditableProduct,
  type EditorGroup,
  type ProductDraft,
} from "@/components/organisms/product-editor";
import type {
  ActionResult,
  ActionResultWith,
} from "@/lib/action-result";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProductListCategory = {
  id: string;
  name: string;
  isAvailable: boolean;
};

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
  reorder: (
    categoryId: string,
    orderedIds: string[],
  ) => Promise<ActionResult>;
  remove: (productId: string) => Promise<ActionResult>;
};

type EditorState =
  | { mode: "edit"; product: EditableProduct }
  | { mode: "new"; categoryId?: string }
  | null;

function normalize(text: string) {
  return text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function countLabel(count: number) {
  return count === 1 ? "1 produto" : `${count} produtos`;
}

/**
 * Produtos por categoria: busca, arrastar para reordenar dentro da
 * categoria, esgotar com um clique, editar, duplicar e excluir.
 */
export function ProductList({
  storeId,
  categories,
  products,
  groups,
  actions,
}: {
  storeId: string;
  categories: ProductListCategory[];
  products: EditableProduct[];
  groups: EditorGroup[];
  actions: ProductActions;
}) {
  const [items, setItems] = useState(products);
  const [source, setSource] = useState(products);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(),
  );
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleting, setDeleting] =
    useState<EditableProduct | null>(null);
  // Cópia recém-criada: abre no editor assim que chega do servidor.
  const [openWhenLoaded, setOpenWhenLoaded] = useState<
    string | null
  >(null);
  const [, startTransition] = useTransition();

  if (source !== products) {
    setSource(products);
    setItems(products);
    if (openWhenLoaded) {
      const copy = products.find(
        (product) => product.id === openWhenLoaded,
      );
      if (copy) {
        setOpenWhenLoaded(null);
        setEditor({ mode: "edit", product: copy });
      }
    }
  }

  const groupNames = new Map(
    groups.map((group) => [group.id, group.name]),
  );
  const search = normalize(query.trim());
  const searching = search.length > 0;

  function optimistic(
    next: EditableProduct[],
    save: () => Promise<ActionResult>,
  ) {
    const previous = items;
    setItems(next);
    startTransition(async () => {
      const result = await save();
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }

  function toggleAvailability(
    product: EditableProduct,
    isAvailable: boolean,
  ) {
    optimistic(
      items.map((item) =>
        item.id === product.id
          ? { ...item, isAvailable }
          : item,
      ),
      () =>
        actions.setAvailability(product.id, isAvailable),
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
    setEditor(null);
    startTransition(async () => {
      const result = await actions.duplicate(product.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${product.name}" duplicado`);
      setOpenWhenLoaded(result.data);
    });
  }

  function toggleCollapsed(categoryId: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center">
        <p className="text-[15px] text-muted-foreground">
          Crie uma categoria antes de cadastrar produtos.
        </p>
        <Button
          render={
            <Link href="/painel/cardapio/categorias" />
          }
          nativeButton={false}
        >
          Ir para categorias
        </Button>
      </div>
    );
  }

  function renderRow(
    product: EditableProduct,
    dragHandle?: ReactNode,
  ) {
    const complementNames = product.groupIds
      .map((id) => groupNames.get(id))
      .filter(Boolean)
      .join(", ");
    return (
      <div className="flex min-h-18 items-center gap-2 py-2 pr-2 pl-1 sm:gap-3 sm:pr-4">
        {dragHandle ?? <span className="w-2 shrink-0" />}
        <button
          type="button"
          onClick={() =>
            setEditor({ mode: "edit", product })
          }
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        >
          <span className="hidden size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground sm:flex">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon aria-hidden className="size-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2">
              <span
                className={cn(
                  "truncate text-[15px] font-semibold",
                  !product.isAvailable &&
                    "text-muted-foreground",
                )}
              >
                {product.name}
                {product.isAvailable ? "" : " · esgotado"}
              </span>
              {product.isSuggested ? (
                <Badge variant="secondary">
                  Sugerido no carrinho
                </Badge>
              ) : null}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">
              {complementNames
                ? `Complementos: ${complementNames}`
                : "Sem complementos"}
            </span>
            {product.badges.length > 0 ? (
              <span className="truncate text-[13px] text-muted-foreground">
                Selos: {product.badges.join(", ")}
              </span>
            ) : null}
            <span className="tabular text-[15px] font-medium sm:hidden">
              {formatCurrency(product.price)}
            </span>
          </span>
        </button>
        <span className="tabular hidden w-24 text-right text-[15px] font-medium sm:block">
          {formatCurrency(product.price)}
        </span>
        <Switch
          checked={product.isAvailable}
          onCheckedChange={(checked) =>
            toggleAvailability(product, checked)
          }
          aria-label={
            product.isAvailable
              ? `Esgotar ${product.name}`
              : `Disponibilizar ${product.name}`
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Mais ações de ${product.name}`}
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                setEditor({ mode: "edit", product })
              }
            >
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
      </div>
    );
  }

  const sections = categories.map((category) => {
    const inCategory = items.filter(
      (product) => product.categoryId === category.id,
    );
    const visible = searching
      ? inCategory.filter((product) =>
          normalize(
            `${product.name} ${product.description}`,
          ).includes(search),
        )
      : inCategory;
    return { category, inCategory, visible };
  });
  const noResults =
    searching &&
    sections.every((section) => !section.visible.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar produto"
            placeholder="Buscar produto"
            className="pl-9"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </div>
        <Button onClick={() => setEditor({ mode: "new" })}>
          <Plus aria-hidden />
          Novo produto
        </Button>
      </div>

      {noResults ? (
        <p className="rounded-xl border bg-card px-6 py-10 text-center text-[15px] text-muted-foreground">
          Nenhum produto encontrado para &quot;
          {query.trim()}&quot;.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {sections.map(
          ({ category, inCategory, visible }) => {
            if (searching && visible.length === 0)
              return null;
            const isCollapsed =
              !searching && collapsed.has(category.id);
            return (
              <section
                key={category.id}
                aria-labelledby={`category-${category.id}`}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    toggleCollapsed(category.id)
                  }
                  className="flex min-h-14 w-full items-center gap-2 px-4 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-inset"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span
                    id={`category-${category.id}`}
                    className="text-[15px] font-semibold"
                  >
                    {category.name}
                  </span>
                  <span className="tabular text-[13px] text-muted-foreground">
                    {countLabel(inCategory.length)}
                    {category.isAvailable
                      ? ""
                      : " · categoria fora do cardápio"}
                  </span>
                </button>

                {isCollapsed ? null : (
                  <div className="border-t">
                    {visible.length === 0 ? (
                      <p className="px-4 py-4 text-[13px] text-muted-foreground">
                        Nenhum produto nesta categoria.
                      </p>
                    ) : searching ? (
                      <ul className="divide-y">
                        {visible.map((product) => (
                          <li key={product.id}>
                            {renderRow(product)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <SortableList
                        items={visible}
                        onReorder={(next) =>
                          reorder(category.id, next)
                        }
                        handleLabel={(product) =>
                          `Mover ${product.name}`
                        }
                        className="divide-y"
                        renderItem={(product, dragHandle) =>
                          renderRow(product, dragHandle)
                        }
                      />
                    )}
                    {searching ? null : (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setEditor({
                              mode: "new",
                              categoryId: category.id,
                            })
                          }
                        >
                          <Plus aria-hidden />
                          Adicionar produto em{" "}
                          {category.name}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          },
        )}
      </div>

      <ProductEditor
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
        product={
          editor?.mode === "edit" ? editor.product : null
        }
        defaultCategoryId={
          editor?.mode === "new"
            ? editor.categoryId
            : undefined
        }
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
        onDuplicate={duplicate}
        onDelete={(product) => {
          setEditor(null);
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
