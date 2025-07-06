import React from "react";
import { GroceryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroceryItemProps {
  item: GroceryItem;
  onToggle: (id: number) => void;
  onDelete: (item: GroceryItem) => void;
}

export function GroceryItemComponent({ item, onToggle, onDelete }: GroceryItemProps) {
  return (
    <div className={cn(
      "mb-2 border border-gray-100 rounded-lg p-3 shadow-sm transition-all",
      item.completed 
        ? "bg-gray-50 opacity-75" 
        : "bg-white hover:shadow-md"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-5 h-5 p-0 border-2 rounded hover:border-primary transition-colors",
              item.completed
                ? "bg-primary border-primary"
                : "border-gray-300"
            )}
            onClick={() => onToggle(item.id)}
          >
            {item.completed && (
              <Check className="w-3 h-3 text-white" />
            )}
          </Button>
          <span className={cn(
            "font-medium",
            item.completed
              ? "text-gray-600 line-through"
              : "text-gray-800"
          )}>
            {item.name}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={cn(
            "text-xs px-2 py-1 rounded",
            item.completed
              ? "text-gray-400 bg-gray-200"
              : "text-gray-500 bg-gray-100"
          )}>
            {item.addedBy}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "p-1 rounded transition-all",
              item.completed
                ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                : "text-red-500 hover:text-red-700 hover:bg-red-50"
            )}
            onClick={() => onDelete(item)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
