import { describe, expect, it } from "vitest";

import { holdsProducts, promotionStatus } from "./status";

// Terça, 24/11/2026, 18:30 em São Paulo (UTC-3).
const tuesdayEvening = new Date("2026-11-24T21:30:00Z");

describe("promotionStatus", () => {
  it("desligada fica pausada, qualquer que seja o período", () => {
    expect(
      promotionStatus(
        { isActive: false, schedule: { type: "always" } },
        tuesdayEvening,
      ),
    ).toBe("paused");
  });

  it("dias e horários, de from inclusive a to exclusive", () => {
    const happyHour = {
      isActive: true,
      schedule: {
        type: "weekly" as const,
        weekdays: [2],
        from: "18:30",
        to: "20:00",
      },
    };
    expect(promotionStatus(happyHour, tuesdayEvening)).toBe(
      "active",
    );
    expect(
      promotionStatus(
        happyHour,
        new Date("2026-11-24T23:00:00Z"),
      ),
    ).toBe("scheduled");
    expect(
      promotionStatus(
        {
          isActive: true,
          schedule: { type: "weekly", weekdays: [3] },
        },
        tuesdayEvening,
      ),
    ).toBe("scheduled");
  });

  it("entre datas: agendada, ativa e encerrada pelo dia de São Paulo", () => {
    const december = {
      isActive: true,
      schedule: {
        type: "dates" as const,
        start: "2026-11-25",
        end: "2026-12-24",
      },
    };
    expect(promotionStatus(december, tuesdayEvening)).toBe(
      "scheduled",
    );
    // 25/11 01:00 UTC ainda é dia 24 em São Paulo.
    expect(
      promotionStatus(
        december,
        new Date("2026-11-25T01:00:00Z"),
      ),
    ).toBe("scheduled");
    expect(
      promotionStatus(
        december,
        new Date("2026-12-25T02:59:00Z"),
      ),
    ).toBe("active");
    expect(
      promotionStatus(
        december,
        new Date("2026-12-25T03:00:00Z"),
      ),
    ).toBe("ended");
  });
});

describe("holdsProducts", () => {
  it("ligada e não encerrada segura os produtos", () => {
    const schedule = {
      type: "dates" as const,
      start: "2026-01-01",
      end: "2026-01-31",
    };
    expect(
      holdsProducts(
        { isActive: true, schedule },
        tuesdayEvening,
      ),
    ).toBe(false);
    expect(
      holdsProducts(
        {
          isActive: true,
          schedule: { type: "weekly", weekdays: [0] },
        },
        tuesdayEvening,
      ),
    ).toBe(true);
    expect(
      holdsProducts(
        { isActive: false, schedule: { type: "always" } },
        tuesdayEvening,
      ),
    ).toBe(false);
  });
});
