import {
  Check,
  Clock3,
  MessageCircle,
  X,
} from "lucide-react";

import { buttonVariants } from "@/components/atoms/button";
import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";
import { OrderTimeline } from "@/components/molecules/order-timeline";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/orders/board";
import { timelineSteps } from "@/lib/orders/detail";
import {
  formatDeliveryAddress,
  supportUrl,
  trackingHeadline,
  type TrackedOrder,
  type TrackingHeadline,
} from "@/lib/orders/tracking";
import { cn } from "@/lib/utils";

const TONE_ICON: Record<
  TrackingHeadline["tone"],
  { icon: typeof Check; className: string }
> = {
  waiting: {
    icon: Clock3,
    className:
      "bg-primary-soft text-primary-soft-foreground",
  },
  progress: {
    icon: Clock3,
    className:
      "bg-primary-soft text-primary-soft-foreground",
  },
  done: {
    icon: Check,
    className: "bg-success-soft text-success",
  },
  stopped: {
    icon: X,
    className: "bg-destructive-soft text-destructive",
  },
};

/**
 * Pedido enviado, como o cliente o vê: o status de agora, as etapas com a
 * hora de cada uma, o resumo com os valores gravados pelo servidor, como
 * recebe, como paga e o suporte pelo WhatsApp da loja.
 */
export function OrderSent({
  order,
}: {
  order: TrackedOrder;
}) {
  const headline = trackingHeadline(order);
  const tone = TONE_ICON[headline.tone];
  const Icon = tone.icon;
  const delivery = order.mode === "ENTREGA";
  const support = supportUrl(
    order.store.phone,
    order.number,
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      <section
        aria-labelledby="pedido-titulo"
        className="flex flex-col gap-3"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            tone.className,
          )}
        >
          <Icon className="size-7" />
        </span>
        <div className="flex flex-col gap-1">
          {/* O status muda sozinho: quem usa leitor de tela é avisado. */}
          <h1
            id="pedido-titulo"
            aria-live="polite"
            className="text-page-title font-semibold"
          >
            {headline.title}
          </h1>
          <p className="text-body text-muted-foreground">
            Pedido{" "}
            <strong className="tabular font-semibold text-foreground">
              #{order.number}
            </strong>{" "}
            · {order.store.name}
          </p>
          <p className="text-body">
            {headline.description}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="pedido-etapas"
        className="flex flex-col gap-4 rounded-surface border bg-card p-4"
      >
        <h2
          id="pedido-etapas"
          className="text-section-title font-semibold"
        >
          Acompanhe seu pedido
        </h2>
        <OrderTimeline
          steps={timelineSteps(order)}
          currentDotClass="border-primary bg-primary"
        />
      </section>

      <section
        aria-labelledby="pedido-resumo"
        className="flex flex-col gap-4 rounded-surface border bg-card p-4"
      >
        <h2
          id="pedido-resumo"
          className="text-section-title font-semibold"
        >
          Resumo do pedido
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => {
            const options = item.complements
              .map((option) =>
                option.quantity > 1
                  ? `${option.quantity}× ${option.name}`
                  : option.name,
              )
              .join(" · ");
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-body">
                    <span className="tabular font-semibold">
                      {item.quantity}×
                    </span>{" "}
                    {item.name}
                  </p>
                  {options ? (
                    <p className="text-support text-muted-foreground">
                      {options}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="text-support text-muted-foreground">
                      Obs.: {item.notes}
                    </p>
                  ) : null}
                </div>
                <p className="tabular shrink-0 text-body">
                  {formatCurrency(item.total)}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="flex flex-col gap-2 border-t pt-4 text-body">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">
              Subtotal
            </dt>
            <dd className="tabular">
              {formatCurrency(order.subtotal)}
            </dd>
          </div>
          {delivery ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Taxa de entrega
              </dt>
              <dd className="tabular flex items-baseline gap-2">
                {order.waivedDeliveryFee !== null ? (
                  <s className="text-muted-foreground">
                    {formatCurrency(
                      order.waivedDeliveryFee,
                    )}
                  </s>
                ) : null}
                {order.deliveryFee > 0
                  ? formatCurrency(order.deliveryFee)
                  : "Grátis"}
              </dd>
            </div>
          ) : null}
          {order.discount > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Desconto
              </dt>
              <dd className="tabular font-semibold whitespace-nowrap text-success">
                − {formatCurrency(order.discount)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t pt-2 text-section-title font-semibold">
            <dt>Total</dt>
            <dd className="tabular">
              {formatCurrency(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-label="Recebimento e pagamento"
        className="rounded-surface border bg-card p-4"
      >
        <dl className="flex flex-col gap-4 text-body">
          <div className="flex flex-col gap-1">
            <dt className="text-support text-muted-foreground">
              {delivery ? "Entrega em" : "Recebimento"}
            </dt>
            <dd>
              {delivery && order.address
                ? formatDeliveryAddress(order.address)
                : "Retirada no balcão"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-support text-muted-foreground">
              {delivery
                ? "Pagamento na entrega"
                : "Pagamento na retirada"}
            </dt>
            <dd>
              {PAYMENT_LABELS[order.paymentMethod]}
              {order.changeFor !== null
                ? ` · troco para ${formatCurrency(order.changeFor)}`
                : ""}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-col gap-3">
        {support ? (
          <a
            href={support}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "lg" })}
          >
            <MessageCircle aria-hidden />
            Falar com a loja no WhatsApp
          </a>
        ) : null}
        <BackToMenuLink
          className={buttonVariants({
            variant: "outline",
            size: "lg",
          })}
        >
          Voltar ao cardápio
        </BackToMenuLink>
      </div>
    </div>
  );
}
