import { EditorCard } from "@/components/molecules/editor-card";
import { RadioCard } from "@/components/molecules/radio-card";
import type { PromotionKind } from "@/lib/data/promotions";

const PRODUCT_KINDS: KindOption[] = [
  {
    kind: "product_discount",
    title: "Desconto em produtos",
    description:
      "Muda o preço de um ou mais produtos no cardápio.",
    example: "Ex.: 20% off no The Classic",
  },
];

const ORDER_KINDS: KindOption[] = [
  {
    kind: "free_delivery",
    title: "Entrega grátis",
    description:
      "Zera a taxa de entrega, com ou sem valor mínimo de pedido.",
    example: "Ex.: entrega grátis acima de R$ 70",
  },
  {
    kind: "order_discount",
    title: "Desconto no pedido acima de um valor",
    description:
      "Tira um valor ou uma % do pedido quando ele chega no mínimo.",
    example: "Ex.: R$ 10 off em pedidos acima de R$ 100",
  },
];

type KindOption = {
  kind: PromotionKind;
  title: string;
  description: string;
  example: string;
};

/** Passo Tipo do editor de promoção. */
export function PromotionKindStep({
  value,
  onChange,
}: {
  value: PromotionKind | null;
  onChange: (kind: PromotionKind) => void;
}) {
  return (
    <EditorCard title="Que tipo de promoção?">
      <div
        role="radiogroup"
        aria-label="Tipo de promoção"
        className="flex flex-col gap-6 p-4 sm:p-6"
      >
        <KindGroup
          label="Promoção de produto"
          options={PRODUCT_KINDS}
          value={value}
          onChange={onChange}
        />
        <KindGroup
          label="Promoções de pedido"
          options={ORDER_KINDS}
          value={value}
          onChange={onChange}
        />
      </div>
    </EditorCard>
  );
}

function KindGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: KindOption[];
  value: PromotionKind | null;
  onChange: (kind: PromotionKind) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-muted-foreground">
        {label}
      </span>
      {options.map((option) => (
        <RadioCard
          key={option.kind}
          selected={value === option.kind}
          title={option.title}
          description={option.description}
          onSelect={() => onChange(option.kind)}
        >
          {/* Alinhado ao título, depois da bolinha. */}
          <span className="-mt-2 block pl-8 text-support text-muted-foreground">
            {option.example}
          </span>
        </RadioCard>
      ))}
    </div>
  );
}
