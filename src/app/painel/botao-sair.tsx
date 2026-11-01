import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { sair } from "./acoes";

export function BotaoSair() {
  return (
    <form action={sair}>
      <Button type="submit" variant="outline">
        <LogOut data-icon="inline-start" />
        Sair
      </Button>
    </form>
  );
}
