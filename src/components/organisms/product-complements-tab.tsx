"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { EditorCard } from "@/components/molecules/editor-card";
import { SortableList } from "@/components/molecules/sortable-list";
import type { ComplementGroupItem } from "@/lib/catalog/types";
import {
  describeChoiceRule,
  describeGroupOptions,
  isBlockingGroup,
  isRequiredGroup,
} from "@/lib/catalog/complement-rules";
import { normalizeSearch, pluralize } from "@/lib/format";

/**
 * Aba Complementos do editor: os grupos do produto, na ordem em que o
 * cliente vê, e a lista dos outros grupos da loja para adicionar.
 */
export function ProductComplementsTab({
  groups,
  value,
  onChange,
  onEditGroup,
}: {
  /** Todos os grupos da loja. */
  groups: ComplementGroupItem[];
  /** Ids dos grupos ligados ao produto, em ordem. */
  value: string[];
  onChange: (groupIds: string[]) => void;
  /** Abre o editor de grupo; "new" cria um grupo. */
  onEditGroup: (group: ComplementGroupItem | "new") => void;
}) {
  const [query, setQuery] = useState("");
  const search = normalizeSearch(query);

  const groupsById = new Map(
    groups.map((group) => [group.id, group]),
  );
  const linked = value.flatMap((id) => {
    const group = groupsById.get(id);
    return group ? [group] : [];
  });
  const pickable = groups.filter(
    (group) =>
      !value.includes(group.id) &&
      (!search ||
        normalizeSearch(
          [
            group.name,
            ...group.options.map((o) => o.name),
          ].join(" "),
        ).includes(search)),
  );

  return (
    <>
      <EditorCard
        title={
          <>
            Neste produto
            <span className="tabular ml-2 text-[13px] font-normal text-muted-foreground">
              {linked.length}
            </span>
          </>
        }
        description={
          linked.length > 0
            ? "O cliente vê nesta ordem. Arraste pela alça para mudar."
            : "Nenhum complemento ainda. Sem complementos, o produto vai direto para o carrinho."
        }
      >
        {linked.length > 0 ? (
          <SortableList
            items={linked}
            onReorder={(reordered) =>
              onChange(reordered.map((group) => group.id))
            }
            handleLabel={(group) => `Mover ${group.name}`}
            className="flex flex-col"
            itemClassName="border-b last:border-b-0"
            renderItem={(group, dragHandle) => (
              <div className="flex items-start gap-1 py-3 pr-4 pl-1 sm:pr-6">
                {dragHandle}
                <span className="tabular mt-2.5 mr-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {linked.indexOf(group) + 1}
                </span>
                <GroupSummary group={group} />
                <div className="flex shrink-0 items-center gap-1 pt-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="bg-card"
                    aria-label={`Editar ${group.name}`}
                    title="Editar"
                    onClick={() => onEditGroup(group)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Tirar ${group.name} do produto`}
                    onClick={() =>
                      onChange(
                        value.filter(
                          (id) => id !== group.id,
                        ),
                      )
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          />
        ) : null}
      </EditorCard>

      <EditorCard
        title="Adicionar complemento"
        description="Use um grupo que você já criou ou crie um novo."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Buscar grupo ou opção"
              placeholder="Buscar grupo ou opção"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
            />
            <Button
              type="button"
              className="h-11 shrink-0"
              onClick={() => onEditGroup("new")}
            >
              <Plus aria-hidden />
              Criar grupo novo
            </Button>
          </div>
        }
      >
        {pickable.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-muted-foreground sm:px-6">
            {search
              ? `Nenhum grupo encontrado para "${query.trim()}".`
              : groups.length === 0
                ? "Nenhum grupo criado ainda."
                : "Todos os grupos já estão neste produto."}
          </p>
        ) : (
          <ul className="flex flex-col">
            {pickable.map((group) => (
              <li
                key={group.id}
                className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 sm:px-6"
              >
                <GroupSummary
                  group={group}
                  usedByCount={group.usedBy.length}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="mt-1.5 shrink-0 bg-card"
                  aria-label={`Adicionar ${group.name} ao produto`}
                  title="Adicionar"
                  onClick={() =>
                    onChange([...value, group.id])
                  }
                >
                  <Plus aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </EditorCard>
    </>
  );
}

/** Nome, tipo, regra e opções de um grupo, como no protótipo. */
function GroupSummary({
  group,
  usedByCount,
}: {
  group: ComplementGroupItem;
  /** Na lista para adicionar: em quantos produtos o grupo está. */
  usedByCount?: number;
}) {
  const required = isRequiredGroup(group.minSelect);
  const isLinked = usedByCount === undefined;
  const details = [
    required ? "Obrigatório" : "Opcional",
    describeChoiceRule(group.minSelect, group.maxSelect),
    pluralize(group.options.length, "opção", "opções"),
    ...(isLinked
      ? []
      : [
          usedByCount === 0
            ? "sem produtos"
            : `usado em ${pluralize(usedByCount, "produto", "produtos")}`,
        ]),
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 leading-tight">
      <span className="text-[15px] font-semibold">
        {group.name}
      </span>
      <span className="text-[13px]">
        {details.join(" · ")}
      </span>
      <span className="line-clamp-2 text-[13px] text-muted-foreground">
        {describeGroupOptions(group.options)}
      </span>
      {isLinked && isBlockingGroup(group) ? (
        <span className="text-[13px] text-destructive">
          Todas as opções estão pausadas: o produto não vai
          poder ser pedido.
        </span>
      ) : null}
    </div>
  );
}
