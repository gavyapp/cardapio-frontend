// Status da loja no cardápio público: aberta ou fechada e, quando fechada,
// o texto do próximo horário de abertura ("abre hoje às 18h").
//
// Quem diz se a loja está aberta é o banco (is_store_open, a mesma função que
// o create_order usa). Aqui fica só o que o banco não devolve: quando ela
// abre de novo. Tudo no fuso de São Paulo, como no banco.

export const STORE_TIME_ZONE = "America/Sao_Paulo";

/** Turno de funcionamento. Horas como "HH:MM" ou "HH:MM:SS". */
export type Shift = {
  /** 0 = domingo … 6 = sábado, como em store_hours.weekday. */
  weekday: number;
  opensAt: string;
  closesAt: string;
};

export type NextOpening = {
  /** Dias a partir de hoje: 0 = hoje, 1 = amanhã, até 7. */
  daysAhead: number;
  weekday: number;
  /** "HH:MM" */
  time: string;
};

export type StoreStatus = {
  isOpen: boolean;
  /** Só quando fechada pelo horário; fechada manualmente não tem previsão. */
  nextOpeningLabel: string | null;
  /** Só quando aberta pelo horário; aberta manualmente não tem previsão. */
  closingLabel: string | null;
};

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const localParts = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Dia da semana e minutos desde a meia-noite, no fuso da loja. */
export function localMoment(now: Date): {
  weekday: number;
  minutes: number;
} {
  const parts = Object.fromEntries(
    localParts
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: WEEKDAY_INDEX[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/**
 * Próxima abertura depois de `now`, olhando até a mesma hora da semana que
 * vem. Chame só com a loja fechada. Sem turnos, devolve null.
 */
export function findNextOpening(
  shifts: readonly Shift[],
  now: Date,
): NextOpening | null {
  const { weekday, minutes } = localMoment(now);

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const day = (weekday + daysAhead) % 7;
    const starts = shifts
      .filter((shift) => shift.weekday === day)
      .map((shift) => toMinutes(shift.opensAt))
      // Hoje, só o que ainda vai abrir; daqui a 7 dias, só o que já passou.
      .filter((start) =>
        daysAhead === 0
          ? start > minutes
          : daysAhead === 7
            ? start <= minutes
            : true,
      )
      .sort((a, b) => a - b);

    if (starts.length) {
      const start = starts[0];
      const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
      return { daysAhead, weekday: day, time };
    }
  }
  return null;
}

/**
 * Hora de fechamento ("HH:MM") do turno em andamento em `now`, contando o
 * turno de ontem que passou da meia-noite. Null fora de qualquer turno.
 */
export function findCurrentClosing(
  shifts: readonly Shift[],
  now: Date,
): string | null {
  const { weekday, minutes } = localMoment(now);
  const yesterday = (weekday + 6) % 7;

  for (const shift of shifts) {
    const opens = toMinutes(shift.opensAt);
    const closes = toMinutes(shift.closesAt);
    const crossesMidnight = closes <= opens;

    const startedToday =
      shift.weekday === weekday &&
      minutes >= opens &&
      (crossesMidnight || minutes < closes);
    const startedYesterday =
      shift.weekday === yesterday &&
      crossesMidnight &&
      minutes < closes;

    if (startedToday || startedYesterday) {
      return shift.closesAt.slice(0, 5);
    }
  }
  return null;
}

/** "18:00" → "18h"; "18:30" → "18h30". */
export function formatOpeningTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = String(Number(hours));
  return minutes === "00"
    ? `${hour}h`
    : `${hour}h${minutes}`;
}

/** "abre hoje às 18h", "abre amanhã às 11h", "abre sexta às 18h30". */
export function formatNextOpening(
  opening: NextOpening,
): string {
  const when =
    opening.daysAhead === 0
      ? "hoje"
      : opening.daysAhead === 1
        ? "amanhã"
        : WEEKDAYS[opening.weekday];
  return `abre ${when} às ${formatOpeningTime(opening.time)}`;
}

/**
 * Status para a tela. `isOpen` vem do banco; `override` é o botão manual da
 * loja (stores.is_open_override): com ele ligado não há previsão de mudança.
 */
export function resolveStoreStatus({
  isOpen,
  override,
  shifts,
  now,
}: {
  isOpen: boolean;
  override: boolean | null;
  shifts: readonly Shift[];
  now: Date;
}): StoreStatus {
  if (override !== null) {
    return {
      isOpen,
      nextOpeningLabel: null,
      closingLabel: null,
    };
  }
  if (isOpen) {
    const closing = findCurrentClosing(shifts, now);
    return {
      isOpen: true,
      nextOpeningLabel: null,
      closingLabel: closing
        ? `fecha às ${formatOpeningTime(closing)}`
        : null,
    };
  }
  const opening = findNextOpening(shifts, now);
  return {
    isOpen: false,
    nextOpeningLabel: opening
      ? formatNextOpening(opening)
      : null,
    closingLabel: null,
  };
}
