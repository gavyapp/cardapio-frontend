"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { SectionCard } from "@/components/molecules/section-card";
import type { ActionResult } from "@/lib/panel/action-result";
import { cn } from "@/lib/utils";

/** Um dia da semana com o turno atual (null = fechado). */
export type DayShift = {
  /** Id do turno no banco; null quando o dia está fechado. */
  id: string | null;
  weekday: number;
  label: string;
  opensAt: string | null;
  closesAt: string | null;
};

export type ShiftPayload = {
  id?: string;
  weekday: number;
  opensAt: string;
  closesAt: string;
};

const DEFAULT_SHIFT = {
  opensAt: "18:00",
  closesAt: "23:00",
};

type Draft = DayShift & { open: boolean };

function toDraft(days: readonly DayShift[]): Draft[] {
  return days.map((day) => ({
    ...day,
    open: day.opensAt !== null,
    opensAt: day.opensAt ?? DEFAULT_SHIFT.opensAt,
    closesAt: day.closesAt ?? DEFAULT_SHIFT.closesAt,
  }));
}

function toPayload(
  draft: readonly Draft[],
): ShiftPayload[] {
  return draft
    .filter(
      (day) => day.open && day.opensAt && day.closesAt,
    )
    .map((day) => ({
      ...(day.id ? { id: day.id } : {}),
      weekday: day.weekday,
      opensAt: day.opensAt as string,
      closesAt: day.closesAt as string,
    }));
}

export function StoreHoursSection({
  id,
  days,
  onSave,
}: {
  id: string;
  days: readonly DayShift[];
  onSave: (shifts: ShiftPayload[]) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft[]>(() =>
    toDraft(days),
  );
  const [pending, startTransition] = useTransition();

  function startEditing() {
    setDraft(toDraft(days));
    setEditing(true);
  }

  function updateDay(
    weekday: number,
    patch: Partial<Draft>,
  ) {
    setDraft((current) =>
      current.map((day) =>
        day.weekday === weekday
          ? { ...day, ...patch }
          : day,
      ),
    );
  }

  function copyToAllDays(source: Draft) {
    setDraft((current) =>
      current.map((day) => ({
        ...day,
        open: source.open,
        opensAt: source.opensAt,
        closesAt: source.closesAt,
      })),
    );
  }

  function save() {
    startTransition(async () => {
      const result = await onSave(toPayload(draft));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Horários salvos");
      setEditing(false);
    });
  }

  const action = editing ? (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setEditing(false)}
        disabled={pending}
      >
        Cancelar
      </Button>
      <Button onClick={save} loading={pending}>
        {pending ? "Salvando…" : "Salvar horários"}
      </Button>
    </div>
  ) : (
    <Button variant="outline" onClick={startEditing}>
      Editar horários
    </Button>
  );

  return (
    <SectionCard
      id={id}
      title="Horário de funcionamento"
      description='Fora do horário, o cardápio mostra "Fechado" e não recebe pedidos.'
      action={action}
    >
      {editing ? (
        <div className="divide-y px-6">
          {draft.map((day) => (
            <div
              key={day.weekday}
              className="grid gap-4 py-5 md:grid-cols-[200px_1fr] md:items-start"
            >
              <div className="flex items-center gap-4">
                <Switch
                  aria-label={`${day.label} aberto`}
                  checked={day.open}
                  onCheckedChange={(open) =>
                    updateDay(day.weekday, { open })
                  }
                />
                <div>
                  <p className="text-[15px] font-medium">
                    {day.label}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {day.open ? "Aberto" : "Fechado"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {day.open ? (
                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      aria-label={`${day.label}, abre às`}
                      value={day.opensAt ?? ""}
                      onChange={(e) =>
                        updateDay(day.weekday, {
                          opensAt: e.target.value,
                        })
                      }
                      className="tabular w-36"
                    />
                    <span className="text-[15px] text-muted-foreground">
                      até
                    </span>
                    <Input
                      type="time"
                      aria-label={`${day.label}, fecha às`}
                      value={day.closesAt ?? ""}
                      onChange={(e) =>
                        updateDay(day.weekday, {
                          closesAt: e.target.value,
                        })
                      }
                      className="tabular w-36"
                    />
                  </div>
                ) : (
                  <p className="py-2.5 text-[15px] text-muted-foreground">
                    Fechado o dia todo
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => copyToAllDays(day)}
                  className="w-fit text-[15px] font-medium hover:underline"
                >
                  Copiar para todos os dias
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <dl className="max-w-[560px] divide-y px-6 py-2">
          {days.map((day) => {
            const open = day.opensAt !== null;
            return (
              <div
                key={day.weekday}
                className="flex items-center justify-between py-4 text-[15px]"
              >
                <dt>{day.label}</dt>
                <dd
                  className={cn(
                    "tabular",
                    !open && "text-muted-foreground",
                  )}
                >
                  {open
                    ? `${day.opensAt} – ${day.closesAt}`
                    : "Fechado"}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </SectionCard>
  );
}
