"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { uploadStoreImage } from "@/lib/data/store-image-upload";
import {
  ACCEPTED_IMAGE_TYPES,
  type StoreImageKind,
} from "@/lib/store/images";
import { cn } from "@/lib/utils";

/**
 * Prévia da imagem com "Enviar", "Trocar" e "Remover". O arquivo sobe assim
 * que é escolhido; quem usa recebe a URL nova em onChange e grava no
 * registro ao salvar. A imagem antiga só é apagada nesse salvamento.
 */
export function ImagePicker({
  storeId,
  kind,
  value,
  onChange,
  label = "Foto",
  aspect = "square",
  uploadLabel = "Enviar foto",
}: {
  storeId: string;
  kind: StoreImageKind;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: "square" | "wide";
  /** Texto do botão quando ainda não há imagem. */
  uploadLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startUpload(async () => {
      const result = await uploadStoreImage({
        storeId,
        kind,
        file,
      });
      if (result.ok) onChange(result.url);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-control border bg-muted text-muted-foreground",
          aspect === "square" ? "size-24" : "h-24 w-56",
        )}
      >
        {value ? (
          // A imagem já chega reduzida em WebP; o otimizador do Next não
          // acrescenta nada aqui.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon aria-hidden className="size-6" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading
              ? "Enviando…"
              : value
                ? "Trocar"
                : uploadLabel}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            >
              Remover
            </Button>
          ) : null}
        </div>
        <p
          className={cn(
            "text-meta",
            error
              ? "text-destructive"
              : "text-muted-foreground",
          )}
          role={error ? "alert" : undefined}
        >
          {error ??
            "JPG, PNG ou WebP. Fotos grandes são reduzidas."}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
