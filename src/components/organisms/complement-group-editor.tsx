"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/atoms/sheet";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { Field } from "@/components/molecules/field";
import { NumberStepper } from "@/components/molecules/number-stepper";
import { SortableList } from "@/components/molecules/sortable-list";
import type { ActionResultWith } from "@/lib/action-result";
import { describeGroupRule } from "@/lib/complement-rules";
import {
  formatAmountInput,
  parseAmountInput,
} from "@/lib/format";

export type ComplementGroupDraft = {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  options: {
    id?: string;
    name: string;
    price: number;
    isAvailable: boolean;
  }[];
};

export type EditableComplementGroup =
  ComplementGroupDraft & {
    id: string;
    usedByCount: number;
  };

type OptionRow = {
  /** Chave da linha na tela; opção nova ganha uma provisória. */
  id: string;
  /** Id no banco; opção nova não tem. */
  complementId?: string;
  name: string;
  price: string;
  isAvailable: boolean;
};

function toRows(
  group: EditableComplementGroup | null,
): OptionRow[] {
  if (!group) return [newRow()];
  return group.options.map((option) => ({
    id: option.id ?? crypto.randomUUID(),
    complementId: option.id,
    name: option.name,
    price: formatAmountInput(option.price),
    isAvailable: option.isAvailable,
  }));
}

function newRow(): OptionRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "0,00",
    isAvailable: true,
  };
}

/**
 * Criar ou editar um grupo de complementos: nome, regras (mínimo, máximo,
 * repetir) e opções com preço adicional, disponibilidade e ordem.
 */
export function ComplementGroupEditor({
  open,
  onOpenChange,
  group,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null cria um grupo novo. */
  group: EditableComplementGroup | null;
  onSave: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        {open ? (
          <EditorForm
            key={group?.id ?? "new"}
            group={group}
            onSave={onSave}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditorForm({
  group,
  onSave,
  onDone,
}: {
  group: EditableComplementGroup | null;
  onSave: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
  onDone: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [minSelect, setMinSelect] = useState(
    group?.minSelect ?? 0,
  );
  const [maxSelect, setMaxSelect] = useState(
    group?.maxSelect ?? 1,
  );
  const [allowRepeat, setAllowRepeat] = useState(
    group?.allowRepeat ?? false,
  );
  const [rows, setRows] = useState<OptionRow[]>(() =>
    toRows(group),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filledRows = rows.filter((row) => row.name.trim());
  const activeCount = filledRows.filter(
    (row) => row.isAvailable,
  ).length;

  function updateRow(
    rowId: string,
    changes: Partial<OptionRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, ...changes } : row,
      ),
    );
    setError(null);
  }

  function submit() {
    if (minSelect > maxSelect) {
      setError("O mínimo não pode ser maior que o máximo.");
      return;
    }
    const options: ComplementGroupDraft["options"] = [];
    for (const row of filledRows) {
      const price = parseAmountInput(row.price);
      if (price === null) {
        setError(`Preço inválido em "${row.name.trim()}".`);
        return;
      }
      options.push({
        id: row.complementId,
        name: row.name.trim(),
        price,
        isAvailable: row.isAvailable,
      });
    }
    startTransition(async () => {
      const result = await onSave({
        id: group?.id,
        name,
        minSelect,
        maxSelect,
        allowRepeat,
        options,
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <header className="flex min-h-16 shrink-0 items-start gap-2 border-b py-3 pr-4 pl-6">
        <div className="mr-auto flex min-w-0 flex-col gap-1 pt-1">
          <SheetTitle className="text-lg font-semibold">
            {group
              ? "Editar grupo"
              : "Novo grupo de complementos"}
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            {group && group.usedByCount > 0
              ? `Usado em ${group.usedByCount === 1 ? "1 produto" : `${group.usedByCount} produtos`}. O que mudar aqui vale para todos.`
              : "Escolhas do cliente, como ponto da carne, sabor ou adicionais."}
          </SheetDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          onClick={onDone}
        >
          <X aria-hidden />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 [&>*]:shrink-0">
        <Field id="group-name" label="Nome do grupo">
          <Input
            id="group-name"
            value={name}
            placeholder="Ex.: Ponto da carne"
            maxLength={60}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-4">
          <div className="grid gap-2">
            <Label>Mínimo</Label>
            <NumberStepper
              label="Mínimo de escolhas"
              value={minSelect}
              min={0}
              max={50}
              onChange={(value) => {
                setMinSelect(value);
                if (value > maxSelect) setMaxSelect(value);
                setError(null);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Máximo</Label>
            <NumberStepper
              label="Máximo de escolhas"
              value={maxSelect}
              min={Math.max(1, minSelect)}
              max={50}
              onChange={(value) => {
                setMaxSelect(value);
                setError(null);
              }}
            />
          </div>
          <div className="col-span-2 grid gap-2 sm:col-span-1">
            <Label htmlFor="group-repeat">
              Repetir opção
            </Label>
            <div className="flex h-11 items-center gap-3">
              <Switch
                id="group-repeat"
                checked={allowRepeat}
                onCheckedChange={setAllowRepeat}
              />
              <span className="text-[13px] text-muted-foreground">
                Ex.: 2× bacon
              </span>
            </div>
          </div>
        </div>
        <p className="-mt-3 text-[13px] text-muted-foreground">
          {describeGroupRule(minSelect, maxSelect)}
          {minSelect > 0
            ? ". O cliente só adiciona o produto depois de escolher."
            : ". O cliente pode pular."}
        </p>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Opções</p>
          <SortableList
            items={rows}
            onReorder={setRows}
            handleLabel={(row) =>
              `Mover ${row.name.trim() || "opção"}`
            }
            className="flex flex-col gap-2"
            renderItem={(row, dragHandle) => (
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:grid-cols-[auto_1fr_140px_auto_auto]">
                {dragHandle}
                <Input
                  aria-label="Nome da opção"
                  placeholder="Ex.: Bacon"
                  value={row.name}
                  maxLength={60}
                  onChange={(event) =>
                    updateRow(row.id, {
                      name: event.target.value,
                    })
                  }
                />
                <div className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto">
                  <CurrencyInput
                    aria-label={`Preço adicional de ${row.name.trim() || "opção"}`}
                    value={row.price}
                    onChange={(event) =>
                      updateRow(row.id, {
                        price: event.target.value,
                      })
                    }
                  />
                </div>
                <Switch
                  className="col-start-3 row-start-2 justify-self-center sm:col-start-auto sm:row-start-auto"
                  checked={row.isAvailable}
                  onCheckedChange={(checked) =>
                    updateRow(row.id, {
                      isAvailable: checked,
                    })
                  }
                  aria-label={
                    row.isAvailable
                      ? `Pausar ${row.name.trim() || "opção"}`
                      : `Voltar ${row.name.trim() || "opção"}`
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
                  aria-label={`Remover ${row.name.trim() || "opção"}`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter(
                        (r) => r.id !== row.id,
                      ),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            className="justify-self-start"
            onClick={() =>
              setRows((current) => [...current, newRow()])
            }
          >
            <Plus aria-hidden />
            Adicionar opção
          </Button>
          {filledRows.length > 0 && activeCount === 0 ? (
            <p className="rounded-lg bg-destructive-soft px-4 py-3 text-[13px] text-destructive">
              Todas as opções estão pausadas.
              {minSelect > 0
                ? " Produtos com este grupo não podem ser pedidos."
                : " O grupo não aparece para o cliente."}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-3 border-t px-4 py-4 sm:px-6">
        {error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Salvando…"
              : group
                ? "Salvar grupo"
                : "Criar grupo"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
