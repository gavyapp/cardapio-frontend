"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar, type EstadoDoLogin } from "./acoes";

const estadoInicial: EstadoDoLogin = { erro: null, email: "" };

export function FormularioDeLogin({ destino }: { destino: string }) {
  const [estado, enviar, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={enviar} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="proximo" value={destino} />
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={estado.email}
          aria-invalid={estado.erro ? true : undefined}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          aria-invalid={estado.erro ? true : undefined}
          required
        />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
