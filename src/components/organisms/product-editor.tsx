"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/atoms/sheet";
import { ComplementGroupEditor } from "@/components/organisms/complement-group-editor";
import {
  ProductCategoryTab,
  type CategoryOption,
} from "@/components/organisms/product-category-tab";
import { ProductComplementsTab } from "@/components/organisms/product-complements-tab";
import {
  ProductDetailsTab,
  type ProductDetailsValues,
} from "@/components/organisms/product-details-tab";
import type { ActionResultWith } from "@/lib/panel/action-result";
import type {
  ComplementGroupDraft,
  ComplementGroupItem,
  EditableProduct,
  ProductDraft,
} from "@/lib/catalog/types";
import { focusFirstInvalid } from "@/lib/panel/focus-first-invalid";
import {
  formatAmountInput,
  parseAmountInput,
} from "@/lib/format";
import { PRODUCT_BADGES } from "@/lib/catalog/product-fields";
import { useExitSnapshot } from "@/lib/hooks/use-exit-snapshot";
import { cn } from "@/lib/utils";

const STEPS = [
  "Produto",
  "Categoria",
  "Complementos",
] as const;
type Step = 0 | 1 | 2;

type ProductForm = ProductDetailsValues & {
  categoryId: string;
  groupIds: string[];
};

type FieldErrors = {
  name?: string;
  price?: string;
  category?: string;
};

/**
 * Painel lateral para criar ou editar produto, em três abas: Produto
 * (informações, foto, selos e sugestão no carrinho), Categoria e
 * Complementos. Produto novo passa pelas abas em ordem, como um passo a
 * passo; produto existente vai direto para qualquer aba.
 */
export function ProductEditor({
  open,
  onOpenChange,
  product,
  defaultCategoryId,
  ...formProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null cria um produto novo. */
  product: EditableProduct | null;
  defaultCategoryId?: string;
} & Omit<
  EditorFormProps,
  "product" | "defaultCategoryId" | "onClose"
>) {
  const shown = useExitSnapshot(
    open,
    useMemo(
      () => ({ product, defaultCategoryId }),
      [product, defaultCategoryId],
    ),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={shown.onOpenChangeComplete}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        {shown.isMounted ? (
          <EditorForm
            key={
              shown.value.product?.id ??
              `new-${shown.value.defaultCategoryId ?? ""}`
            }
            product={shown.value.product}
            defaultCategoryId={
              shown.value.defaultCategoryId
            }
            onClose={() => onOpenChange(false)}
            {...formProps}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type EditorFormProps = {
  product: EditableProduct | null;
  defaultCategoryId?: string;
  storeId: string;
  categories: CategoryOption[];
  groups: ComplementGroupItem[];
  onSave: (
    draft: ProductDraft,
  ) => Promise<ActionResultWith<string>>;
  onCreateCategory: (
    name: string,
  ) => Promise<ActionResultWith<string>>;
  onSaveGroup: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
  onDuplicate: (product: EditableProduct) => void;
  onDelete: (product: EditableProduct) => void;
  onClose: () => void;
};

function initialForm(
  product: EditableProduct | null,
  defaultCategoryId: string | undefined,
  categories: CategoryOption[],
): ProductForm {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? formatAmountInput(product.price) : "",
    hasPhoto: product ? product.imageUrl !== null : true,
    imageUrl: product?.imageUrl ?? null,
    badges: product?.badges ?? [],
    isSuggested: product?.isSuggested ?? false,
    categoryId:
      product?.categoryId ??
      defaultCategoryId ??
      categories[0]?.id ??
      "",
    groupIds: product?.groupIds ?? [],
  };
}

function EditorForm({
  product,
  defaultCategoryId,
  storeId,
  categories,
  groups,
  onSave,
  onCreateCategory,
  onSaveGroup,
  onDuplicate,
  onDelete,
  onClose,
}: EditorFormProps) {
  const isWizard = product === null;
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState(() =>
    initialForm(product, defaultCategoryId, categories),
  );
  // Categoria criada aqui aparece antes de a lista do servidor chegar.
  const [createdCategories, setCreatedCategories] =
    useState<CategoryOption[]>([]);
  const [groupEditor, setGroupEditor] = useState<
    ComplementGroupItem | "new" | null
  >(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const allCategories = [
    ...categories,
    ...createdCategories.filter(
      (created) =>
        !categories.some(
          (category) => category.id === created.id,
        ),
    ),
  ];

  /** Muda campos do formulário e apaga o erro de quem mudou. */
  function update(changes: Partial<ProductForm>) {
    setForm((current) => ({ ...current, ...changes }));
    setErrors((current) => ({
      name: "name" in changes ? undefined : current.name,
      price: "price" in changes ? undefined : current.price,
      category:
        "categoryId" in changes
          ? undefined
          : current.category,
    }));
  }

  function goTo(next: Step) {
    setStep(next);
  }

  /**
   * Confere os campos até a aba indicada e leva para a primeira aba com
   * erro. Devolve true se está tudo certo.
   */
  function validate(upTo: Step): boolean {
    const found: FieldErrors = {};
    if (!form.name.trim())
      found.name = "Dê um nome ao produto.";
    if (parseAmountInput(form.price) === null) {
      found.price = "Informe um preço válido.";
    }
    if (upTo >= 1 && !form.categoryId) {
      found.category =
        "Escolha uma categoria para salvar o produto.";
    }
    setErrors(found);
    if (found.name || found.price) {
      goTo(0);
      focusFirstInvalid(formRef.current);
      return false;
    }
    if (found.category) {
      goTo(1);
      return false;
    }
    return true;
  }

  function submit() {
    setError(null);
    if (!validate(1)) return;
    startTransition(async () => {
      const result = await onSave({
        id: product?.id,
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        price: parseAmountInput(form.price) ?? 0,
        imageUrl: form.hasPhoto ? form.imageUrl : null,
        // Mantém a ordem da lista oficial, não a do clique.
        badges: PRODUCT_BADGES.filter((badge) =>
          form.badges.includes(badge),
        ),
        isAvailable: product?.isAvailable ?? true,
        isSuggested: form.isSuggested,
        groupIds: form.groupIds,
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (isWizard && step < 2) {
          if (validate(step)) goTo((step + 1) as Step);
        } else {
          submit();
        }
      }}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b py-2 pr-4 pl-6">
        <SheetTitle className="mr-auto min-w-0 truncate text-section font-semibold">
          {product
            ? `Editar produto · ${product.name}`
            : "Novo produto"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Informações, categoria e complementos do produto.
        </SheetDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-6 [&>*]:shrink-0">
        <nav
          aria-label="Etapas do produto"
          className="flex shrink-0 gap-2 overflow-x-auto rounded-surface border bg-card px-2"
        >
          {STEPS.map((label, index) => {
            const active = step === index;
            const done = isWizard && index < step;
            const reachable = !isWizard || index <= step;
            return (
              <button
                key={label}
                type="button"
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => goTo(index as Step)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 px-2 text-body whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground",
                  active &&
                    "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--color-foreground)]",
                )}
              >
                {isWizard ? (
                  <span
                    className={cn(
                      "tabular flex size-6 items-center justify-center rounded-full border-[1.5px] text-caption font-semibold",
                      active || done
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card",
                    )}
                  >
                    {done ? (
                      <Check
                        aria-hidden
                        className="size-3.5"
                      />
                    ) : (
                      index + 1
                    )}
                  </span>
                ) : null}
                {label}
              </button>
            );
          })}
        </nav>

        {step === 0 ? (
          <ProductDetailsTab
            storeId={storeId}
            values={form}
            isAvailable={product?.isAvailable ?? true}
            errors={errors}
            onChange={update}
          />
        ) : null}

        {step === 1 ? (
          <ProductCategoryTab
            categories={allCategories}
            value={form.categoryId}
            savedCategoryId={product?.categoryId}
            error={errors.category}
            onChange={(categoryId) =>
              update({ categoryId })
            }
            onCreate={onCreateCategory}
            onCreated={(category) => {
              setCreatedCategories((current) => [
                ...current,
                category,
              ]);
              update({ categoryId: category.id });
            }}
          />
        ) : null}

        {step === 2 ? (
          <ProductComplementsTab
            groups={groups}
            value={form.groupIds}
            onChange={(groupIds) => update({ groupIds })}
            onEditGroup={setGroupEditor}
          />
        ) : null}

        {error ? (
          <p
            role="alert"
            className="text-meta text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-4 sm:px-6">
        {product ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(product)}
            >
              Excluir
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDuplicate(product)}
            >
              Duplicar produto
            </Button>
          </div>
        ) : null}
        {/* Cancelar e Salvar ficam sempre juntos, à direita. */}
        <div className="ml-auto flex gap-2">
          {isWizard && step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo((step - 1) as Step)}
            >
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Salvando…"
              : !isWizard
                ? "Salvar"
                : step < 2
                  ? "Continuar"
                  : "Salvar produto"}
          </Button>
        </div>
      </footer>

      <ComplementGroupEditor
        nested
        open={groupEditor !== null}
        onOpenChange={(isOpen) =>
          !isOpen && setGroupEditor(null)
        }
        group={
          groupEditor === "new" || groupEditor === null
            ? null
            : {
                ...groupEditor,
                usedByCount: groupEditor.usedBy.length,
              }
        }
        onSave={async (draft) => {
          const result = await onSaveGroup(draft);
          if (result.ok) {
            if (!draft.id) {
              // Grupo criado daqui já entra no produto.
              setForm((current) => ({
                ...current,
                groupIds: [
                  ...current.groupIds,
                  result.data,
                ],
              }));
            }
            toast.success(
              draft.id
                ? "Grupo atualizado"
                : "Grupo criado",
            );
          }
          return result;
        }}
      />
    </form>
  );
}
