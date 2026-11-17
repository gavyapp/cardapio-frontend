"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/input";
import {
  hasSelectionChanged,
  searchProductChoices,
  toggleProducts,
  type ProductChoiceCategory,
} from "@/lib/catalog/group-products";
import { pluralize } from "@/lib/format";

/**
 * Janela para escolher em quais produtos um grupo de complementos é usado:
 * busca, produtos por categoria com caixa de marcar e "marcar todos" por
 * categoria. onSave recebe a lista completa e devolve a mensagem de erro, ou
 * null para fechar.
 */
export function ComplementGroupProductsDialog({
  group,
  categories,
  onOpenChange,
  onSave,
}: {
  /** Grupo em edição; null mantém a janela fechada. */
  group: {
    id: string;
    name: string;
    productIds: string[];
  } | null;
  categories: readonly ProductChoiceCategory[];
  onOpenChange: (open: boolean) => void;
  onSave: (
    groupId: string,
    productIds: string[],
  ) => Promise<string | null>;
}) {
  return (
    <Dialog
      open={group !== null}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
        {/* Monta de novo a cada abertura, com a marcação gravada. */}
        {group ? (
          <ProductChoiceForm
            key={group.id}
            group={group}
            categories={categories}
            onSave={onSave}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProductChoiceForm({
  group,
  categories,
  onSave,
  onDone,
}: {
  group: { id: string; name: string; productIds: string[] };
  categories: readonly ProductChoiceCategory[];
  onSave: (
    groupId: string,
    productIds: string[],
  ) => Promise<string | null>;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState(
    () => new Set(group.productIds),
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => searchProductChoices(categories, query),
    [categories, query],
  );
  const changed = hasSelectionChanged(
    selected,
    group.productIds,
  );

  function toggle(productIds: string[], checked: boolean) {
    setSelected((current) =>
      toggleProducts(current, productIds, checked),
    );
    setError(null);
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const message = await onSave(group.id, [
            ...selected,
          ]);
          if (message) setError(message);
          else onDone();
        });
      }}
    >
      <DialogHeader className="gap-3 border-b p-4">
        <div className="flex flex-col gap-1">
          <DialogTitle>
            Produtos com {group.name}
          </DialogTitle>
          <DialogDescription>
            Marque os produtos que usam este grupo. Num
            produto novo, o grupo entra depois dos que ele
            já tem.
          </DialogDescription>
        </div>
        <Input
          type="search"
          value={query}
          placeholder="Buscar produto ou categoria"
          aria-label="Buscar produto ou categoria"
          onChange={(event) => setQuery(event.target.value)}
        />
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-body text-muted-foreground">
            A loja ainda não tem produtos.
          </p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-body text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        ) : (
          visible.map((category) => {
            const ids = category.products.map(
              (product) => product.id,
            );
            const allChecked = ids.every((id) =>
              selected.has(id),
            );
            return (
              <fieldset
                key={category.id}
                className="border-b py-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <legend className="float-left text-support font-semibold">
                    {category.name}
                  </legend>
                  <button
                    type="button"
                    className="rounded-control px-2 py-1 text-support text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground"
                    onClick={() => toggle(ids, !allChecked)}
                  >
                    {allChecked
                      ? "Desmarcar todos"
                      : "Marcar todos"}
                  </button>
                </div>
                <ul className="clear-both pt-1">
                  {category.products.map((product) => (
                    <li key={product.id}>
                      <label className="flex min-h-11 items-center gap-3 rounded-control px-2 text-body hover:bg-muted">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-foreground"
                          checked={selected.has(product.id)}
                          onChange={(event) =>
                            toggle(
                              [product.id],
                              event.target.checked,
                            )
                          }
                        />
                        <span className="min-w-0 truncate">
                          {product.name}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 border-t p-4">
        {error ? (
          <p
            role="alert"
            className="text-support text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            aria-live="polite"
            className="text-support text-muted-foreground"
          >
            {selected.size === 0
              ? "Nenhum produto marcado"
              : `${pluralize(selected.size, "produto marcado", "produtos marcados")}`}
          </p>
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            <Button
              type="submit"
              loading={pending}
              disabled={!changed}
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
