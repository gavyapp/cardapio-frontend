"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";

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
import { FieldError } from "@/components/molecules/field-error";
import { NumberStepper } from "@/components/molecules/number-stepper";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { SortableList } from "@/components/molecules/sortable-list";
import type { ActionResultWith } from "@/lib/panel/action-result";
import type {
  ComplementGroupDraft,
  EditableComplementGroup,
} from "@/lib/catalog/types";
import { describeChoiceRule } from "@/lib/catalog/complement-rules";
import { focusFirstInvalid } from "@/lib/panel/focus-first-invalid";
import {
  formatAmountInput,
  parseAmountInput,
} from "@/lib/format";
import { useExitSnapshot } from "@/lib/hooks/use-exit-snapshot";
import { cn } from "@/lib/utils";

type OptionRow = {
  /** Chave da linha na tela; opção nova ganha uma provisória. */
  id: string;
  /** Id no banco; opção nova não tem. */
  complementId?: string;
  name: string;
  price: string;
  isAvailable: boolean;
};

type GroupErrors = {
  name?: string;
  maxSelect?: string;
  /** Lista sem nenhuma linha de opção. */
  options?: string;
  rows?: Record<string, { name?: string; price?: string }>;
};

function toRows(
  group: EditableComplementGroup | null,
): OptionRow[] {
  if (!group) return [newRow()];
  return group.options.map((option) => ({
    id: option.id ?? crypto.randomUUID(),
    complementId: option.id,
    name: option.name,
    price:
      option.price > 0
        ? formatAmountInput(option.price)
        : "",
    isAvailable: option.isAvailable,
  }));
}

function newRow(): OptionRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
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
  nested = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null cria um grupo novo. */
  group: EditableComplementGroup | null;
  onSave: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
  /**
   * Aberto de dentro do editor de produto: cobre o painel do produto como
   * uma página seguinte, sem escurecer de novo o fundo, e volta pela seta.
   */
  nested?: boolean;
}) {
  const snapshot = useExitSnapshot(open, group);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={snapshot.onOpenChangeComplete}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName={
          nested
            ? "bg-transparent supports-backdrop-filter:backdrop-blur-none"
            : undefined
        }
        className={cn(
          "gap-0 data-[side=right]:w-full",
          nested
            ? "data-[side=right]:sm:max-w-[640px]"
            : "data-[side=right]:sm:max-w-[560px]",
        )}
      >
        {snapshot.isMounted ? (
          <EditorForm
            key={snapshot.value?.id ?? "new"}
            group={snapshot.value}
            onSave={onSave}
            onDone={() => onOpenChange(false)}
            nested={nested}
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
  nested,
}: {
  group: EditableComplementGroup | null;
  onSave: (
    draft: ComplementGroupDraft,
  ) => Promise<ActionResultWith<string>>;
  onDone: () => void;
  nested: boolean;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [isRequired, setIsRequired] = useState(
    group ? group.minSelect > 0 : true,
  );
  const [maxSelect, setMaxSelect] = useState(
    group?.maxSelect ?? 1,
  );
  // Como no protótipo, a tela só escolhe obrigatório ou opcional: obrigatório
  // pede pelo menos 1 escolha. Um mínimo maior, vindo do banco, é mantido
  // enquanto couber no máximo.
  const minSelect = isRequired
    ? Math.min(
        Math.max(group?.minSelect ?? 1, 1),
        maxSelect,
      )
    : 0;
  const [rows, setRows] = useState<OptionRow[]>(() =>
    toRows(group),
  );
  const [errors, setErrors] = useState<GroupErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const filledRows = rows.filter((row) => row.name.trim());
  // Opção já salva com o nome apagado (sendo editada) ainda conta no aviso
  // de "todas pausadas"; só a linha nova e vazia fica de fora.
  const optionRows = rows.filter(
    (row) => row.name.trim() || row.complementId,
  );
  const activeCount = optionRows.filter(
    (row) => row.isAvailable,
  ).length;
  const allowRepeat = group?.allowRepeat ?? false;

  function updateRow(
    rowId: string,
    changes: Partial<OptionRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, ...changes } : row,
      ),
    );
    setErrors((current) => {
      const rowErrors = current.rows?.[rowId];
      if (!rowErrors) return current;
      const next = { ...rowErrors };
      if ("name" in changes) delete next.name;
      if ("price" in changes) delete next.price;
      return {
        ...current,
        rows: { ...current.rows, [rowId]: next },
      };
    });
    setError(null);
  }

  /**
   * Marca os campos com erro antes de enviar. Linha toda vazia é ignorada;
   * linha com preço e sem nome, não. Devolve true se está tudo certo.
   */
  function validate(): boolean {
    const found: GroupErrors = {};
    const rowErrors: NonNullable<GroupErrors["rows"]> = {};
    if (!name.trim()) found.name = "Dê um nome ao grupo.";
    for (const row of rows) {
      if (!row.name.trim()) {
        if (row.price.trim()) {
          rowErrors[row.id] = {
            name: "Dê um nome à opção ou remova a linha.",
          };
        }
      } else if (
        row.price.trim() &&
        parseAmountInput(row.price) === null
      ) {
        rowErrors[row.id] = { price: "Preço inválido." };
      }
    }
    if (filledRows.length === 0) {
      if (rows[0]) {
        rowErrors[rows[0].id] ??= {
          name: "Adicione pelo menos 1 opção.",
        };
      } else {
        found.options = "Adicione pelo menos 1 opção.";
      }
    }
    if (
      !allowRepeat &&
      filledRows.length > 0 &&
      maxSelect > filledRows.length
    ) {
      found.maxSelect = `O máximo passa do número de opções (${filledRows.length}). Diminua o máximo ou adicione opções.`;
    }
    if (Object.keys(rowErrors).length > 0)
      found.rows = rowErrors;
    setErrors(found);
    const valid =
      !found.name &&
      !found.maxSelect &&
      !found.options &&
      !found.rows;
    if (!valid) focusFirstInvalid(formRef.current);
    return valid;
  }

  function submit() {
    setError(null);
    if (!validate()) return;
    const options: ComplementGroupDraft["options"] =
      filledRows.map((row) => ({
        id: row.complementId,
        name: row.name.trim(),
        // Opção sem preço é grátis.
        price: row.price.trim()
          ? (parseAmountInput(row.price) ?? 0)
          : 0,
        isAvailable: row.isAvailable,
      }));
    startTransition(async () => {
      const result = await onSave({
        id: group?.id,
        name,
        minSelect,
        maxSelect,
        // Sem controle na tela por enquanto; mantém o que já estava.
        allowRepeat,
        options,
      });
      if (result.ok) onDone();
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
        // Aberto de dentro do editor de produto, o envio subiria pela árvore
        // do React (o portal do Sheet não corta isso) e salvaria o produto.
        event.stopPropagation();
        submit();
      }}
    >
      <header
        className={cn(
          "flex min-h-16 shrink-0 items-start gap-2 border-b py-3 pr-4",
          nested ? "pl-3" : "pl-6",
        )}
      >
        {nested ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Voltar para o produto"
            title="Voltar para o produto"
            onClick={onDone}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}
        <div className="mr-auto flex min-w-0 flex-col gap-1 pt-1">
          <SheetTitle className="text-section font-semibold">
            {group
              ? "Editar grupo"
              : "Novo grupo de complementos"}
          </SheetTitle>
          <SheetDescription className="text-meta">
            {group && group.usedByCount > 0
              ? `Usado em ${group.usedByCount === 1 ? "1 produto" : `${group.usedByCount} produtos`}. O que mudar aqui vale para todos.`
              : "Escolhas do cliente, como ponto da carne, sabor ou adicionais."}
          </SheetDescription>
        </div>
        {nested ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            onClick={onDone}
          >
            <X aria-hidden />
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 [&>*]:shrink-0">
        <Field id="group-name" label="Nome do grupo">
          <Input
            id="group-name"
            value={name}
            placeholder="Ex.: Ponto da carne"
            maxLength={60}
            aria-invalid={!!errors.name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({
                ...current,
                name: undefined,
              }));
              setError(null);
            }}
          />
          <FieldError message={errors.name} />
        </Field>

        <div className="grid gap-2">
          <Label id="group-required-label">
            O cliente precisa escolher?
          </Label>
          <SegmentedControl
            variant="solid"
            labelledBy="group-required-label"
            value={isRequired}
            options={[
              [true, "Obrigatório"],
              [false, "Opcional"],
            ]}
            onChange={(value) => {
              setIsRequired(value);
              setError(null);
            }}
          />
        </div>

        <div className="grid gap-2">
          <Label>Máximo</Label>
          <NumberStepper
            label="Máximo de escolhas"
            value={maxSelect}
            min={1}
            max={50}
            invalid={!!errors.maxSelect}
            onChange={(value) => {
              setMaxSelect(value);
              setErrors((current) => ({
                ...current,
                maxSelect: undefined,
              }));
              setError(null);
            }}
          />
          <FieldError message={errors.maxSelect} />
          <p className="text-meta text-muted-foreground">
            O cliente vê: &quot;
            {describeChoiceRule(minSelect, maxSelect)}&quot;
          </p>
        </div>

        <div className="grid gap-2">
          <p className="text-meta font-medium">Opções</p>
          <SortableList
            items={rows}
            onReorder={setRows}
            handleLabel={(row) =>
              `Mover ${row.name.trim() || "opção"}`
            }
            className="flex flex-col gap-2"
            renderItem={(row, dragHandle) => {
              const rowErrors = errors.rows?.[row.id];
              return (
                <div className="grid gap-1">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:grid-cols-[auto_1fr_140px_auto_auto]">
                    {dragHandle}
                    <Input
                      aria-label="Nome da opção"
                      placeholder="Ex.: Bacon"
                      value={row.name}
                      maxLength={60}
                      aria-invalid={!!rowErrors?.name}
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
                        placeholder="Grátis"
                        aria-invalid={!!rowErrors?.price}
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
                  {rowErrors?.name || rowErrors?.price ? (
                    <p
                      role="alert"
                      className="pl-[52px] text-meta text-destructive"
                    >
                      {rowErrors.name ?? rowErrors.price}
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          <Button
            type="button"
            variant="ghost"
            className="justify-self-start"
            onClick={() => {
              setRows((current) => [...current, newRow()]);
              setErrors((current) => ({
                ...current,
                options: undefined,
              }));
            }}
          >
            <Plus aria-hidden />
            Adicionar opção
          </Button>
          <FieldError message={errors.options} />
          {optionRows.length > 0 && activeCount === 0 ? (
            <p className="rounded-control bg-destructive-soft px-4 py-3 text-meta text-destructive">
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
            className="text-meta text-destructive"
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
