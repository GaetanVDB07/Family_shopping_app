import React, { useState, useRef, memo } from "react";
import { GroceryItem } from "@shared/schema";
import { formatAddedAt } from "@shared/format-added-at";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Check, Pencil, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

function formatQuantityLine(quantity: string | null, unit: string | null): string | null {
  if (quantity && unit) {
    return `${quantity} ${unit}`;
  }
  if (quantity) {
    return quantity;
  }
  if (unit) {
    return unit;
  }
  return null;
}

interface GroceryItemProps {
  item: GroceryItem;
  onToggle: (id: number) => void;
  onDelete: (item: GroceryItem) => void;
  onUpdate?: (id: number, updates: GroceryItemEditValues) => Promise<void> | void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export interface GroceryItemEditValues {
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
}

export const GroceryItemComponent = memo(function GroceryItemComponent({ item, onToggle, onDelete, onUpdate, dragHandleProps }: GroceryItemProps) {
  const quantityLine = formatQuantityLine(item.quantity, item.unit);
  const [isPressed, setIsPressed] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQuantity, setEditQuantity] = useState(item.quantity ?? "");
  const [editUnit, setEditUnit] = useState(item.unit ?? "");
  const [editNotes, setEditNotes] = useState(item.notes ?? "");
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEditing) return;
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = currentX.current - startX.current;
    const diffY = Math.abs(currentY - startY.current);
    
    // Only allow swipe if horizontal movement is significantly more than vertical
    // This prevents accidental swipes during scroll or pull-to-refresh
    if (Math.abs(diffX) > diffY * 1.5 && diffX < 0) {
      // Prevent scrolling when swiping horizontally
      e.preventDefault();
      setSwipeOffset(Math.max(diffX, -100));
    }
  };

  const handleTouchEnd = () => {
    if (isEditing) return;
    setIsDragging(false);
    
    // If swiped more than 60px (increased threshold), trigger delete
    if (swipeOffset < -60) {
      onDelete(item);
    }
    
    // Reset swipe offset
    setSwipeOffset(0);
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  const startEdit = () => {
    setEditName(item.name);
    setEditQuantity(item.quantity ?? "");
    setEditUnit(item.unit ?? "");
    setEditNotes(item.notes ?? "");
    setSwipeOffset(0);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = editName.trim();
    if (!trimmedName || !onUpdate || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(item.id, {
        name: trimmedName,
        quantity: editQuantity.trim() || null,
        unit: editUnit.trim() || null,
        notes: editNotes.trim() || null,
      });
      setIsEditing(false);
    } catch {
      // The parent mutation shows the toast and rolls back optimistic state.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className={cn(
        "mb-3 border border-border rounded-xl shadow-sm transition-all duration-200 overflow-hidden relative",
        "touch-manipulation select-none", // Better touch handling
        item.completed
          ? "bg-muted/60 opacity-75"
          : "bg-card hover:shadow-md active:shadow-lg",
        isPressed && !isEditing && "scale-[0.98]",
        isDragging && "transition-none"
      )}
      style={{
        transform: `translateX(${isEditing ? 0 : swipeOffset}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Swipe action background */}
      {swipeOffset < -10 && (
        <div className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center px-6 rounded-r-xl">
          <Trash2 className="w-5 h-5 text-white" />
        </div>
      )}

      {isEditing ? (
        <form onSubmit={saveEdit} className="p-4 space-y-3">
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Itemnaam"
            maxLength={200}
            autoFocus
            disabled={isSaving}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={editQuantity}
              onChange={(event) => setEditQuantity(event.target.value)}
              placeholder="Hoeveelheid"
              maxLength={20}
              disabled={isSaving}
            />
            <Input
              value={editUnit}
              onChange={(event) => setEditUnit(event.target.value)}
              placeholder="Eenheid"
              maxLength={20}
              disabled={isSaving}
            />
          </div>
          <Textarea
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            placeholder="Notities"
            maxLength={200}
            disabled={isSaving}
            className="min-h-[72px] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
              <X className="w-4 h-4" />
              Annuleren
            </Button>
            <Button type="submit" size="sm" disabled={!editName.trim() || isSaving}>
              {isSaving ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Enhanced checkbox button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-11 h-11 p-0 border-2 rounded-xl hover:border-primary transition-all duration-200 flex-shrink-0",
                "active:scale-95", // Touch feedback
                item.completed
                  ? "bg-primary border-primary shadow-sm"
                  : "border-border hover:border-primary/60"
              )}
              onClick={() => onToggle(item.id)}
              aria-label={`${item.name} ${item.completed ? "opnieuw kopen" : "afvinken"}`}
            >
              {item.completed && (
                <Check className="w-5 h-5 text-white" />
              )}
            </Button>
            
            {/* Item text with better typography */}
            <div className="flex-1 min-w-0">
              <span className={cn(
                "font-medium text-base leading-relaxed block",
                item.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              )}>
                {item.name}
              </span>
              {quantityLine ? (
                <span className={cn(
                  "text-sm mt-1 block",
                  item.completed ? "text-muted-foreground/70" : "text-muted-foreground"
                )}>
                  {quantityLine}
                </span>
              ) : null}
              {item.notes ? (
                <span className={cn(
                  "text-sm mt-1 block",
                  item.completed ? "text-muted-foreground/70" : "text-muted-foreground"
                )}>
                  {item.notes}
                </span>
              ) : null}
              {/* Added by info */}
              <span className={cn(
                "text-sm mt-1 inline-block px-2 py-0.5 rounded-full",
                item.completed
                  ? "text-muted-foreground bg-muted"
                  : "text-muted-foreground bg-muted"
              )}>
                door {item.addedBy} · {formatAddedAt(item.addedAt)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-shrink-0 items-center gap-1 ml-2">
            {dragHandleProps && !item.completed ? (
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation cursor-grab active:cursor-grabbing"
                aria-label={`${item.name} verslepen`}
                {...dragHandleProps}
              >
                <GripVertical className="w-5 h-5" />
              </button>
            ) : null}
            {onUpdate ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-lg transition-all duration-200 active:scale-95 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={startEdit}
                aria-label={`${item.name} bewerken`}
              >
                <Pencil className="w-5 h-5" />
              </Button>
            ) : null}
            {/* Enhanced delete button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "active:scale-95", // Touch feedback
                item.completed
                  ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  : "text-red-500 hover:text-red-600 hover:bg-red-500/10"
              )}
              onClick={() => onDelete(item)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
});
