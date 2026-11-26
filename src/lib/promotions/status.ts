// Status de uma promoção no painel (ADR 0006, "Liga e desliga"): sai de
// is_active e do período, no fuso de São Paulo, como promotion_is_live e
// promotion_is_over no banco. Puro, sem React.
import type { PromotionSchedule } from "@/lib/data/promotions";
import {
  localMoment,
  STORE_TIME_ZONE,
} from "@/lib/store/opening";

export const promotionStatuses = [
  "active",
  "scheduled",
  "paused",
  "ended",
] as const;

export type PromotionStatus =
  (typeof promotionStatuses)[number];

export const PROMOTION_STATUS_LABEL: Record<
  PromotionStatus,
  string
> = {
  active: "Ativa agora",
  scheduled: "Agendada",
  paused: "Pausada",
  ended: "Encerrada",
};

const localDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "AAAA-MM-DD" de hoje no fuso da loja. */
function localDate(now: Date): string {
  return localDay.format(now);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Só pelo período, como se a promoção estivesse ligada. */
export function scheduleStatus(
  schedule: PromotionSchedule,
  now: Date,
): Exclude<PromotionStatus, "paused"> {
  switch (schedule.type) {
    case "always":
      return "active";
    case "dates": {
      const today = localDate(now);
      if (today < schedule.start) return "scheduled";
      if (today > schedule.end) return "ended";
      return "active";
    }
    case "weekly": {
      const { weekday, minutes } = localMoment(now);
      if (!schedule.weekdays.includes(weekday))
        return "scheduled";
      if (!schedule.from || !schedule.to) return "active";
      // De from (inclusive) até to (exclusive).
      return minutes >= toMinutes(schedule.from) &&
        minutes < toMinutes(schedule.to)
        ? "active"
        : "scheduled";
    }
  }
}

export function promotionStatus(
  promotion: {
    isActive: boolean;
    schedule: PromotionSchedule;
  },
  now: Date,
): PromotionStatus {
  if (!promotion.isActive) return "paused";
  return scheduleStatus(promotion.schedule, now);
}

/**
 * Promoção que segura os produtos dela: ligada e não encerrada. Outra
 * promoção de produto em uso não pode ter os mesmos produtos.
 */
export function holdsProducts(
  promotion: {
    isActive: boolean;
    schedule: PromotionSchedule;
  },
  now: Date,
): boolean {
  const status = promotionStatus(promotion, now);
  return status === "active" || status === "scheduled";
}

/**
 * Produtos já em uso por promoções de produto ligadas e não encerradas,
 * com o nome da promoção que segura cada um. exceptId tira a promoção que
 * está sendo editada.
 */
export function heldProducts(
  promotions: readonly {
    id: string;
    kind: string;
    name: string;
    isActive: boolean;
    schedule: PromotionSchedule;
    productIds: readonly string[];
  }[],
  now: Date,
  exceptId?: string,
): Map<string, string> {
  const held = new Map<string, string>();
  for (const promotion of promotions) {
    if (
      promotion.id === exceptId ||
      promotion.kind !== "product_discount" ||
      !holdsProducts(promotion, now)
    ) {
      continue;
    }
    for (const productId of promotion.productIds) {
      if (!held.has(productId))
        held.set(productId, promotion.name);
    }
  }
  return held;
}
