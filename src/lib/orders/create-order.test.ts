import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { clientIp, orderAttemptKeys } from "./attempt-keys";
import {
  CREATE_ORDER_ERROR_CODES,
  createOrderError,
  refusalFromDatabase,
} from "./create-order";

const MIGRATIONS = join(
  process.cwd(),
  "supabase/migrations",
);

/** Códigos que o create_order em vigor levanta no HINT. */
function hintsInDatabase(): string[] {
  // A definição em vigor é a da última migration que recria a função.
  const file = readdirSync(MIGRATIONS)
    .sort()
    .filter((name) =>
      readFileSync(join(MIGRATIONS, name), "utf8").includes(
        "function public.create_order",
      ),
    )
    .at(-1);
  if (!file)
    throw new Error(
      "create_order não encontrado nas migrations",
    );

  const sql = readFileSync(join(MIGRATIONS, file), "utf8");
  const start = sql.indexOf(
    "create or replace function public.create_order",
  );
  const body = sql.slice(
    start,
    sql.indexOf("$function$;", start),
  );
  return [...body.matchAll(/hint = '([a-z_]+)'/g)].map(
    (m) => m[1],
  );
}

describe("códigos de recusa: banco e rota em acordo", () => {
  const hints = hintsInDatabase();

  it("toda recusa do create_order tem código no HINT", () => {
    const sql = readFileSync(
      join(
        MIGRATIONS,
        "20261112120000_create_order_refusal_codes.sql",
      ),
      "utf8",
    );
    const raises =
      sql.match(/raise exception/g)?.length ?? 0;
    expect(raises).toBeGreaterThan(0);
    expect(hints).toHaveLength(raises);
  });

  it("todo código do banco é conhecido pela rota", () => {
    for (const hint of new Set(hints)) {
      expect(
        refusalFromDatabase({ hint, detail: null }, []),
        `HINT "${hint}" sem tradução em refusalFromDatabase`,
      ).not.toBeNull();
      expect(CREATE_ORDER_ERROR_CODES).toContain(hint);
    }
  });
});

describe("refusalFromDatabase", () => {
  const items = [
    { productId: "a" },
    { productId: "b" },
    { productId: "a" },
  ];

  it("recusa de item → posições de todos os itens daquele produto", () => {
    expect(
      refusalFromDatabase(
        { hint: "item_unavailable", detail: "a" },
        items,
      ),
    ).toEqual({
      code: "item_unavailable",
      itemIndexes: [0, 2],
    });
    expect(
      refusalFromDatabase(
        { hint: "invalid_complement", detail: "b" },
        items,
      ),
    ).toEqual({
      code: "invalid_complement",
      itemIndexes: [1],
    });
  });

  it("produto que não está no pedido → só o código", () => {
    expect(
      refusalFromDatabase(
        { hint: "item_unavailable", detail: "z" },
        items,
      ),
    ).toEqual({ code: "item_unavailable" });
  });

  it("recusa do pedido inteiro → só o código", () => {
    expect(
      refusalFromDatabase(
        { hint: "minimum_order", detail: null },
        items,
      ),
    ).toEqual({ code: "minimum_order" });
  });

  it("sem código, ou código que não vem do banco → null", () => {
    expect(
      refusalFromDatabase(
        { hint: null, detail: null },
        items,
      ),
    ).toBeNull();
    expect(
      refusalFromDatabase(
        { hint: "rate_limited", detail: null },
        items,
      ),
    ).toBeNull();
    expect(
      refusalFromDatabase(
        { hint: "novo_codigo", detail: null },
        items,
      ),
    ).toBeNull();
  });
});

describe("createOrderError", () => {
  it("cada código tem status e mensagem", () => {
    for (const code of CREATE_ORDER_ERROR_CODES) {
      const { status, body } = createOrderError(code);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(body.ok).toBe(false);
      if (!body.ok)
        expect(body.error.message.length).toBeGreaterThan(
          0,
        );
    }
    expect(createOrderError("rate_limited").status).toBe(
      429,
    );
    expect(createOrderError("invalid_request").status).toBe(
      400,
    );
    expect(createOrderError("unexpected").status).toBe(500);
  });
});

describe("chaves do limite de tentativas", () => {
  const origin = {
    ip: "203.0.113.7",
    phone: "(48) 99999-0000",
  };

  it("não deixa o IP nem o telefone em texto", () => {
    const keys = orderAttemptKeys(origin, "segredo");
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^ip:[0-9a-f]{64}$/);
    expect(keys[1]).toMatch(/^phone:[0-9a-f]{64}$/);
    expect(keys.join()).not.toContain("203.0.113.7");
    expect(keys.join()).not.toContain("48999990000");
  });

  it("mesma origem → mesmas chaves; telefone formatado ou não", () => {
    expect(orderAttemptKeys(origin, "segredo")).toEqual(
      orderAttemptKeys(
        { ip: "203.0.113.7", phone: "48999990000" },
        "segredo",
      ),
    );
  });

  it("outro segredo → outras chaves", () => {
    expect(orderAttemptKeys(origin, "segredo")).not.toEqual(
      orderAttemptKeys(origin, "outro"),
    );
  });

  it("IP: primeiro de x-forwarded-for, depois x-real-ip, senão unknown", () => {
    expect(
      clientIp(
        new Headers({
          "x-forwarded-for": "1.2.3.4, 10.0.0.1",
        }),
      ),
    ).toBe("1.2.3.4");
    expect(
      clientIp(new Headers({ "x-real-ip": "5.6.7.8" })),
    ).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
