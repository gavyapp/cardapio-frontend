"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/atoms/button";

/** Campo numérico com − e +, como no protótipo ("30 min"). */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  unit,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-11 w-fit items-center rounded-lg border"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Diminuir"
        disabled={value - step < min}
        onClick={() =>
          onChange(Math.max(min, value - step))
        }
      >
        <Minus />
      </Button>
      <span className="tabular min-w-20 text-center text-[15px] font-medium">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Aumentar"
        disabled={value + step > max}
        onClick={() =>
          onChange(Math.min(max, value + step))
        }
      >
        <Plus />
      </Button>
    </div>
  );
}
