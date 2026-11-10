import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeSample } from "./theme-sample";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Separator } from "@/components/atoms/separator";
import { formatCurrency, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Amostra" };

const COLORS = [
  ["Fundo da página", "bg-background", "#F3F4F6"],
  ["Superfície", "bg-card", "#FFFFFF"],
  ["Borda", "bg-border", "#D9DCE1"],
  ["Texto secundário", "bg-muted-foreground", "#5C636D"],
  ["Texto e ação primária", "bg-primary", "#16191D"],
] as const;

const STATES = [
  ["Âmbar · pedido novo", "bg-warning", "bg-warning-soft"],
  [
    "Vermelho · atraso, erro, destrutivo",
    "bg-destructive",
    "bg-destructive-soft",
  ],
  [
    "Verde · aberta, pronto, promoção ativa",
    "bg-success",
    "bg-success-soft",
  ],
] as const;

const TYPOGRAPHY = [
  [
    "40 · Número grande",
    "text-big-number leading-none font-semibold tabular",
    "R$ 1.284,50 · #1046",
  ],
  [
    "24 · Título da página",
    "text-page-title font-semibold",
    "Pedidos de hoje",
  ],
  [
    "18 · Título de seção",
    "text-section-title font-semibold",
    "Mais vendidos",
  ],
  [
    "15 · Texto padrão",
    "text-body",
    "The Classic · Salvar alterações",
  ],
  [
    "13 · Texto secundário",
    "text-support text-muted-foreground",
    "Pedido às 19:42 · Retirada no balcão",
  ],
  [
    "12 · Legenda",
    "text-caption font-medium text-muted-foreground",
    "Pedidos (7 dias)",
  ],
] as const;

const CURRENCY_SAMPLES = [0, 0.5, 7, 37.9, 1234.5, 1000000];
const PHONE_SAMPLES = [
  "48999990000",
  "4833334444",
  "+55 (48) 99999-0000",
  "9999",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-section-title font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Só fora de produção: desenvolvimento e previews da Vercel.
export default function SamplePage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold">
          Base visual
        </h1>
        <p className="text-support text-muted-foreground">
          Tokens e componentes do protótipo v9. Esta página
          não existe em produção.
        </p>
      </header>

      <Section title="Cores">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {COLORS.map(([name, className, hex]) => (
            <div key={name} className="flex flex-col gap-2">
              <div
                className={`h-14 rounded-control border ${className}`}
              />
              <p className="text-support font-medium">
                {name}
              </p>
              <p className="text-caption text-muted-foreground">
                {hex}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STATES.map(([name, strong, soft]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className="flex h-12 overflow-hidden rounded-control border">
                <div className={`flex-1 ${strong}`} />
                <div className={`flex-1 ${soft}`} />
              </div>
              <p className="text-support font-medium">
                {name}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="divide-y divide-border rounded-control border bg-card">
          {TYPOGRAPHY.map(([name, className, example]) => (
            <div
              key={name}
              className="grid items-center gap-2 p-4 sm:grid-cols-[200px_1fr]"
            >
              <p className="text-caption text-muted-foreground">
                {name}
              </p>
              <p className={className}>{example}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Salvar</Button>
          <Button variant="outline">Cancelar</Button>
          <Button variant="ghost">Duplicar</Button>
          <Button variant="destructive">
            Cancelar pedido
          </Button>
          <Button disabled>Salvar</Button>
          <Separator
            orientation="vertical"
            className="h-6"
          />
          <Button size="sm">Salvar</Button>
          <Button size="sm" variant="outline">
            Editar
          </Button>
          <Button size="sm" variant="destructive">
            Excluir
          </Button>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="normal">Rótulo</Label>
            <Input id="normal" defaultValue="The Classic" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desabilitado">
              Desabilitado
            </Label>
            <Input
              id="desabilitado"
              defaultValue="The Classic"
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="erro">Com erro</Label>
            <Input
              id="erro"
              defaultValue="The Classic"
              aria-invalid
            />
            <p className="text-support text-destructive">
              Informe um valor válido.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Selos de status">
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning-solid">Novo</Badge>
          <Badge variant="destructive">Atrasado</Badge>
          <Badge variant="muted">Em preparo</Badge>
          <Badge variant="success">
            Pronto para retirada
          </Badge>
          <Badge variant="success">Ativa agora</Badge>
          <Badge variant="neutral">Agendada</Badge>
          <Badge variant="muted">Encerrada</Badge>
        </div>
      </Section>

      <Section title="Formatadores">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Moeda</CardTitle>
              <CardDescription>
                formatCurrency
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1 text-body">
              {CURRENCY_SAMPLES.map((v) => (
                <div key={v} className="contents">
                  <span className="text-muted-foreground">
                    {v}
                  </span>
                  <span className="tabular">
                    {formatCurrency(v)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Telefone</CardTitle>
              <CardDescription>formatPhone</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1 text-body">
              {PHONE_SAMPLES.map((t) => (
                <div key={t} className="contents">
                  <span className="text-muted-foreground">
                    {t}
                  </span>
                  <span className="tabular">
                    {formatPhone(t)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Tema por loja">
        <p className="-mt-2 text-support text-muted-foreground">
          A cor principal vem de stores.settings e vira
          variáveis CSS no layout da loja. O texto sobre ela
          é escolhido pelo contraste.
        </p>
        <ThemeSample />
      </Section>
    </main>
  );
}
