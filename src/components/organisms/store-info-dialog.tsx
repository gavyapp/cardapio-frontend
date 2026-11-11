"use client";

import { useId, useState } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import type {
  InfoRow,
  PhoneLinks,
  WeekDay,
} from "@/lib/store/public-info";
import { cn } from "@/lib/utils";

const TABS = [
  ["about", "Sobre"],
  ["hours", "Horários"],
  ["delivery", "Entrega e pagamento"],
] as const;

type TabId = (typeof TABS)[number][0];

/**
 * "Mais informações" da loja no cardápio: o botão que abre e o diálogo com
 * endereço e contatos, a semana de funcionamento e entrega e pagamento.
 */
export function StoreInfoDialog({
  storeName,
  address,
  mapUrl,
  phone,
  week,
  delivery,
}: {
  storeName: string;
  address: string;
  mapUrl: string | null;
  phone: PhoneLinks | null;
  week: readonly WeekDay[];
  delivery: readonly InfoRow[];
}) {
  const [tab, setTab] = useState<TabId>("about");
  const baseId = useId();

  return (
    <Dialog
      onOpenChange={(open) => open && setTab("about")}
    >
      <DialogTrigger className="flex items-center gap-0.5 rounded-control text-support font-semibold outline-none hover:underline focus-visible:ring-1 focus-visible:ring-foreground">
        Mais informações
        <ChevronRight aria-hidden className="size-4" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{storeName}</DialogTitle>
        </DialogHeader>

        <div
          role="tablist"
          aria-label="Informações da loja"
          className="flex border-b"
        >
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`${baseId}-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px flex-1 border-b-2 border-transparent px-2 py-3 text-support font-medium text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-inset",
                tab === id &&
                  "border-foreground font-semibold text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          className="min-h-48"
        >
          {tab === "about" ? (
            <div className="flex flex-col">
              {address ? (
                <InfoLine
                  label="Endereço"
                  value={address}
                  action={
                    mapUrl ? (
                      <InfoLink href={mapUrl} newTab>
                        Abrir no mapa
                      </InfoLink>
                    ) : null
                  }
                />
              ) : null}
              {phone ? (
                <InfoLine
                  label="Telefone"
                  value={phone.label}
                  action={
                    <InfoLink href={phone.callUrl}>
                      Ligar
                    </InfoLink>
                  }
                />
              ) : null}
              {phone ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  render={
                    <a
                      href={phone.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  <MessageCircle aria-hidden />
                  Chamar no WhatsApp
                </Button>
              ) : null}
              {!address && !phone ? (
                <p className="py-3 text-support text-muted-foreground">
                  A loja ainda não informou endereço nem
                  telefone.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "hours" ? (
            <dl className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.weekday}
                  className={cn(
                    "flex items-center justify-between rounded-control px-3 py-2 text-body",
                    day.isToday &&
                      "bg-primary-soft font-semibold text-primary-soft-foreground",
                  )}
                >
                  <dt>
                    {day.label}
                    {day.isToday ? " · hoje" : ""}
                  </dt>
                  <dd
                    className={cn(
                      "tabular",
                      !day.hours &&
                        !day.isToday &&
                        "text-muted-foreground",
                    )}
                  >
                    {day.hours ?? "Fechado"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {tab === "delivery" ? (
            <dl className="flex flex-col divide-y">
              {delivery.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <dt className="text-support text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="text-right text-body">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoLine({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3">
      <div className="min-w-0">
        <p className="text-support text-muted-foreground">
          {label}
        </p>
        <p className="text-body">{value}</p>
      </div>
      {action}
    </div>
  );
}

function InfoLink({
  href,
  newTab = false,
  children,
}: {
  href: string;
  newTab?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(newTab
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="flex shrink-0 items-center gap-0.5 rounded-control text-support font-semibold outline-none hover:underline focus-visible:ring-1 focus-visible:ring-foreground"
    >
      {children}
      <ChevronRight aria-hidden className="size-4" />
    </a>
  );
}
