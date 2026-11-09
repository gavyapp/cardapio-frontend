import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";
import { cn } from "@/lib/utils";

// Selos do protótipo ("Selos de status"): 24px, texto de 12px, canto de 4px.
// `lg` é o selo maior do detalhe do pedido ("Pago", 28px e 13px).
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-control border border-transparent font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        // Cinza com texto escuro ("Agendada", "Entregue").
        neutral: "bg-muted text-foreground",
        // Cinza com texto apagado ("Em preparo", "Encerrada", "Sugerido").
        muted: "bg-muted text-muted-foreground",
        // Fundo claro com texto forte.
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-foreground",
        destructive: "bg-destructive-soft text-destructive",
        // Âmbar médio: "Aguardando aceite".
        pending: "bg-warning-medium text-foreground",
        // Sólidos: "Novo", "Pago", "Aberta", "Saiu para entrega".
        new: "bg-warning text-warning-foreground",
        "success-solid":
          "bg-success text-success-foreground",
        inverse: "bg-foreground text-background",
        outline: "border-border text-foreground",
      },
      size: {
        default:
          "h-6 gap-1.5 px-2 text-caption [&>svg:not([class*='size-'])]:size-3",
        lg: "h-7 gap-1 px-2.5 text-meta [&>svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          badgeVariants({ variant, size }),
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

export { Badge, badgeVariants, type BadgeVariant };
