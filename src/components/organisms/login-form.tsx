"use client";

import { useActionState } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";

export type LoginState = {
  error: string | null;
  email: string;
};

type LoginAction = (
  state: LoginState,
  form: FormData,
) => Promise<LoginState>;

const INITIAL_STATE: LoginState = {
  error: null,
  email: "",
};

export function LoginForm({
  action,
  redirectTo,
}: {
  action: LoginAction;
  redirectTo: string;
}) {
  const [state, submit, pending] = useActionState(
    action,
    INITIAL_STATE,
  );

  return (
    <form
      action={submit}
      className="flex flex-col gap-4"
      noValidate
    >
      <input
        type="hidden"
        name="proximo"
        value={redirectTo}
      />
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
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
          aria-invalid={state.error ? true : undefined}
          required
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
