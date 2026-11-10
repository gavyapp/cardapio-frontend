"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Setas para cima e para baixo levam o centro do item arrastado ao centro do
 * vizinho. O padrão do dnd-kit alinha pelas bordas e não troca de lugar
 * quando os itens têm alturas diferentes (categoria aberta ao lado de
 * fechada, grupo com aviso ao lado de grupo sem).
 */
const verticalKeyboardCoordinates: KeyboardCoordinateGetter =
  (event, args) => {
    const down = event.code === "ArrowDown";
    if (!down && event.code !== "ArrowUp") {
      return sortableKeyboardCoordinates(event, args);
    }
    event.preventDefault();
    const {
      active,
      collisionRect,
      droppableRects,
      droppableContainers,
    } = args.context;
    if (!active || !collisionRect) return undefined;

    const activeCenter =
      collisionRect.top + collisionRect.height / 2;
    let target: number | null = null;
    for (const container of droppableContainers.getEnabled()) {
      if (container.id === active.id) continue;
      const rect = droppableRects.get(container.id);
      if (!rect) continue;
      const center = rect.top + rect.height / 2;
      const ahead = down
        ? center > activeCenter + 1
        : center < activeCenter - 1;
      if (
        ahead &&
        (target === null ||
          Math.abs(center - activeCenter) <
            Math.abs(target - activeCenter))
      ) {
        target = center;
      }
    }
    if (target === null) return undefined;
    return {
      x: args.currentCoordinates.x,
      y:
        args.currentCoordinates.y + (target - activeCenter),
    };
  };

/**
 * Lista que reordena arrastando pela alça (mouse, toque ou teclado: foco na
 * alça, espaço, setas e espaço de novo). Devolve a nova ordem em onReorder.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  handleLabel,
  className,
  itemClassName,
}: {
  items: readonly T[];
  onReorder: (items: T[]) => void;
  /** dragHandle é a alça pronta, para pôr onde a linha quiser. */
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode;
  /** Nome acessível da alça, ex.: "Mover Burgers". */
  handleLabel: (item: T) => string;
  className?: string;
  /** Classe de cada item (ex.: cantos arredondados de cartão). */
  itemClassName?: string;
}) {
  // Id estável entre servidor e navegador (evita erro de hidratação).
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: verticalKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(
      (item) => item.id === active.id,
    );
    const to = items.findIndex(
      (item) => item.id === over.id,
    );
    if (from === -1 || to === -1) return;
    onReorder(arrayMove([...items], from, to));
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Para mover, aperte espaço, use as setas e aperte espaço de novo para soltar. Esc cancela.",
        },
      }}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={className}>
          {items.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              handleLabel={handleLabel(item)}
              className={itemClassName}
            >
              {(dragHandle) => renderItem(item, dragHandle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  handleLabel,
  className,
  children,
}: {
  id: string;
  handleLabel: string;
  className?: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const dragHandle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      // A alça fica dentro de linhas clicáveis (abrir editor, expandir
      // categoria); o clique nela, ou o espaço do teclado, é só para mover.
      onClick={(event) => event.stopPropagation()}
      aria-label={handleLabel}
      className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-foreground active:cursor-grabbing"
    >
      <GripVertical aria-hidden className="size-4.5" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "relative bg-card",
        isDragging && "z-10 shadow-elevated",
        className,
      )}
    >
      {children(dragHandle)}
    </li>
  );
}
