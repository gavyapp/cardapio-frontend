"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";

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
  const [showPassword, setShowPassword] = useState(false);
  const invalid = state.error ? true : undefined;

  return (
    <form
      action={submit}
      className="flex flex-col gap-4"
      aria-busy={pending}
      noValidate
    >
      <input
        type="hidden"
        name="proximo"
        value={redirectTo}
      />
      <Field id="email" label="E-mail">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@sualoja.com.br"
          defaultValue={state.email}
          aria-invalid={invalid}
          aria-describedby={
            state.error ? "login-error" : undefined
          }
          readOnly={pending}
          required
        />
      </Field>
      <Field id="senha" label="Senha">
        <div className="relative">
          <Input
            id="senha"
            name="senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={invalid}
            aria-describedby={
              state.error ? "login-error" : undefined
            }
            readOnly={pending}
            required
          />
          <button
            type="button"
            onClick={() =>
              setShowPassword((shown) => !shown)
            }
            aria-label={
              showPassword
                ? "Ocultar senha"
                : "Mostrar senha"
            }
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        </div>
      </Field>
      {state.error && (
        <p
          id="login-error"
          role="alert"
          className="flex items-start gap-2 rounded-control bg-destructive-soft px-3 py-2.5 text-support text-destructive"
        >
          <CircleAlert className="mt-px size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        className="mt-2"
        loading={pending}
      >
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
