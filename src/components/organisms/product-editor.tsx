"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { Separator } from "@/components/atoms/separator";
import { Switch } from "@/components/atoms/switch";
import { Textarea } from "@/components/atoms/textarea";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { Field } from "@/components/molecules/field";
import { ImagePicker } from "@/components/molecules/image-picker";
import { SortableList } from "@/components/molecules/sortable-list";
import type { ActionResultWith } from "@/lib/action-result";
import {
  formatAmountInput,
  parseAmountInput,
} from "@/lib/format";
import { PRODUCT_BADGES } from "@/lib/product-badges";
import { cn } from "@/lib/utils";

const DESCRIPTION_LIMIT = 300;

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

export type EditorCategory = { id: string; name: string };

export type EditorGroup = {
  id: string;
  name: string;
  /** "Obrigatório · Escolha 1" */
  rule: string;
  /** "Mal passado, Ao ponto, Bem passado" */
  optionNames: string;
  /** Nenhuma opção disponível. */
  hasNoActiveOption: boolean;
};

/**
 * Criar ou editar produto: informações, foto, selos, categoria,
 * disponibilidade, sugestão no carrinho e grupos de complementos na ordem.
 */
export function ProductEditor({
  open,
  onOpenChange,
  product,
  defaultCategoryId,
  storeId,
  categories,
  groups,
  onSave,
  onDuplicate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null cria um produto novo. */
  product: EditableProduct | null;
  defaultCategoryId?: string;
  storeId: string;
  categories: EditorCategory[];
  groups: EditorGroup[];
  onSave: (
    draft: ProductDraft,
  ) => Promise<ActionResultWith<string>>;
  onDuplicate?: (product: EditableProduct) => void;
  onDelete?: (product: EditableProduct) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_1fr_auto] overflow-hidden sm:max-w-3xl">
        {open ? (
          <EditorForm
            key={
              product?.id ??
              `new-${defaultCategoryId ?? ""}`
            }
            product={product}
            defaultCategoryId={defaultCategoryId}
            storeId={storeId}
            categories={categories}
            groups={groups}
            onSave={onSave}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditorForm({
  product,
  defaultCategoryId,
  storeId,
  categories,
  groups,
  onSave,
  onDuplicate,
  onDelete,
  onDone,
}: {
  product: EditableProduct | null;
  defaultCategoryId?: string;
  storeId: string;
  categories: EditorCategory[];
  groups: EditorGroup[];
  onSave: (
    draft: ProductDraft,
  ) => Promise<ActionResultWith<string>>;
  onDuplicate?: (product: EditableProduct) => void;
  onDelete?: (product: EditableProduct) => void;
  onDone: () => void;
}) {
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
  const [imageUrl, setImageUrl] = useState(
    product?.imageUrl ?? null,
  );
  const [badges, setBadges] = useState<string[]>(
    product?.badges ?? [],
  );
  const [isAvailable, setIsAvailable] = useState(
    product?.isAvailable ?? true,
  );
  const [isSuggested, setIsSuggested] = useState(
    product?.isSuggested ?? false,
  );
  const [groupIds, setGroupIds] = useState<string[]>(
    product?.groupIds ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );
  const linked = groupIds.flatMap((id) => {
    const group = groupsById.get(id);
    return group ? [group] : [];
  });
  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("pt-BR");
  const available = groups.filter(
    (group) =>
      !groupIds.includes(group.id) &&
      (!normalizedQuery ||
        `${group.name} ${group.optionNames}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery)),
  );

  function toggleBadge(badge: string) {
    setBadges((current) =>
      current.includes(badge)
        ? current.filter((item) => item !== badge)
        : [...current, badge],
    );
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Dê um nome ao produto.");
      return;
    }
    const parsedPrice = parseAmountInput(price);
    if (parsedPrice === null) {
      setError("Informe um preço válido.");
      return;
    }
    if (!categoryId) {
      setError("Escolha uma categoria para o produto.");
      return;
    }
    startTransition(async () => {
      const result = await onSave({
        id: product?.id,
        categoryId,
        name,
        description,
        price: parsedPrice,
        imageUrl,
        // Mantém a ordem da lista oficial, não a do clique.
        badges: PRODUCT_BADGES.filter((badge) =>
          badges.includes(badge),
        ),
        isAvailable,
        isSuggested,
        groupIds: linked.map((group) => group.id),
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader className="pr-10">
        <DialogTitle className="text-lg font-semibold">
          {product ? "Editar produto" : "Novo produto"}
        </DialogTitle>
      </DialogHeader>

      <div className="-mx-4 flex min-h-0 flex-col gap-6 overflow-y-auto px-4 pb-2">
        <section className="grid gap-4">
          <Field id="product-name" label="Nome">
            <Input
              id="product-name"
              value={name}
              placeholder="Ex.: The Classic"
              maxLength={80}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </Field>
          <div className="grid gap-2">
            <Label htmlFor="product-description">
              Descrição
            </Label>
            <Textarea
              id="product-description"
              value={description}
              placeholder="Ingredientes ou detalhes do produto"
              maxLength={DESCRIPTION_LIMIT}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
            <div className="flex justify-between gap-4 text-[13px] text-muted-foreground">
              <span>
                Aparece em até 3 linhas no cardápio.
              </span>
              <span className="tabular">
                {description.length}/{DESCRIPTION_LIMIT}
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="product-price" label="Preço">
              <CurrencyInput
                id="product-price"
                value={price}
                placeholder="0,00"
                onChange={(event) =>
                  setPrice(event.target.value)
                }
              />
            </Field>
            <div className="grid gap-2">
              <Label htmlFor="product-category">
                Categoria
              </Label>
              <Select
                items={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                value={categoryId || null}
                onValueChange={(value) =>
                  setCategoryId(value ?? "")
                }
              >
                <SelectTrigger
                  id="product-category"
                  className="w-full"
                >
                  <SelectValue placeholder="Escolha a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        <section className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">
              Foto{" "}
              <span className="font-normal text-muted-foreground">
                · opcional
              </span>
            </p>
            <ImagePicker
              storeId={storeId}
              kind="product"
              value={imageUrl}
              onChange={setImageUrl}
              label="Foto do produto"
            />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Selos</p>
            <p className="-mt-1 text-[13px] text-muted-foreground">
              Aparecem como etiquetas no card do produto.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_BADGES.map((badge) => {
                const active = badges.includes(badge);
                return (
                  <Button
                    key={badge}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => toggleBadge(badge)}
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
        </section>

        <Separator />

        <section className="grid gap-4">
          <ToggleRow
            id="product-available"
            title="Disponível"
            description="Desligado, o produto aparece como esgotado e não pode ser pedido."
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
          <ToggleRow
            id="product-suggested"
            title="Sugerir no carrinho"
            description="Aparece como sugestão quando o cliente revisa o pedido. Bom para bebidas e sobremesas."
            checked={isSuggested}
            onCheckedChange={setIsSuggested}
          />
        </section>

        <Separator />

        <section className="grid gap-3">
          <div>
            <p className="text-sm font-medium">
              Complementos
            </p>
            <p className="text-[13px] text-muted-foreground">
              Escolhas do cliente, como ponto da carne ou
              adicionais, na ordem em que ele vê.
            </p>
          </div>

          {linked.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-3 text-[13px] text-muted-foreground">
              Sem complementos, o produto vai direto para o
              carrinho.
            </p>
          ) : (
            <SortableList
              items={linked}
              onReorder={(next) =>
                setGroupIds(next.map((group) => group.id))
              }
              handleLabel={(group) => `Mover ${group.name}`}
              className="flex flex-col gap-2"
              itemClassName="rounded-lg"
              renderItem={(group, dragHandle) => (
                <div className="flex items-center gap-2 rounded-lg border py-2 pr-2 pl-1">
                  {dragHandle}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">
                      {group.name}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {group.rule}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {group.optionNames}
                    </span>
                    {group.hasNoActiveOption ? (
                      <span className="text-[13px] text-destructive">
                        Nenhuma opção disponível neste
                        grupo.
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setGroupIds((current) =>
                        current.filter(
                          (id) => id !== group.id,
                        ),
                      )
                    }
                  >
                    Desvincular
                  </Button>
                </div>
              )}
            />
          )}

          {picking ? (
            <div className="grid gap-2 rounded-lg border p-3">
              <div className="flex gap-2">
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
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar lista de grupos"
                  onClick={() => {
                    setPicking(false);
                    setQuery("");
                  }}
                >
                  <X aria-hidden />
                </Button>
              </div>
              {available.length === 0 ? (
                <p className="px-1 py-2 text-[13px] text-muted-foreground">
                  {groups.length === 0
                    ? "Nenhum grupo cadastrado ainda."
                    : "Nenhum outro grupo encontrado."}
                </p>
              ) : (
                <ul className="flex max-h-64 flex-col divide-y overflow-y-auto">
                  {available.map((group) => (
                    <li
                      key={group.id}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">
                          {group.name}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground">
                          {group.rule} · {group.optionNames}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGroupIds((current) => [
                            ...current,
                            group.id,
                          ])
                        }
                      >
                        Vincular
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="px-1 text-[13px] text-muted-foreground">
                Para criar ou mudar um grupo, use a tela{" "}
                <Link
                  href="/painel/cardapio/complementos"
                  className="underline underline-offset-3 hover:text-foreground"
                >
                  Complementos
                </Link>
                .
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => setPicking(true)}
            >
              <Plus aria-hidden />
              Vincular grupo
            </Button>
          )}
        </section>
      </div>

      <div className="grid gap-3">
        {error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter className="sm:justify-between">
          <div
            className={cn(
              "flex gap-2",
              !product && "hidden sm:block",
            )}
          >
            {product && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => onDelete(product)}
              >
                Excluir
              </Button>
            ) : null}
            {product && onDuplicate ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDuplicate(product)}
              >
                Duplicar
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose
              render={
                <Button type="button" variant="outline" />
              }
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Salvando…"
                : product
                  ? "Salvar produto"
                  : "Criar produto"}
            </Button>
          </div>
        </DialogFooter>
      </div>
    </form>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <Label
          htmlFor={id}
          className="text-[15px] font-medium"
        >
          {title}
        </Label>
        <p className="text-[13px] text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
