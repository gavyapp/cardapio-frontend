import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { EditorCard } from "@/components/molecules/editor-card";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import {
  describeSchedule,
  WEEK_ORDER,
  weekdayShort,
} from "@/lib/promotions/describe";
import {
  scheduleOf,
  type PromotionForm,
  type ScheduleType,
} from "@/lib/promotions/draft";
import { scheduleStatus } from "@/lib/promotions/status";

const SCHEDULE_TYPES: [ScheduleType, string][] = [
  ["always", "Sempre"],
  ["weekly", "Dias e horários"],
  ["dates", "Entre datas"],
];

const NOW_LABEL = {
  active: "ativa",
  scheduled: "agendada",
  ended: "encerrada",
} as const;

/** Passo Quando vale do editor de promoção. */
export function PromotionScheduleStep({
  form,
  now,
  onChange,
}: {
  form: PromotionForm;
  now: Date;
  onChange: (changes: Partial<PromotionForm>) => void;
}) {
  const schedule = scheduleOf(form);

  function toggleDay(day: number) {
    onChange({
      weekdays: form.weekdays.includes(day)
        ? form.weekdays.filter((item) => item !== day)
        : [...form.weekdays, day],
    });
  }

  return (
    <EditorCard title="Quando a promoção vale?">
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <SegmentedControl
          label="Quando a promoção vale"
          value={form.scheduleType}
          options={SCHEDULE_TYPES}
          onChange={(scheduleType) =>
            onChange({ scheduleType })
          }
        />

        {form.scheduleType === "weekly" ? (
          <>
            <div className="flex flex-col gap-2">
              <span
                id="promotion-weekdays"
                className="text-support font-medium"
              >
                Dias da semana
              </span>
              <div
                role="group"
                aria-labelledby="promotion-weekdays"
                className="flex flex-wrap gap-2"
              >
                {WEEK_ORDER.map((day) => {
                  const active =
                    form.weekdays.includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={
                        active ? "default" : "outline"
                      }
                      aria-pressed={active}
                      className="min-w-12"
                      onClick={() => toggleDay(day)}
                    >
                      {weekdayShort(day)}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="promotion-all-day"
                className="text-body"
              >
                O dia todo
              </label>
              <Switch
                id="promotion-all-day"
                checked={form.allDay}
                onCheckedChange={(allDay) =>
                  onChange({ allDay })
                }
              />
            </div>
            {form.allDay ? null : (
              <div className="grid max-w-[320px] grid-cols-2 gap-4">
                <Field id="promotion-from" label="Das">
                  <Input
                    id="promotion-from"
                    type="time"
                    className="tabular"
                    value={form.from}
                    onChange={(event) =>
                      onChange({ from: event.target.value })
                    }
                  />
                </Field>
                <Field id="promotion-to" label="Às">
                  <Input
                    id="promotion-to"
                    type="time"
                    className="tabular"
                    value={form.to}
                    onChange={(event) =>
                      onChange({ to: event.target.value })
                    }
                  />
                </Field>
              </div>
            )}
          </>
        ) : null}

        {form.scheduleType === "dates" ? (
          <div className="grid max-w-[400px] grid-cols-2 gap-4">
            <Field id="promotion-start" label="Início">
              <Input
                id="promotion-start"
                type="date"
                className="tabular"
                value={form.start}
                onChange={(event) =>
                  onChange({ start: event.target.value })
                }
              />
            </Field>
            <Field id="promotion-end" label="Fim">
              <Input
                id="promotion-end"
                type="date"
                className="tabular"
                value={form.end}
                onChange={(event) =>
                  onChange({ end: event.target.value })
                }
              />
            </Field>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="text-body">
            Vale: {describeSchedule(schedule)}.
            {isComplete(form)
              ? ` Neste momento ficaria ${NOW_LABEL[scheduleStatus(schedule, now)]}.`
              : null}
          </span>
          <span className="text-support text-muted-foreground">
            Fora do período, a promoção some do cardápio e
            fica aqui como Agendada ou Encerrada.
          </span>
        </div>
      </div>
    </EditorCard>
  );
}

/** Período preenchido o bastante para dizer o status de agora. */
function isComplete(form: PromotionForm): boolean {
  if (form.scheduleType === "weekly")
    return form.weekdays.length > 0;
  if (form.scheduleType === "dates")
    return !!form.start && !!form.end;
  return true;
}
