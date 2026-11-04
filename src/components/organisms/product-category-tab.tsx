"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { EditorCard } from "@/components/molecules/editor-card";
import type { ActionResultWith } from "@/lib/action-result";
import type { CategoryItem } from "@/lib/catalog-types";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoryOption = Pick<
  CategoryItem,
  "id" | "name" | "productCount"
>;

/** Aba Categoria do editor: escolher uma categoria ou criar uma nova. */
export function ProductCategoryTab({
  categories,
  value,
  savedCategoryId,
  error,
  onChange,
  onCreate,
  onCreated,
}: {
  categories: CategoryOption[];
  value: string;
  /** Categoria em que o produto já está salvo (não conta nele mesmo). */
  savedCategoryId?: string;
  error?: string;
  onChange: (categoryId: string) => void;
  onCreate: (
    name: string,
  ) => Promise<ActionResultWith<string>>;
  /** Categoria criada aqui, para entrar na lista antes do servidor. */
  onCreated: (category: CategoryOption) => void;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [pending, startTransition] = useTransition();

  function createCategory() {
    const name = newCategory.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await onCreate(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onCreated({ id: result.data, name, productCount: 0 });
      setNewCategory("");
      toast.success(`Categoria "${name}" criada`);
    });
  }

  return (
    <EditorCard
      title="Categoria"
      description="Em qual categoria o produto aparece?"
    >
      {error ? (
        <p
          role="alert"
          className="border-b bg-destructive-soft px-4 py-3 text-[13px] text-destructive sm:px-6"
        >
          {error}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Categoria do produto"
        className="flex flex-col"
      >
        {categories.map((category) => {
          const selected = category.id === value;
          const count =
            category.productCount -
            (savedCategoryId === category.id ? 1 : 0);
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(category.id)}
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
                {pluralize(count, "produto", "produtos")}
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
  );
}
