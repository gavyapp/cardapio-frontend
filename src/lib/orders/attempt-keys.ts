// Chaves do limite de tentativas de pedido: o IP e o telefone embaralhados
// com um segredo do servidor (HMAC). O banco guarda só o resultado, então
// quem lê a tabela não descobre o IP nem o telefone de ninguém.
import { createHmac } from "node:crypto";

function hashed(
  kind: "ip" | "phone",
  value: string,
  secret: string,
) {
  const digest = createHmac("sha256", secret)
    .update(`${kind}:${value}`)
    .digest("hex");
  return `${kind}:${digest}`;
}

/** Uma chave por origem: IP e telefone (só os dígitos). */
export function orderAttemptKeys(
  origin: { ip: string; phone: string },
  secret: string,
): string[] {
  return [
    hashed("ip", origin.ip.trim().toLowerCase(), secret),
    hashed(
      "phone",
      origin.phone.replace(/\D/g, ""),
      secret,
    ),
  ];
}

/**
 * IP de quem fez a requisição. Na Vercel vem em x-forwarded-for, com o IP
 * do cliente em primeiro. Sem cabeçalho (ambiente local), todos caem na
 * mesma chave "unknown".
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    forwarded ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
