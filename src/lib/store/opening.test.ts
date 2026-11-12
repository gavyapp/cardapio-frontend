import { describe, expect, it } from "vitest";

import {
  findCurrentClosing,
  findNextOpening,
  formatNextOpening,
  formatOpeningTime,
  localMoment,
  resolveStoreStatus,
  type Shift,
} from "./opening";

// São Paulo é UTC-3 o ano todo. 2026-11-13 é uma sexta-feira.
const saoPaulo = (date: string, time: string) =>
  new Date(`${date}T${time}:00-03:00`);

const SEXTA = "2026-11-13";
const SABADO = "2026-11-14";
const DOMINGO = "2026-11-15";

const shift = (
  weekday: number,
  opensAt: string,
  closesAt: string,
): Shift => ({ weekday, opensAt, closesAt });

describe("localMoment", () => {
  it("usa o fuso de São Paulo, não o do servidor", () => {
    // 01:30 UTC de sábado ainda é sexta 22:30 em São Paulo.
    expect(
      localMoment(new Date("2026-11-14T01:30:00Z")),
    ).toEqual({
      weekday: 5,
      minutes: 22 * 60 + 30,
    });
  });
});

describe("findNextOpening", () => {
  it("sem turnos → sem previsão", () => {
    expect(
      findNextOpening([], saoPaulo(SEXTA, "10:00")),
    ).toBeNull();
  });

  it("antes do turno de hoje → hoje", () => {
    const shifts = [shift(5, "18:30:00", "23:00:00")];
    expect(
      findNextOpening(shifts, saoPaulo(SEXTA, "10:00")),
    ).toEqual({
      daysAhead: 0,
      weekday: 5,
      time: "18:30",
    });
  });

  it("dois turnos no dia, entre um e outro → o segundo de hoje", () => {
    const shifts = [
      shift(5, "18:00", "23:00"),
      shift(5, "11:00", "14:00"),
    ];
    expect(
      findNextOpening(shifts, saoPaulo(SEXTA, "15:00")),
    ).toEqual({
      daysAhead: 0,
      weekday: 5,
      time: "18:00",
    });
  });

  it("dois turnos no dia, antes do primeiro → o primeiro", () => {
    const shifts = [
      shift(5, "18:00", "23:00"),
      shift(5, "11:00", "14:00"),
    ];
    expect(
      findNextOpening(shifts, saoPaulo(SEXTA, "09:00"))
        ?.time,
    ).toBe("11:00");
  });

  it("depois do último turno de hoje → amanhã", () => {
    const shifts = [
      shift(5, "18:00", "23:00"),
      shift(6, "11:00", "23:00"),
    ];
    expect(
      findNextOpening(shifts, saoPaulo(SEXTA, "23:30")),
    ).toEqual({
      daysAhead: 1,
      weekday: 6,
      time: "11:00",
    });
  });

  it("turno que passa da meia-noite, já encerrado de madrugada → o de hoje à noite", () => {
    // Sexta 18:00 às 02:00 e sábado 18:00 às 02:00. Sábado 03:00: fechada.
    const shifts = [
      shift(5, "18:00", "02:00"),
      shift(6, "18:00", "02:00"),
    ];
    expect(
      findNextOpening(shifts, saoPaulo(SABADO, "03:00")),
    ).toEqual({
      daysAhead: 0,
      weekday: 6,
      time: "18:00",
    });
  });

  it("pula dias sem turno até o próximo dia aberto", () => {
    // Só quinta. Domingo → quinta, daqui a 4 dias.
    const shifts = [shift(4, "18:30", "23:00")];
    expect(
      findNextOpening(shifts, saoPaulo(DOMINGO, "12:00")),
    ).toEqual({
      daysAhead: 4,
      weekday: 4,
      time: "18:30",
    });
  });

  it("único turno da semana já passou hoje → mesmo dia da semana que vem", () => {
    const shifts = [shift(5, "18:00", "23:00")];
    expect(
      findNextOpening(shifts, saoPaulo(SEXTA, "23:30")),
    ).toEqual({
      daysAhead: 7,
      weekday: 5,
      time: "18:00",
    });
  });
});

describe("formatNextOpening", () => {
  it("hora cheia sem minutos, quebrada com minutos", () => {
    expect(formatOpeningTime("18:00")).toBe("18h");
    expect(formatOpeningTime("18:30")).toBe("18h30");
    expect(formatOpeningTime("09:05")).toBe("9h05");
  });

  it("hoje, amanhã e dia da semana", () => {
    expect(
      formatNextOpening({
        daysAhead: 0,
        weekday: 5,
        time: "18:00",
      }),
    ).toBe("abre hoje às 18h");
    expect(
      formatNextOpening({
        daysAhead: 1,
        weekday: 6,
        time: "11:00",
      }),
    ).toBe("abre amanhã às 11h");
    expect(
      formatNextOpening({
        daysAhead: 4,
        weekday: 4,
        time: "18:30",
      }),
    ).toBe("abre quinta às 18h30");
  });
});

describe("findCurrentClosing", () => {
  it("dentro do turno → hora de fechar", () => {
    const shifts = [shift(5, "18:00:00", "23:30:00")];
    expect(
      findCurrentClosing(shifts, saoPaulo(SEXTA, "19:00")),
    ).toBe("23:30");
  });

  it("fora de qualquer turno → null", () => {
    const shifts = [shift(5, "18:00", "23:00")];
    expect(
      findCurrentClosing(shifts, saoPaulo(SEXTA, "10:00")),
    ).toBeNull();
  });

  it("dois turnos no dia → fecha no turno em andamento", () => {
    const shifts = [
      shift(5, "11:00", "14:00"),
      shift(5, "18:00", "23:00"),
    ];
    expect(
      findCurrentClosing(shifts, saoPaulo(SEXTA, "12:00")),
    ).toBe("14:00");
    expect(
      findCurrentClosing(shifts, saoPaulo(SEXTA, "20:00")),
    ).toBe("23:00");
  });

  it("turno que passa da meia-noite, ainda no dia em que abriu", () => {
    const shifts = [shift(5, "18:00", "02:00")];
    expect(
      findCurrentClosing(shifts, saoPaulo(SEXTA, "23:30")),
    ).toBe("02:00");
  });

  it("turno que passa da meia-noite, já na madrugada seguinte", () => {
    const shifts = [shift(5, "18:00", "02:00")];
    expect(
      findCurrentClosing(shifts, saoPaulo(SABADO, "01:00")),
    ).toBe("02:00");
    expect(
      findCurrentClosing(shifts, saoPaulo(SABADO, "02:30")),
    ).toBeNull();
  });
});

describe("resolveStoreStatus", () => {
  const shifts = [shift(5, "18:00", "23:00")];
  const now = saoPaulo(SEXTA, "10:00");

  it("fechada pelo horário → fechada com o próximo horário", () => {
    expect(
      resolveStoreStatus({
        isOpen: false,
        override: null,
        shifts,
        now,
      }),
    ).toEqual({
      isOpen: false,
      nextOpeningLabel: "abre hoje às 18h",
      closingLabel: null,
    });
  });

  it("aberta pelo horário → aberta com a hora de fechar", () => {
    expect(
      resolveStoreStatus({
        isOpen: true,
        override: null,
        shifts,
        now: saoPaulo(SEXTA, "19:00"),
      }),
    ).toEqual({
      isOpen: true,
      nextOpeningLabel: null,
      closingLabel: "fecha às 23h",
    });
  });

  it("override aberto fora do horário → aberta, sem hora de fechar", () => {
    expect(
      resolveStoreStatus({
        isOpen: true,
        override: true,
        shifts,
        now,
      }),
    ).toEqual({
      isOpen: true,
      nextOpeningLabel: null,
      closingLabel: null,
    });
  });

  it("override fechado → fechada sem previsão, mesmo com turno hoje", () => {
    expect(
      resolveStoreStatus({
        isOpen: false,
        override: false,
        shifts,
        now,
      }),
    ).toEqual({
      isOpen: false,
      nextOpeningLabel: null,
      closingLabel: null,
    });
  });

  it("fechada e sem nenhum turno → fechada sem previsão", () => {
    expect(
      resolveStoreStatus({
        isOpen: false,
        override: null,
        shifts: [],
        now,
      }),
    ).toEqual({
      isOpen: false,
      nextOpeningLabel: null,
      closingLabel: null,
    });
  });
});
