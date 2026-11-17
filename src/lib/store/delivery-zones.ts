// Taxa de entrega por bairro. A loja cadastra os bairros que atende com o
// valor de cada um (stores.settings.delivery_zones); a taxa única
// (delivery_fee) vale para os outros locais. Sem bairros cadastrados, a loja
// cobra a taxa única de todos. O create_order aplica a mesma regra. Puro,
// sem React, para ser testável.
import { normalizeSearch } from "@/lib/format";

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
};

type DeliveryRules = {
  /** Taxa de outros locais; taxa única quando não há bairros. */
  deliveryFee: number;
  deliveryZones: readonly DeliveryZone[];
};

/** Escolha "Outro bairro" no checkout: o cliente digita o nome. */
export const OTHER_ZONE = "other";

/** A loja cobra por bairro? */
export function hasDeliveryZones(
  rules: Pick<DeliveryRules, "deliveryZones">,
): boolean {
  return rules.deliveryZones.length > 0;
}

/**
 * Taxa do bairro escolhido. Sem bairro, com "Outro bairro" ou com um bairro
 * que não existe mais, vale a taxa de outros locais.
 */
export function deliveryFeeFor(
  rules: DeliveryRules,
  zoneId: string | null | undefined,
): number {
  const zone = rules.deliveryZones.find(
    (candidate) => candidate.id === zoneId,
  );
  return zone ? zone.fee : rules.deliveryFee;
}

/** Menor taxa que a loja cobra, para o "a partir de". */
export function lowestDeliveryFee(
  rules: DeliveryRules,
): number {
  return Math.min(
    rules.deliveryFee,
    ...rules.deliveryZones.map((zone) => zone.fee),
  );
}

/**
 * Bairro cadastrado com este nome, sem diferenciar acento, maiúscula ou
 * espaço nas pontas. Serve para reconhecer o bairro de um endereço guardado
 * como texto.
 */
export function findZoneByName(
  zones: readonly DeliveryZone[],
  name: string,
): DeliveryZone | null {
  const wanted = normalizeSearch(name);
  if (!wanted) return null;
  return (
    zones.find(
      (zone) => normalizeSearch(zone.name) === wanted,
    ) ?? null
  );
}
