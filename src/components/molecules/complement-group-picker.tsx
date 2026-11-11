"use client";

import { Check, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/atoms/badge";
import {
  groupKind,
  stepOption,
  toggleOption,
} from "@/lib/catalog/cart";
import {
  describeChoiceRule,
  isBlockingGroup,
  isRequiredGroup,
} from "@/lib/catalog/complement-rules";
import type { MenuComplementGroup } from "@/lib/data/menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Um grupo de complementos no detalhe do produto. Uma opção quando o máximo
 * é 1, várias com caixa de seleção, ou contador de − e + quando o grupo
 * permite repetir. Complemento pausado aparece apagado, sem poder escolher.
 */
export function ComplementGroupPicker({
  group,
  chosen,
  onChange,
  showMissing,
  disabled = false,
}: {
  group: MenuComplementGroup;
  chosen: readonly string[];
  onChange: (chosen: string[]) => void;
  /** Destaca o grupo obrigatório que ficou sem escolha. */
  showMissing: boolean;
  disabled?: boolean;
}) {
  const kind = groupKind(group);
  const required = isRequiredGroup(group.minSelect);
  const count = chosen.length;
  const full = count >= group.maxSelect;
  const unavailable = isBlockingGroup(group);
  const missing = showMissing && count < group.minSelect;
  const titleId = `grupo-${group.id}`;

  const hint = unavailable
    ? "Indisponível no momento"
    : missing
      ? `Escolha ${group.minSelect === 1 ? "1 opção" : `${group.minSelect} opções`} para continuar`
      : describeChoiceRule(
          group.minSelect,
          group.maxSelect,
        ) +
        (kind !== "single" && count
          ? ` · ${count} ${count === 1 ? "selecionado" : "selecionados"}`
          : "");

  return (
    <section
      aria-labelledby={titleId}
      data-group={group.id}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3",
          missing ? "bg-destructive-soft" : "bg-muted",
        )}
      >
        <div className="min-w-0">
          <h3
            id={titleId}
            className={cn(
              "text-body font-semibold",
              missing && "text-destructive",
            )}
          >
            {group.name}
          </h3>
          <p
            className={cn(
              "text-support",
              missing || unavailable
                ? "text-destructive"
                : "text-muted-foreground",
            )}
            role={missing ? "alert" : undefined}
          >
            {hint}
          </p>
        </div>
        <Badge variant={required ? "inverse" : "outline"}>
          {required ? "Obrigatório" : "Opcional"}
        </Badge>
      </header>

      <ul
        role={kind === "single" ? "radiogroup" : "group"}
        aria-labelledby={titleId}
        className="divide-y px-4"
      >
        {group.options.map((option) => {
          const quantity = chosen.filter(
            (id) => id === option.id,
          ).length;
          const selected = quantity > 0;
          const off = !option.isAvailable || disabled;
          const price = !option.isAvailable
            ? "Indisponível"
            : option.price > 0
              ? `+ ${formatCurrency(option.price)}`
              : "";

          if (kind === "repeat") {
            return (
              <li
                key={option.id}
                className={cn(
                  "flex min-h-13 items-center gap-3 py-2",
                  !option.isAvailable && "opacity-45",
                )}
              >
                <span className="min-w-0 flex-1 text-body">
                  {option.name}
                </span>
                <span className="tabular text-support text-muted-foreground">
                  {price}
                </span>
                <span className="flex items-center gap-1">
                  {selected ? (
                    <>
                      <StepButton
                        label={`Menos ${option.name}`}
                        disabled={disabled}
                        onClick={() =>
                          onChange(
                            stepOption(
                              group,
                              chosen,
                              option.id,
                              -1,
                            ),
                          )
                        }
                      >
                        <Minus />
                      </StepButton>
                      <span
                        className="tabular w-6 text-center text-body font-semibold"
                        aria-live="polite"
                      >
                        {quantity}
                      </span>
                    </>
                  ) : null}
                  <StepButton
                    label={`Mais ${option.name}`}
                    disabled={off || full}
                    onClick={() =>
                      onChange(
                        stepOption(
                          group,
                          chosen,
                          option.id,
                          1,
                        ),
                      )
                    }
                  >
                    <Plus />
                  </StepButton>
                </span>
              </li>
            );
          }

          // Caixa cheia: as outras opções param de responder até desmarcar.
          const blocked =
            off ||
            (kind === "multiple" && full && !selected);
          return (
            <li key={option.id}>
              <button
                type="button"
                role={
                  kind === "single" ? "radio" : "checkbox"
                }
                aria-checked={selected}
                disabled={blocked}
                onClick={() =>
                  onChange(
                    toggleOption(group, chosen, option.id),
                  )
                }
                className={cn(
                  "flex min-h-13 w-full items-center gap-3 py-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-inset",
                  !option.isAvailable && "opacity-45",
                  blocked &&
                    option.isAvailable &&
                    "opacity-60",
                )}
              >
                <span className="min-w-0 flex-1 text-body">
                  {option.name}
                </span>
                <span className="tabular text-support text-muted-foreground">
                  {price}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border-2",
                    kind === "single"
                      ? "rounded-full"
                      : "rounded-control",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-medium",
                  )}
                >
                  {selected ? (
                    kind === "single" ? (
                      <span className="size-2 rounded-full bg-current" />
                    ) : (
                      <Check className="size-4" />
                    )
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full border outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-foreground disabled:opacity-35 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
