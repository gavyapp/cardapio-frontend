"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { ConfirmDialog } from "@/components/molecules/confirm-dialog";
import { useStoreOpening } from "@/components/providers/store-opening-provider";
import {
  findCurrentClosing,
  findNextOpening,
  formatDeadline,
  formatNextOpening,
  formatOpeningTime,
  isOpenBySchedule,
  manualOpeningDeadline,
  type OpeningMode,
  type Shift,
} from "@/lib/store/opening";
import { cn } from "@/lib/utils";

/** "Aberta · fecha às 23h" ou "Fechada · abre sexta às 19h". */
function scheduleSummary(
  shifts: readonly Shift[],
  now: Date,
): string {
  if (isOpenBySchedule(shifts, now)) {
    const closing = findCurrentClosing(shifts, now);
    return closing
      ? `Aberta · fecha às ${formatOpeningTime(closing)}`
      : "Aberta";
  }
  const opening = findNextOpening(shifts, now);
  return opening
    ? `Fechada · ${formatNextOpening(opening)}`
    : "Fechada";
}

/** "Até 23h", "Até sexta às 19h" ou "Até você mudar". */
function deadlineSummary(
  until: Date | null,
  now: Date,
): string {
  return until
    ? `Até ${formatDeadline(until, now)}`
    : "Até você mudar";
}

/**
 * Texto da confirmação de fechar. O protótipo diz "até você abrir de novo";
 * com o prazo, a loja abre sozinha no próximo horário.
 */
function closeStoreDescription(
  until: Date | null,
  now: Date,
): string {
  return until
    ? `O cardápio vai mostrar 'Fechado' e não vai receber pedidos até ${formatDeadline(until, now)}, quando a loja abre pelo horário.`
    : "O cardápio vai mostrar 'Fechado' e não vai receber pedidos até você abrir de novo.";
}

/**
 * Selo "Aberta"/"Fechada" do cabeçalho do painel. Abre a escolha entre
 * seguir o horário, abrir agora ou fechar agora; fechar pede confirmação.
 */
export function StoreOpeningMenu() {
  const opening = useStoreOpening();
  const [confirmingClose, setConfirmingClose] =
    useState(false);

  if (!opening) return null;
  const {
    mode,
    isOpen,
    until,
    shifts,
    now,
    saving,
    choose,
  } = opening;

  // Prazo que cada escolha teria se fosse feita agora.
  const openUntil =
    mode === "open"
      ? until
      : manualOpeningDeadline("open", shifts, now);
  const closedUntil =
    mode === "closed"
      ? until
      : manualOpeningDeadline("closed", shifts, now);

  async function select(next: OpeningMode) {
    if (next === mode) return;
    if (next === "closed") {
      setConfirmingClose(true);
      return;
    }
    const error = await choose(next);
    if (error) toast.error(error);
  }

  const options: {
    value: OpeningMode;
    label: string;
    detail: string;
  }[] = [
    {
      value: "schedule",
      label: "Seguir horário",
      detail: scheduleSummary(shifts, now),
    },
    {
      value: "open",
      label: "Aberta agora",
      detail: deadlineSummary(openUntil, now),
    },
    {
      value: "closed",
      label: "Fechada agora",
      detail: deadlineSummary(closedUntil, now),
    },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir ou fechar a loja"
          disabled={saving}
          className={cn(
            "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded-control px-2 text-caption font-semibold whitespace-nowrap transition-opacity outline-none hover:opacity-85 focus-visible:ring-3 focus-visible:ring-background/40 disabled:opacity-60",
            isOpen
              ? "bg-success text-success-foreground"
              : "bg-background/15 text-border",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              isOpen
                ? "bg-success-foreground"
                : "bg-gray-medium",
            )}
          />
          {isOpen ? "Aberta" : "Fechada"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-72 p-1.5"
        >
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) =>
              select(value as OpeningMode)
            }
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick
                className="h-auto min-h-11 flex-col items-start gap-0.5 py-2"
              >
                <span className="font-medium">
                  {option.label}
                </span>
                <span className="text-support text-muted-foreground">
                  {option.detail}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title="Fechar a loja agora?"
        description={closeStoreDescription(
          closedUntil,
          now,
        )}
        confirmLabel="Fechar loja"
        onConfirm={() => choose("closed")}
      />
    </>
  );
}
