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
      coordinateGetter: sortableKeyboardCoordinates,
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
      aria-label={handleLabel}
      className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-foreground active:cursor-grabbing"
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
