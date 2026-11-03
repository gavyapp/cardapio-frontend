"use client";

import { useState } from "react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { contrastRatio, textColorOn } from "@/lib/color";
import { formatCurrency } from "@/lib/format";
import { themeStyle } from "@/lib/store-theme";

// Paleta sugerida no protótipo, com um amarelo claro para provar o contraste.
const PALETTE = [
  "#650000",
  "#FF441B",
  "#FF9D18",
  "#1F6F5C",
  "#2D5BD3",
  "#16191D",
  "#F2C94C",
];

const CATEGORIES = [
  "Promoções",
  "Burgers",
  "Combos",
  "Bebidas",
];

export function ThemeSample() {
  const [color, setColor] = useState(PALETTE[0]);
  const textColor = textColorOn(color);
  const ratio = contrastRatio(color, textColor);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
              className="size-9 rounded-full border-2 border-transparent aria-pressed:border-foreground"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="primary-color">
            Cor principal
          </Label>
          <Input
            id="primary-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            maxLength={7}
          />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Texto{" "}
          {textColor === "#ffffff" ? "claro" : "escuro"} ·
          contraste{" "}
          <span className="tabular">
            {ratio.toFixed(2)}:1
          </span>{" "}
          {ratio >= 4.5 ? "(AA)" : "(abaixo de AA)"}
        </p>
      </div>

      {/* Mesmo mecanismo do layout da loja: variáveis CSS no style. */}
      <div
        className="flex flex-col gap-4 rounded-xl border bg-background p-4 font-sans text-foreground"
        style={themeStyle({
          primaryColor: color,
          font: "moderna",
        })}
      >
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c, i) => (
            <Button
              key={c}
              size="sm"
              variant={i === 0 ? "default" : "secondary"}
              className="rounded-full"
            >
              {c}
            </Button>
          ))}
        </div>
        <div className="rounded-lg bg-primary-soft p-3 text-[13px] font-medium text-primary">
          Entrega grátis em pedidos acima de{" "}
          {formatCurrency(70)}
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">The Classic</p>
            <p className="text-[13px] text-muted-foreground">
              Pão brioche, blend 160 g, cheddar
            </p>
            <p className="tabular mt-1 flex items-center gap-2">
              {formatCurrency(37)}
              <span className="text-muted-foreground line-through">
                {formatCurrency(42)}
              </span>
              <Badge>-12%</Badge>
            </p>
          </div>
        </div>
        <Button size="lg" className="justify-between">
          <span>Adicionar</span>
          <span className="tabular">
            {formatCurrency(41)}
          </span>
        </Button>
      </div>
    </div>
  );
}
