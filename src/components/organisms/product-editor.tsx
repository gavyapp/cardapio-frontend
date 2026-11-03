"use client";

import {
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/atoms/sheet";
import { Switch } from "@/components/atoms/switch";
import { Textarea } from "@/components/atoms/textarea";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { Field } from "@/components/molecules/field";
import { FieldError } from "@/components/molecules/field-error";
import { ImagePicker } from "@/components/molecules/image-picker";
import { SortableList } from "@/components/molecules/sortable-list";
import {
  ComplementGroupEditor,
  type ComplementGroupDraft,
} from "@/components/organisms/complement-group-editor";
import type { ComplementGroupItem } from "@/components/organisms/complement-group-list";
import type { ActionResultWith } from "@/lib/action-result";
import {
  describeChoiceRule,
  isRequiredGroup,
} from "@/lib/complement-rules";
import {
  formatAmountInput,
  parseAmountInput,
} from "@/lib/format";
import {
  PRODUCT_BADGES,
  PRODUCT_DESCRIPTION_LIMIT,
} from "@/lib/product-fields";
import { focusFirstInvalid } from "@/lib/focus-first-invalid";
import { cn } from "@/lib/utils";

export type ProductDraft = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badges: string[];
  isAvailable: boolean;
  isSuggested: boolean;
  groupIds: string[];
};

export type EditableProduct = ProductDraft & { id: string };

export type EditorCategory = {
  id: string;
  name: string;
  productCount: number;
};

const STEPS = [
  "Produto",
  "Categoria",
  "Complementos",
] as const;
type Step = 0 | 1 | 2;

type FieldErrors = {
  name?: string;
  price?: string;
  category?: string;
};

/** "Mal passado · Bacon +R$ 5,00 · Cheddar (pausado)" */
export function describeGroupOptions(
  group: ComplementGroupItem,
) {
  if (group.options.length === 0) return "Sem opções";
  return group.options
    .map(
      (option) =>
        option.name +
        (option.price > 0
          ? ` +${formatAmountInput(option.price)}`
          : "") +
        (option.isAvailable ? "" : " (pausado)"),
    )
    .join(" · ");
}

/** Nome, tipo, regra e opções de um grupo, como no protótipo. */
function GroupSummary({
  group,
  usedByCount,
}: {
  group: ComplementGroupItem;
  /** Mostra em quantos produtos o grupo está (lista para adicionar). */
  usedByCount?: number;
}) {
  const required = isRequiredGroup(group.minSelect);
  const details = [
    describeChoiceRule(group.minSelect, group.maxSelect),
    group.options.length === 1
      ? "1 opção"
      : `${group.options.length} opções`,
  ];
  if (usedByCount !== undefined) {
    details.push(
      usedByCount === 0
        ? "sem produtos"
        : `usado em ${productCountLabel(usedByCount)}`,
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 leading-tight">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[15px] font-semibold">
          {group.name}
        </span>
        <Badge
          variant={required ? "default" : "outline"}
          className={cn(
            "h-5 rounded-md px-1.5 text-[11px] font-semibold",
            required
              ? "bg-foreground text-background"
              : "border-transparent bg-muted text-muted-foreground",
          )}
        >
          {required ? "Obrigatório" : "Opcional"}
        </Badge>
      </div>
      <span className="text-[13px]">
        {details.join(" · ")}
      </span>
      <span className="line-clamp-2 text-[13px] text-muted-foreground">
        {describeGroupOptions(group)}
      </span>
      {usedByCount === undefined &&
      isBlockingGroup(group) ? (
        <span className="text-[13px] text-destructive">
          Todas as opções estão pausadas: o produto não vai
          poder ser pedido.
        </span>
      ) : null}
    </div>
  );
}

/** Grupo obrigatório sem opção disponível: o produto não pode ser pedido. */
export function isBlockingGroup(
  group: ComplementGroupItem,
) {
  return (
    group.minSelect > 0 &&
    !group.options.some((option) => option.isAvailable)
  );
}

function productCountLabel(count: number) {
  return count === 1 ? "1 produto" : `${count} produtos`;
}

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        {open ? (
          <EditorForm
            key={
              product?.id ??
              `new-${defaultCategoryId ?? ""}`
            }
            product={product}
            defaultCategoryId={defaultCategoryId}
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
  categories: EditorCategory[];
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
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(
    product?.description ?? "",
  );
  const [price, setPrice] = useState(
    product ? formatAmountInput(product.price) : "",
  );
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ??
      defaultCategoryId ??
      categories[0]?.id ??
      "",
  );
  const [hasPhoto, setHasPhoto] = useState(
    product ? product.imageUrl !== null : true,
  );
  const [imageUrl, setImageUrl] = useState(
    product?.imageUrl ?? null,
  );
  const [badges, setBadges] = useState<string[]>(
    product?.badges ?? [],
  );
  const [isSuggested, setIsSuggested] = useState(
    product?.isSuggested ?? false,
  );
  const [groupIds, setGroupIds] = useState<string[]>(
    product?.groupIds ?? [],
  );
  // Categoria criada aqui aparece antes de a lista do servidor chegar.
  const [createdCategories, setCreatedCategories] =
    useState<EditorCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [query, setQuery] = useState("");
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
  const groupsById = new Map(
    groups.map((group) => [group.id, group]),
  );
  const linked = groupIds.flatMap((id) => {
    const group = groupsById.get(id);
    return group ? [group] : [];
  });
  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("pt-BR");
  const pickable = groups.filter(
    (group) =>
      !groupIds.includes(group.id) &&
      (!normalizedQuery ||
        [group.name, ...group.options.map((o) => o.name)]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery)),
  );

  function goTo(next: Step) {
    setStep(next);
  }

  /**
   * Confere os campos até a aba indicada e leva para a primeira aba com
   * erro. Devolve true se está tudo certo.
   */
  function validate(upTo: Step): boolean {
    const found: FieldErrors = {};
    if (!name.trim()) found.name = "Dê um nome ao produto.";
    if (parseAmountInput(price) === null) {
      found.price = "Informe um preço válido.";
    }
    if (upTo >= 1 && !categoryId) {
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
        categoryId,
        name,
        description,
        price: parseAmountInput(price) ?? 0,
        imageUrl: hasPhoto ? imageUrl : null,
        // Mantém a ordem da lista oficial, não a do clique.
        badges: PRODUCT_BADGES.filter((badge) =>
          badges.includes(badge),
        ),
        isAvailable: product?.isAvailable ?? true,
        isSuggested,
        groupIds,
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  function createCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await onCreateCategory(trimmed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreatedCategories((current) => [
        ...current,
        { id: result.data, name: trimmed, productCount: 0 },
      ]);
      setCategoryId(result.data);
      setNewCategory("");
      setErrors((current) => ({
        ...current,
        category: undefined,
      }));
      toast.success(`Categoria "${trimmed}" criada`);
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
        <SheetTitle className="mr-auto min-w-0 truncate text-lg font-semibold">
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
          className="flex shrink-0 gap-2 overflow-x-auto rounded-lg border bg-card px-2"
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
                  "flex h-11 shrink-0 items-center gap-2 px-2 text-[15px] whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground",
                  active &&
                    "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--color-foreground)]",
                )}
              >
                {isWizard ? (
                  <span
                    className={cn(
                      "tabular flex size-6 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
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
          <>
            <EditorCard title="Informações do produto">
              <div className="flex flex-col gap-6 p-4 sm:p-6">
                <Field id="product-name" label="Nome">
                  <Input
                    id="product-name"
                    value={name}
                    placeholder="Ex.: The Classic"
                    maxLength={80}
                    aria-invalid={!!errors.name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        name: undefined,
                      }));
                    }}
                  />
                  <FieldError message={errors.name} />
                </Field>
                <Field
                  id="product-description"
                  label="Descrição"
                >
                  <Textarea
                    id="product-description"
                    value={description}
                    placeholder="Ingredientes ou detalhes do produto"
                    maxLength={PRODUCT_DESCRIPTION_LIMIT}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                  />
                  <span className="flex justify-between gap-4 text-[13px] text-muted-foreground">
                    <span>
                      Aparece em até 3 linhas no cardápio.
                    </span>
                    <span className="tabular">
                      {description.length}/
                      {PRODUCT_DESCRIPTION_LIMIT}
                    </span>
                  </span>
                </Field>
                <div className="max-w-[200px]">
                  <Field id="product-price" label="Preço">
                    <CurrencyInput
                      id="product-price"
                      value={price}
                      placeholder="0,00"
                      aria-invalid={!!errors.price}
                      onChange={(event) => {
                        setPrice(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          price: undefined,
                        }));
                      }}
                    />
                    <FieldError message={errors.price} />
                  </Field>
                </div>
              </div>
            </EditorCard>

            <EditorCard
              title="Foto e selos"
              description="Selos aparecem como etiquetas no card do produto."
            >
              <div className="flex flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium">
                    Foto{" "}
                    <span className="font-normal text-muted-foreground">
                      · opcional
                    </span>
                  </span>
                  <Segmented
                    label="Foto do produto"
                    value={hasPhoto}
                    options={[
                      [true, "Com foto"],
                      [false, "Sem foto"],
                    ]}
                    onChange={setHasPhoto}
                  />
                  {hasPhoto ? (
                    <div className="pt-2">
                      <ImagePicker
                        storeId={storeId}
                        kind="product"
                        value={imageUrl}
                        onChange={setImageUrl}
                        label="Foto do produto"
                      />
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      O card do produto aparece sem imagem.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium">
                    Selos
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_BADGES.map((badge) => {
                      const active = badges.includes(badge);
                      return (
                        <Button
                          key={badge}
                          type="button"
                          size="sm"
                          variant={
                            active ? "default" : "outline"
                          }
                          aria-pressed={active}
                          onClick={() =>
                            setBadges((current) =>
                              active
                                ? current.filter(
                                    (item) =>
                                      item !== badge,
                                  )
                                : [...current, badge],
                            )
                          }
                        >
                          {active ? (
                            <Check aria-hidden />
                          ) : (
                            <Plus aria-hidden />
                          )}
                          {badge}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </EditorCard>

            <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 sm:px-6">
              <div className="flex flex-1 flex-col gap-1">
                <label
                  htmlFor="product-suggested"
                  className="text-[15px] font-semibold"
                >
                  Sugerir no carrinho
                </label>
                <span className="text-[13px] text-muted-foreground">
                  Aparece como sugestão quando o cliente
                  revisa o pedido. Bom para bebidas e
                  sobremesas.
                </span>
              </div>
              <Switch
                id="product-suggested"
                checked={isSuggested}
                onCheckedChange={setIsSuggested}
              />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <EditorCard
            title="Categoria"
            description="Em qual categoria o produto aparece?"
          >
            {errors.category ? (
              <p
                role="alert"
                className="border-b bg-destructive-soft px-4 py-3 text-[13px] text-destructive sm:px-6"
              >
                {errors.category}
              </p>
            ) : null}
            <div
              role="radiogroup"
              aria-label="Categoria do produto"
              className="flex flex-col"
            >
              {allCategories.map((category) => {
                const selected = category.id === categoryId;
                // Sem contar o próprio produto.
                const count =
                  category.productCount -
                  (product?.categoryId === category.id
                    ? 1
                    : 0);
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setCategoryId(category.id);
                      setErrors((current) => ({
                        ...current,
                        category: undefined,
                      }));
                    }}
                    className={cn(
                      "flex min-h-12 items-center gap-3 border-b px-4 text-left outline-none hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-inset sm:px-6",
                      selected && "bg-background",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-5 shrink-0 rounded-full",
                        selected
                          ? "border-[6px] border-foreground"
                          : "border-[1.5px] border-muted-foreground",
                      )}
                    />
                    <span className="flex-1 text-[15px]">
                      {category.name}
                    </span>
                    <span className="tabular text-[13px] text-muted-foreground">
                      {productCountLabel(count)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 px-4 py-4 sm:px-6 sm:pb-6">
              <label
                htmlFor="product-new-category"
                className="text-[13px] font-medium"
              >
                Ou crie uma categoria nova
              </label>
              <div className="flex gap-2">
                <Input
                  id="product-new-category"
                  value={newCategory}
                  placeholder="Ex.: Porções"
                  maxLength={60}
                  onChange={(event) =>
                    setNewCategory(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newCategory.trim() || pending}
                  onClick={createCategory}
                >
                  Criar
                </Button>
              </div>
            </div>
          </EditorCard>
        ) : null}

        {step === 2 ? (
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
                    setGroupIds(
                      reordered.map((group) => group.id),
                    )
                  }
                  handleLabel={(group) =>
                    `Mover ${group.name}`
                  }
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
                          size="sm"
                          className="bg-card"
                          onClick={() =>
                            setGroupEditor(group)
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Tirar ${group.name} do produto`}
                          onClick={() =>
                            setGroupIds((current) =>
                              current.filter(
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
                    onClick={() => setGroupEditor("new")}
                  >
                    <Plus aria-hidden />
                    Criar grupo novo
                  </Button>
                </div>
              }
            >
              {pickable.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-muted-foreground sm:px-6">
                  {normalizedQuery
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
                        size="sm"
                        className="mt-1.5 shrink-0 bg-card"
                        onClick={() =>
                          setGroupIds((current) => [
                            ...current,
                            group.id,
                          ])
                        }
                      >
                        <Plus aria-hidden />
                        Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </EditorCard>
          </>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="text-[13px] text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-4 sm:px-6">
        {product ? (
          <>
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
          </>
        ) : null}
        <span className="flex-1" />
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
      </footer>

      <ComplementGroupEditor
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
              setGroupIds((current) => [
                ...current,
                result.data,
              ]);
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

function EditorCard({
  title,
  description,
  toolbar,
  children,
}: {
  title: ReactNode;
  description?: string;
  /** Controles logo abaixo da descrição, ainda no cabeçalho. */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex min-h-14 flex-col justify-center gap-1 border-b px-4 py-3 last:border-b-0 sm:px-6">
        <h3 className="text-[15px] leading-tight font-semibold">
          {title}
        </h3>
        {description ? (
          <p className="text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
        {toolbar ? (
          <div className="pt-2">{toolbar}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Segmented<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex self-start rounded-md border bg-muted p-0.5"
    >
      {options.map(([optionValue, optionLabel]) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionLabel}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={cn(
              "h-8 rounded-[5px] px-3 text-[13px] font-medium text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground",
              selected &&
                "bg-card text-foreground shadow-sm",
            )}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
