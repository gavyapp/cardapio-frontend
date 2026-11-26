"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { FilterChips } from "@/components/molecules/filter-chips";
import {
  PromotionEditor,
  type PromotionProductOption,
} from "@/components/organisms/promotion-editor";
import { NEW_ITEM } from "@/lib/catalog/params";
import { pluralize } from "@/lib/format";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";
import { useSearchParamState } from "@/lib/hooks/use-search-param-state";
import type {
  ActionResult,
  ActionResultWith,
} from "@/lib/panel/action-result";
import {
  describeRule,
  describeSchedule,
  PROMOTION_KIND_LABEL,
} from "@/lib/promotions/describe";
import {
  PROMOTION_PARAM,
  type EditablePromotion,
  type PromotionDraft,
} from "@/lib/promotions/draft";
import {
  heldProducts,
  promotionStatus,
  PROMOTION_STATUS_LABEL,
  type PromotionStatus,
} from "@/lib/promotions/status";
import { cn } from "@/lib/utils";

export type PromotionItem = EditablePromotion & {
  /** Pedidos com a promoção nos últimos 7 dias. */
  recentOrderCount: number;
};

export type PromotionActions = {
  save: (
    draft: PromotionDraft,
  ) => Promise<ActionResultWith<string>>;
  setActive: (
    promotionId: string,
    isActive: boolean,
  ) => Promise<ActionResult>;
  duplicate: (
    promotionId: string,
  ) => Promise<ActionResultWith<string>>;
  remove: (promotionId: string) => Promise<ActionResult>;
};

type Filter = "all" | PromotionStatus;

const FILTERS: [Filter, string][] = [
  ["all", "Todas"],
  ["active", "Ativa agora"],
  ["scheduled", "Agendadas"],
  ["paused", "Pausadas"],
  ["ended", "Encerradas"],
];

const STATUS_BADGE = {
  active: "success",
  scheduled: "neutral",
  paused: "muted",
  ended: "muted",
} as const;

// Promoção, quando vale, status, pedidos, ativa, duplicar. No celular,
// promoção e o botão de ativar.
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-4 lg:grid-cols-[minmax(0,1fr)_168px_120px_120px_56px_96px]";

/**
 * Tela de promoções: a lista com filtro por status, o botão de ligar e
 * desligar e o atalho de duplicar em cada linha. Clicar na linha abre o
 * editor lateral; "Nova promoção" do cabeçalho abre o editor vazio.
 */
export function PromotionList({
  promotions,
  products,
  now: nowIso,
  actions,
}: {
  promotions: PromotionItem[];
  products: PromotionProductOption[];
  /** Momento da página, para o status sair igual no servidor e no navegador. */
  now: string;
  actions: PromotionActions;
}) {
  const now = new Date(nowIso);
  const { items, optimistic } =
    useOptimisticList(promotions);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] =
    useState<EditablePromotion | null>(null);
  const [editorParam, setEditorParam] =
    useSearchParamState(PROMOTION_PARAM);
  const [, startTransition] = useTransition();

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const withStatus = items.map((promotion) => ({
    promotion,
    status: promotionStatus(promotion, now),
  }));
  const visible = withStatus.filter(
    ({ status }) => filter === "all" || status === filter,
  );
  const activeCount = withStatus.filter(
    ({ status }) => status === "active",
  ).length;

  const editing =
    items.find((item) => item.id === editorParam) ?? null;
  const editorOpen = editorParam === NEW_ITEM || !!editing;

  function productsOf(promotion: PromotionItem) {
    return promotion.productIds.flatMap((id) => {
      const product = productsById.get(id);
      return product ? [product] : [];
    });
  }

  function toggle(
    promotion: PromotionItem,
    isActive: boolean,
  ) {
    if (isActive && promotion.kind === "product_discount") {
      // Mesmo aviso do servidor, sem esperar a resposta.
      const held = heldProducts(items, now, promotion.id);
      const taken = productsOf(promotion).find((product) =>
        held.has(product.id),
      );
      if (taken) {
        toast.error(
          `${taken.name} já está em "${held.get(taken.id)}". Pause aquela promoção antes.`,
        );
        return;
      }
    }
    optimistic(
      items.map((item) =>
        item.id === promotion.id
          ? { ...item, isActive }
          : item,
      ),
      () => actions.setActive(promotion.id, isActive),
      isActive ? "Promoção reativada" : "Promoção pausada",
    );
  }

  function duplicate(promotion: { id: string }) {
    setEditorParam(null);
    startTransition(async () => {
      const result = await actions.duplicate(promotion.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Cópia criada e pausada. Ajuste e reative quando quiser.",
      );
      // A cópia abre no editor assim que chega do servidor.
      setEditorParam(result.data);
    });
  }

  return (
    <>
      <section
        aria-labelledby="promocoes-titulo"
        className="overflow-hidden rounded-surface border bg-card"
      >
        <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-3 lg:px-6">
          <div className="mr-auto flex min-w-0 flex-col gap-0.5">
            <h2
              id="promocoes-titulo"
              className="text-body leading-tight font-semibold"
            >
              Promoções cadastradas
            </h2>
            <p className="tabular text-caption text-muted-foreground">
              {activeCount === 1
                ? "1 ativa agora"
                : `${activeCount} ativas agora`}
            </p>
          </div>
          <FilterChips
            chips={FILTERS.map(([id, label]) => ({
              id,
              label,
              count:
                id === "all"
                  ? withStatus.length
                  : withStatus.filter(
                      ({ status }) => status === id,
                    ).length,
            }))}
            value={filter}
            onChange={setFilter}
          />
        </header>

        <div
          aria-hidden
          className={cn(
            ROW_GRID,
            "hidden h-10 border-b px-4 text-caption font-medium text-muted-foreground lg:grid lg:px-6",
          )}
        >
          <span>Promoção</span>
          <span>Quando vale</span>
          <span>Status</span>
          <span className="text-right">
            Pedidos (7 dias)
          </span>
          <span>Ativa</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-4 text-support text-muted-foreground lg:px-6">
            {items.length
              ? "Nenhuma promoção com este status."
              : "Nenhuma promoção ainda."}
          </p>
        ) : (
          <ul className="-mb-px flex flex-col">
            {visible.map(({ promotion, status }) => {
              const when = describeSchedule(
                promotion.schedule,
              );
              const live =
                status === "active" ||
                status === "scheduled";
              const open = () =>
                setEditorParam(promotion.id);
              return (
                <li
                  key={promotion.id}
                  onClick={open}
                  className={cn(
                    ROW_GRID,
                    "min-h-14 cursor-pointer border-b px-4 py-2 hover:bg-muted/40 lg:px-6",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-w-0 flex-col gap-0.5 leading-tight",
                      !live && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        open();
                      }}
                      className="w-fit rounded-control text-left text-body font-medium outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                    >
                      {promotion.name}
                    </button>
                    <span className="text-support text-muted-foreground">
                      {PROMOTION_KIND_LABEL[promotion.kind]}{" "}
                      ·{" "}
                      {describeRule(
                        promotion,
                        productsOf(promotion),
                      )}
                    </span>
                    <span className="text-support text-muted-foreground lg:hidden">
                      {when} ·{" "}
                      {pluralize(
                        promotion.recentOrderCount,
                        "pedido",
                        "pedidos",
                      )}{" "}
                      em 7 dias
                    </span>
                    <span className="pt-1 lg:hidden">
                      <Badge variant={STATUS_BADGE[status]}>
                        {PROMOTION_STATUS_LABEL[status]}
                      </Badge>
                    </span>
                  </div>
                  <span
                    className={cn(
                      "hidden text-support lg:block",
                      !live && "opacity-60",
                    )}
                  >
                    {when}
                  </span>
                  <span
                    className={cn(
                      "hidden lg:block",
                      !live && "opacity-60",
                    )}
                  >
                    <Badge variant={STATUS_BADGE[status]}>
                      {PROMOTION_STATUS_LABEL[status]}
                    </Badge>
                  </span>
                  <span
                    className={cn(
                      "tabular hidden text-right text-body lg:block",
                      !live && "opacity-60",
                    )}
                  >
                    {promotion.recentOrderCount}
                  </span>
                  <span
                    className="flex h-11 items-center"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <Switch
                      checked={promotion.isActive}
                      onCheckedChange={(checked) =>
                        toggle(promotion, checked)
                      }
                      aria-label={
                        promotion.isActive
                          ? `Pausar ${promotion.name}`
                          : `Reativar ${promotion.name}`
                      }
                    />
                  </span>
                  <span
                    className="hidden lg:block"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicate(promotion)}
                    >
                      Duplicar
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PromotionEditor
        open={editorOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setEditorParam(null)
        }
        promotion={editing}
        promotions={items}
        products={products}
        now={now}
        onSave={actions.save}
        onDuplicate={duplicate}
        onDelete={(promotion) => {
          setEditorParam(null);
          setDeleting(promotion);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleting(null)
        }
        title={
          deleting
            ? `Excluir "${deleting.name}"?`
            : "Excluir promoção?"
        }
        description="A promoção sai do painel e do cardápio. Pedidos já feitos não mudam."
        confirmLabel="Excluir promoção"
        onConfirm={async () => {
          if (!deleting) return null;
          const result = await actions.remove(deleting.id);
          if (!result.ok) return result.error;
          toast.success("Promoção excluída");
          return null;
        }}
      />
    </>
  );
}
