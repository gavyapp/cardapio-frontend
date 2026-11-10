"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { NameDialog } from "@/components/molecules/name-dialog";
import { SortableList } from "@/components/molecules/sortable-list";
import type {
  ActionResult,
  ActionResultWith,
} from "@/lib/panel/action-result";
import type { CategoryItem } from "@/lib/catalog/types";
import { pluralize } from "@/lib/format";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";
import { cn } from "@/lib/utils";

export type CategoryActions = {
  create: (
    name: string,
  ) => Promise<ActionResultWith<string>>;
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
  return count === 0
    ? "Nenhum produto"
    : pluralize(count, "produto", "produtos");
}

/**
 * Categorias da loja em cartões: arrastar para reordenar, ativar e pausar,
 * renomear e excluir. Cada mudança grava na hora; a lista muda antes da
 * resposta e volta ao estado anterior se o servidor recusar. Com
 * renderContent, o cartão abre e fecha e mostra esse conteúdo (os produtos
 * da categoria, na tela de produtos).
 */
export function CategoryList({
  categories,
  actions,
  renderContent,
}: {
  categories: CategoryItem[];
  actions: CategoryActions;
  renderContent?: (category: CategoryItem) => ReactNode;
}) {
  const { items, optimistic } =
    useOptimisticList(categories);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Só a primeira categoria começa aberta.
  const [expanded, setExpanded] = useState<
    Record<string, boolean>
  >(() =>
    categories[0] ? { [categories[0].id]: true } : {},
  );

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
      isAvailable
        ? `"${category.name}" voltou para o cardápio`
        : `"${category.name}" pausada: sai do cardápio até ser reativada`,
    );
  }

  function reorder(next: CategoryItem[]) {
    optimistic(next, () =>
      actions.reorder(next.map((item) => item.id)),
    );
  }

  function renderHeader(
    category: CategoryItem,
    dragHandle: ReactNode,
    isOpen: boolean,
  ) {
    const title = (
      <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span
          className={cn(
            "truncate text-body font-semibold",
            !category.isAvailable &&
              "text-muted-foreground",
          )}
        >
          {category.name}
        </span>
        <span className="tabular text-support text-muted-foreground">
          {productCountLabel(category.productCount)}
          {category.isAvailable
            ? ""
            : " · fora do cardápio"}
        </span>
      </span>
    );

    return (
      <div
        className={cn(
          "flex min-h-16 items-center gap-2 py-2 pr-3 pl-1 sm:pr-6",
          isOpen && "border-b",
        )}
      >
        {dragHandle}
        {renderContent ? (
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() =>
              setExpanded((current) => ({
                ...current,
                [category.id]: !isOpen,
              }))
            }
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-control text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                isOpen && "rotate-90",
              )}
            />
            {title}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{title}</div>
        )}
        <span
          className={cn(
            "hidden text-support sm:inline",
            !category.isAvailable &&
              "text-muted-foreground",
          )}
        >
          {category.isAvailable ? "Ativa" : "Pausada"}
        </span>
        <Switch
          checked={category.isAvailable}
          onCheckedChange={(checked) =>
            toggle(category, checked)
          }
          aria-label={
            category.isAvailable
              ? `Pausar ${category.name}`
              : `Ativar ${category.name}`
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 text-muted-foreground"
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
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Excluir ${category.name}`}
          onClick={() =>
            setDialog({ type: "delete", category })
          }
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-body text-muted-foreground">
            Nenhuma categoria ainda. Crie a primeira para
            começar a montar o cardápio.
          </p>
        ) : (
          <SortableList
            items={items}
            onReorder={reorder}
            className="flex flex-col gap-4"
            itemClassName="rounded-surface border"
            handleLabel={(category) =>
              `Mover ${category.name}`
            }
            renderItem={(category, dragHandle) => {
              const isOpen =
                !!renderContent && !!expanded[category.id];
              return (
                <>
                  {renderHeader(
                    category,
                    dragHandle,
                    isOpen,
                  )}
                  {isOpen ? renderContent(category) : null}
                </>
              );
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className="flex min-h-14 w-full items-center justify-center rounded-surface border border-dashed border-input text-body font-medium outline-none hover:border-muted-foreground hover:bg-card focus-visible:ring-1 focus-visible:ring-foreground"
        >
          + Nova categoria
        </button>
      </div>

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
