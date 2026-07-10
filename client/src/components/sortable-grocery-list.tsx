import { memo, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroceryItem } from "@shared/schema";
import { GroceryItemComponent, type GroceryItemEditValues } from "@/components/grocery-item";
import { getListItemStaggerAnimation } from "@/lib/list-item-animation";

interface SortableGroceryItemRowProps {
  item: GroceryItem;
  onToggle: (id: number) => void;
  onDelete: (item: GroceryItem) => void;
  onUpdate?: (id: number, updates: GroceryItemEditValues) => Promise<void> | void;
  disabled?: boolean;
}

const SortableGroceryItemRow = memo(function SortableGroceryItemRow({
  item,
  onToggle,
  onDelete,
  onUpdate,
  disabled = false,
}: SortableGroceryItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const dragHandleProps = useMemo(
    () => (disabled ? undefined : { ...attributes, ...listeners }),
    [attributes, disabled, listeners],
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative rounded-xl shadow-lg ring-2 ring-primary/20" : undefined}
    >
      <GroceryItemComponent
        item={item}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={dragHandleProps}
        dragHandleRef={disabled ? undefined : setActivatorNodeRef}
      />
    </div>
  );
});

interface SortableGroceryListProps {
  items: GroceryItem[];
  onReorder: (orderedIds: number[]) => void;
  onToggle: (id: number) => void;
  onDelete: (item: GroceryItem) => void;
  onUpdate?: (id: number, updates: GroceryItemEditValues) => Promise<void> | void;
  disabled?: boolean;
}

export function SortableGroceryList({
  items,
  onReorder,
  onToggle,
  onDelete,
  onUpdate,
  disabled = false,
}: SortableGroceryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((item) => item.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((item, index) => {
            const enterAnimation = getListItemStaggerAnimation(index, items.length);

            return (
            <div
              key={`pending-${item.id}-${item.name}`}
              className={enterAnimation.className}
              style={enterAnimation.style}
            >
              <SortableGroceryItemRow
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
                disabled={disabled}
              />
            </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
