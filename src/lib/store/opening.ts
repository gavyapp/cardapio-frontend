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
  /** Quando fechada: "abre hoje às 18h", pelo horário ou pelo prazo do botão. */
  nextOpeningLabel: string | null;
  /** Quando aberta: "fecha às 23h", pelo horário ou pelo prazo do botão. */
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
 * Status para a tela. `isOpen` vem do banco; `override` e `overrideUntil` são
 * o botão do painel (stores.is_open_override e open_override_until). Com o
 * botão valendo, a previsão vem do prazo dele: fechada até a próxima
 * abertura, aberta até o próximo fechamento.
 */
export function resolveStoreStatus({
  isOpen,
  override,
  overrideUntil,
  shifts,
  now,
}: {
  isOpen: boolean;
  override: boolean | null;
  overrideUntil: Date | null;
  shifts: readonly Shift[];
  now: Date;
}): StoreStatus {
  const manual = activeOverride(
    override,
    overrideUntil,
    now,
  );
  if (manual !== null) {
    const deadline = overrideUntil
      ? deadlineMoment(overrideUntil, now)
      : null;
    return {
      isOpen,
      nextOpeningLabel:
        !isOpen && deadline
          ? formatNextOpening(deadline)
          : null,
      closingLabel:
        isOpen && deadline ? formatClosing(deadline) : null,
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

// Botão do painel ---------------------------------------------------------
//
// O lojista escolhe seguir o horário, abrir agora ou fechar agora. Abrir ou
// fechar vale só até a próxima virada do horário, não para sempre: quem
// fecha na quinta às 22h quer a loja abrindo sozinha na sexta. O banco
// guarda o prazo (open_override_until) e is_store_open ignora o botão
// depois dele.

/** Escolha do botão do painel. */
export type OpeningMode = "schedule" | "open" | "closed";

/** O botão no momento: null quando não foi usado ou o prazo já venceu. */
export function activeOverride(
  override: boolean | null,
  until: Date | null,
  now: Date,
): boolean | null {
  if (override === null) return null;
  if (until && now >= until) return null;
  return override;
}

/** Aberta pelo horário em `now`, a mesma regra de is_store_open. */
export function isOpenBySchedule(
  shifts: readonly Shift[],
  now: Date,
): boolean {
  return findCurrentClosing(shifts, now) !== null;
}

const MINUTES_IN_DAY = 24 * 60;

/** `now` mais `minutes`, sem os segundos. São Paulo não tem horário de verão. */
function minutesFromNow(now: Date, minutes: number): Date {
  const startOfMinute =
    Math.floor(now.getTime() / 60_000) * 60_000;
  return new Date(startOfMinute + minutes * 60_000);
}

/**
 * Até quando vale abrir ou fechar agora.
 * - Fechar: até a próxima abertura pelo horário. Sem turnos, até mudar à
 *   mão (null).
 * - Abrir: até o fechamento do turno em andamento ou do próximo que começa
 *   hoje, no máximo até a meia-noite, para a loja aberta fora do horário não
 *   ficar aberta a noite toda.
 */
export function manualOpeningDeadline(
  mode: "open" | "closed",
  shifts: readonly Shift[],
  now: Date,
): Date | null {
  const { weekday, minutes } = localMoment(now);

  if (mode === "closed") {
    const opening = findNextOpening(shifts, now);
    if (!opening) return null;
    return minutesFromNow(
      now,
      opening.daysAhead * MINUTES_IN_DAY +
        toMinutes(opening.time) -
        minutes,
    );
  }

  const untilMidnight = MINUTES_IN_DAY - minutes;
  const yesterday = (weekday + 6) % 7;
  let closesIn = untilMidnight;

  for (const shift of shifts) {
    const opens = toMinutes(shift.opensAt);
    const closes = toMinutes(shift.closesAt);
    const crossesMidnight = closes <= opens;
    // Turno de hoje que ainda não fechou (em andamento ou mais tarde), ou o
    // de ontem que passou da meia-noite. Turno de hoje que passa da
    // meia-noite fica no limite da meia-noite.
    const laterToday =
      shift.weekday === weekday &&
      !crossesMidnight &&
      minutes < closes;
    const fromYesterday =
      shift.weekday === yesterday &&
      crossesMidnight &&
      minutes < closes;
    if (laterToday || fromYesterday) {
      closesIn = Math.min(closesIn, closes - minutes);
    }
  }
  return minutesFromNow(now, closesIn);
}

const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dias de calendário, no fuso da loja, entre `now` e `at`. */
function daysBetween(now: Date, at: Date): number {
  const day = (date: Date) =>
    Date.parse(`${localDate.format(date)}T00:00:00Z`);
  return Math.round((day(at) - day(now)) / 86_400_000);
}

/** Um prazo no mesmo formato da próxima abertura (dia relativo e hora). */
function deadlineMoment(
  until: Date,
  now: Date,
): NextOpening {
  const { weekday, minutes } = localMoment(until);
  return {
    daysAhead: daysBetween(now, until),
    weekday,
    time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  };
}

function isMidnight(moment: NextOpening): boolean {
  return moment.daysAhead === 1 && moment.time === "00:00";
}

/** "fecha às 23h" ou "fecha à meia-noite". */
function formatClosing(moment: NextOpening): string {
  return isMidnight(moment)
    ? "fecha à meia-noite"
    : `fecha às ${formatOpeningTime(moment.time)}`;
}

/**
 * Prazo do botão para o painel: "23h" (hoje), "meia-noite",
 * "amanhã às 19h" ou "sexta às 19h".
 */
export function formatDeadline(
  until: Date,
  now: Date,
): string {
  const moment = deadlineMoment(until, now);
  if (isMidnight(moment)) return "meia-noite";
  const time = formatOpeningTime(moment.time);
  if (moment.daysAhead <= 0) return time;
  const when =
    moment.daysAhead === 1
      ? "amanhã"
      : WEEKDAYS[moment.weekday];
  return `${when} às ${time}`;
}

/**
 * O que gravar para cada escolha do botão. "Abrir loja" na barra de aviso
 * usa `reopenMode`: volta ao horário se ele já está aberto, senão abre agora.
 */
export function manualOpeningFor(
  mode: OpeningMode,
  shifts: readonly Shift[],
  now: Date,
): { override: boolean | null; until: Date | null } {
  if (mode === "schedule")
    return { override: null, until: null };
  return {
    override: mode === "open",
    until: manualOpeningDeadline(mode, shifts, now),
  };
}

/** Modo que reabre a loja fechada à mão: o horário, se já abriu; senão, agora. */
export function reopenMode(
  shifts: readonly Shift[],
  now: Date,
): OpeningMode {
  return isOpenBySchedule(shifts, now)
    ? "schedule"
    : "open";
}
