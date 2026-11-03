"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { NameDialog } from "@/components/molecules/name-dialog";
import { SortableList } from "@/components/molecules/sortable-list";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export type CategoryItem = {
  id: string;
  name: string;
  isAvailable: boolean;
  productCount: number;
};

export type CategoryActions = {
  create: (
    name: string,
  ) => Promise<
    | { ok: true; data: string }
    | { ok: false; error: string }
  >;
  rename: (
    id: string,
    name: string,
  ) => Promise<ActionResult>;
  setAvailability: (
    id: string,
    isAvailable: boolean,
  ) => Promise<ActionResult>;
  reorder: (orderedIds: string[]) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
};

type DialogState =
  | { type: "create" }
  | { type: "rename"; category: CategoryItem }
  | { type: "delete"; category: CategoryItem }
  | null;

function productCountLabel(count: number) {
  if (count === 0) return "Nenhum produto";
  return count === 1 ? "1 produto" : `${count} produtos`;
}

/**
 * Categorias da loja: arrastar para reordenar, ligar e desligar, renomear e
 * excluir. Cada mudança grava na hora; a lista muda antes da resposta e volta
 * ao estado anterior se o servidor recusar.
 */
export function CategoryList({
  categories,
  actions,
}: {
  categories: CategoryItem[];
  actions: CategoryActions;
}) {
  const [items, setItems] = useState(categories);
  const [source, setSource] = useState(categories);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [, startTransition] = useTransition();

  // Dados novos do servidor (depois de salvar) substituem o estado local.
  if (source !== categories) {
    setSource(categories);
    setItems(categories);
  }

  function optimistic(
    next: CategoryItem[],
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

  function toggle(
    category: CategoryItem,
    isAvailable: boolean,
  ) {
    optimistic(
      items.map((item) =>
        item.id === category.id
          ? { ...item, isAvailable }
          : item,
      ),
      () =>
        actions.setAvailability(category.id, isAvailable),
    );
  }

  function reorder(next: CategoryItem[]) {
    optimistic(next, () =>
      actions.reorder(next.map((item) => item.id)),
    );
  }

  const newCategoryButton = (
    <Button onClick={() => setDialog({ type: "create" })}>
      <Plus aria-hidden />
      Nova categoria
    </Button>
  );

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center">
          <p className="text-[15px] text-muted-foreground">
            Nenhuma categoria ainda. Crie a primeira para
            começar a montar o cardápio.
          </p>
          {newCategoryButton}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SortableList
            items={items}
            onReorder={reorder}
            className="divide-y"
            handleLabel={(category) =>
              `Mover ${category.name}`
            }
            renderItem={(category, dragHandle) => (
              <div className="flex min-h-16 items-center gap-2 py-2 pr-2 pl-1 sm:pr-4">
                {dragHandle}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      "truncate text-[15px] font-semibold",
                      !category.isAvailable &&
                        "text-muted-foreground",
                    )}
                  >
                    {category.name}
                  </span>
                  <span className="tabular text-[13px] text-muted-foreground">
                    {productCountLabel(
                      category.productCount,
                    )}
                    {category.isAvailable
                      ? ""
                      : " · fora do cardápio"}
                  </span>
                </div>
                <Switch
                  checked={category.isAvailable}
                  onCheckedChange={(checked) =>
                    toggle(category, checked)
                  }
                  aria-label={
                    category.isAvailable
                      ? `Tirar ${category.name} do cardápio`
                      : `Mostrar ${category.name} no cardápio`
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Renomear ${category.name}`}
                  onClick={() =>
                    setDialog({ type: "rename", category })
                  }
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${category.name}`}
                  onClick={() =>
                    setDialog({ type: "delete", category })
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            )}
          />
          <div className="border-t p-2">
            <Button
              variant="ghost"
              onClick={() => setDialog({ type: "create" })}
            >
              <Plus aria-hidden />
              Nova categoria
            </Button>
          </div>
        </div>
      )}

      <NameDialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Nova categoria"
        label="Nome da categoria"
        placeholder="Ex.: Porções"
        submitLabel="Criar categoria"
        onSubmit={async (name) => {
          const result = await actions.create(name);
          if (!result.ok) return result.error;
          toast.success("Categoria criada");
          return null;
        }}
      />

      <NameDialog
        open={dialog?.type === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Renomear categoria"
        label="Nome da categoria"
        initialValue={
          dialog?.type === "rename"
            ? dialog.category.name
            : ""
        }
        submitLabel="Salvar"
        onSubmit={async (name) => {
          if (dialog?.type !== "rename") return null;
          const result = await actions.rename(
            dialog.category.id,
            name,
          );
          if (!result.ok) return result.error;
          toast.success("Categoria renomeada");
          return null;
        }}
      />

      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={
          dialog?.type === "delete"
            ? `Excluir "${dialog.category.name}"?`
            : "Excluir categoria?"
        }
        description={
          dialog?.type === "delete" &&
          dialog.category.productCount > 0
            ? `Esta categoria tem ${productCountLabel(dialog.category.productCount)}. Mova ou exclua os produtos antes de excluir a categoria.`
            : "A categoria some do painel e do cardápio."
        }
        confirmLabel="Excluir categoria"
        canConfirm={
          dialog?.type !== "delete" ||
          dialog.category.productCount === 0
        }
        onConfirm={async () => {
          if (dialog?.type !== "delete") return null;
          const result = await actions.remove(
            dialog.category.id,
          );
          if (!result.ok) return result.error;
          toast.success("Categoria excluída");
          return null;
        }}
      />
    </>
  );
}
