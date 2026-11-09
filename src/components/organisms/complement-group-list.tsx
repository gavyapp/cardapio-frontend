"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { SortableList } from "@/components/molecules/sortable-list";
import { ComplementGroupEditor } from "@/components/organisms/complement-group-editor";
import type {
  ActionResult,
  ActionResultWith,
} from "@/lib/panel/action-result";
import type {
  ComplementGroupDraft,
  ComplementGroupItem,
  EditableComplementGroup,
} from "@/lib/catalog/types";
import {
  GROUP_PARAM,
  NEW_ITEM,
} from "@/lib/catalog/params";
import { describeGroupRule } from "@/lib/catalog/complement-rules";
import { formatCurrency, pluralize } from "@/lib/format";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";
import { useSearchParamState } from "@/lib/hooks/use-search-param-state";
import { cn } from "@/lib/utils";

export type ComplementGroupActions = {
  save: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
  setOptionAvailability: (
    optionId: string,
    isAvailable: boolean,
  ) => Promise<ActionResult>;
  reorder: (orderedIds: string[]) => Promise<ActionResult>;
  remove: (groupId: string) => Promise<ActionResult>;
};

function toEditable(
  group: ComplementGroupItem,
): EditableComplementGroup {
  return { ...group, usedByCount: group.usedBy.length };
}

/** Aviso quando nenhuma opção do grupo está disponível. */
function unavailableWarning(group: ComplementGroupItem) {
  if (group.options.some((option) => option.isAvailable)) {
    return null;
  }
  return group.minSelect > 0
    ? "Nenhuma opção disponível: os produtos com este grupo não podem ser pedidos."
    : "Nenhuma opção disponível: o grupo não aparece para o cliente.";
}

/**
 * Grupos de complementos: arrastar para reordenar, abrir para ver e pausar
 * opções, ver onde o grupo é usado, editar e excluir.
 */
export function ComplementGroupList({
  groups,
  actions,
}: {
  groups: ComplementGroupItem[];
  actions: ComplementGroupActions;
}) {
  const { items, optimistic } = useOptimisticList(groups);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(),
  );
  const [showUsage, setShowUsage] = useState<Set<string>>(
    () => new Set(),
  );
  // "?grupo=novo" ou "?grupo=<id>" abre o editor.
  const [editingParam, setEditingParam] =
    useSearchParamState(GROUP_PARAM);
  const editingGroup = items.find(
    (group) => group.id === editingParam,
  );
  const editing: EditableComplementGroup | "new" | null =
    editingParam === NEW_ITEM
      ? "new"
      : editingGroup
        ? toEditable(editingGroup)
        : null;
  const [deleting, setDeleting] =
    useState<ComplementGroupItem | null>(null);

  function toggleIn(
    set: Set<string>,
    update: (next: Set<string>) => void,
    id: string,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  }

  function toggleOption(
    groupId: string,
    optionId: string,
    isAvailable: boolean,
  ) {
    optimistic(
      items.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              options: group.options.map((option) =>
                option.id === optionId
                  ? { ...option, isAvailable }
                  : option,
              ),
            },
      ),
      () =>
        actions.setOptionAvailability(
          optionId,
          isAvailable,
        ),
    );
  }

  return (
    <>
      <p className="rounded-surface border bg-card px-4 py-3 text-meta text-muted-foreground sm:px-6">
        Os grupos são compartilhados. O que mudar aqui vale
        para todos os produtos que usam o grupo. Para ligar
        um grupo a um produto, abra o produto.
      </p>

      {items.length === 0 ? (
        <div className="rounded-surface border bg-card px-6 py-12 text-center text-body text-muted-foreground">
          Nenhum grupo ainda. Crie grupos como &quot;Ponto
          da carne&quot; ou &quot;Adicionais&quot; e ligue
          aos produtos.
        </div>
      ) : (
        <SortableList
          items={items}
          onReorder={(next) =>
            optimistic(next, () =>
              actions.reorder(
                next.map((group) => group.id),
              ),
            )
          }
          handleLabel={(group) => `Mover ${group.name}`}
          className="flex flex-col gap-4"
          itemClassName="rounded-surface"
          renderItem={(group, dragHandle) => {
            const isOpen = expanded.has(group.id);
            const warning = unavailableWarning(group);
            const usedCount = group.usedBy.length;
            return (
              <div className="overflow-hidden rounded-surface border">
                <div className="flex min-h-16 items-center gap-2 py-2 pr-2 pl-1 sm:pr-4">
                  {dragHandle}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      toggleIn(
                        expanded,
                        setExpanded,
                        group.id,
                      )
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-control py-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        !isOpen && "-rotate-90",
                      )}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
                      <span className="truncate text-body font-semibold">
                        {group.name}
                      </span>
                      <span className="text-meta text-muted-foreground">
                        {describeGroupRule(
                          group.minSelect,
                          group.maxSelect,
                        )}
                        {" · "}
                        {pluralize(
                          group.options.length,
                          "opção",
                          "opções",
                        )}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex"
                    aria-expanded={showUsage.has(group.id)}
                    disabled={usedCount === 0}
                    onClick={() =>
                      toggleIn(
                        showUsage,
                        setShowUsage,
                        group.id,
                      )
                    }
                  >
                    {usedCount === 0
                      ? "Não usado"
                      : `Usado em ${pluralize(usedCount, "produto", "produtos")}`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingParam(group.id)
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${group.name}`}
                    onClick={() => setDeleting(group)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>

                {showUsage.has(group.id) &&
                usedCount > 0 ? (
                  <p className="border-t px-4 py-3 text-meta text-muted-foreground">
                    Usado em:{" "}
                    {group.usedBy
                      .map((product) => product.name)
                      .join(", ")}
                  </p>
                ) : null}

                {warning ? (
                  <p className="border-t bg-destructive-soft px-4 py-3 text-meta text-destructive">
                    {warning}
                  </p>
                ) : null}

                {isOpen ? (
                  <div className="border-t">
                    <p className="px-4 pt-3 text-meta text-muted-foreground sm:hidden">
                      {usedCount === 0
                        ? "Não usado em produtos"
                        : `Usado em: ${group.usedBy.map((product) => product.name).join(", ")}`}
                    </p>
                    <ul className="divide-y">
                      {group.options.map((option) => (
                        <li
                          key={option.id}
                          className="flex min-h-12 items-center gap-4 px-4 py-2"
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-body",
                              !option.isAvailable &&
                                "text-muted-foreground",
                            )}
                          >
                            {option.name}
                            {option.isAvailable
                              ? ""
                              : " · pausada"}
                          </span>
                          <span className="tabular text-body text-muted-foreground">
                            {option.price > 0
                              ? `+ ${formatCurrency(option.price)}`
                              : "Sem custo"}
                          </span>
                          <Switch
                            checked={option.isAvailable}
                            onCheckedChange={(checked) =>
                              toggleOption(
                                group.id,
                                option.id,
                                checked,
                              )
                            }
                            aria-label={
                              option.isAvailable
                                ? `Pausar ${option.name}`
                                : `Voltar ${option.name}`
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      )}

      <ComplementGroupEditor
        open={editing !== null}
        onOpenChange={(open) =>
          !open && setEditingParam(null)
        }
        group={editing === "new" ? null : editing}
        onSave={async (draft) => {
          const result = await actions.save(draft);
          if (result.ok) {
            toast.success(
              draft.id
                ? "Grupo atualizado"
                : "Grupo criado",
            );
          }
          return result;
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={
          deleting
            ? `Excluir "${deleting.name}"?`
            : "Excluir grupo?"
        }
        description={
          deleting && deleting.usedBy.length > 0
            ? `O grupo sai de ${pluralize(deleting.usedBy.length, "produto", "produtos")}: ${deleting.usedBy.map((product) => product.name).join(", ")}. Pedidos já feitos não mudam.`
            : "O grupo e as opções somem do painel. Pedidos já feitos não mudam."
        }
        confirmLabel="Excluir grupo"
        onConfirm={async () => {
          if (!deleting) return null;
          const result = await actions.remove(deleting.id);
          if (!result.ok) return result.error;
          toast.success("Grupo excluído");
          return null;
        }}
      />
    </>
  );
}
