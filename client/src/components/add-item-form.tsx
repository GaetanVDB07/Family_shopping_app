import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GroceryItem } from "@shared/schema";

interface AddItemFormProps {
  onAddItem: (name: string, addedBy: string, notes?: string) => Promise<void>;
  onReactivateItem: (itemId: number) => void;
  isLoading: boolean;
  existingItems: GroceryItem[];
}

interface MatchingExistingItem {
  displayName: string;
  reactivateId?: number;
}

export function AddItemForm({ onAddItem, onReactivateItem, isLoading, existingItems }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [addedBy, setAddedBy] = useState("Familie");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const matchingExistingItems = useMemo<MatchingExistingItem[]>(() => {
    const query = name.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const matches = new Map<string, MatchingExistingItem>();

    for (const item of existingItems) {
      const itemName = item.name.trim();
      if (!itemName) {
        continue;
      }

      const normalized = itemName.toLowerCase();
      if (!normalized.includes(query)) {
        continue;
      }

      if (!matches.has(normalized)) {
        matches.set(normalized, {
          displayName: itemName,
          reactivateId: item.completed ? item.id : undefined,
        });
        continue;
      }

      const existingMatch = matches.get(normalized)!;

      if (!existingMatch.reactivateId && item.completed) {
        existingMatch.reactivateId = item.id;
      }

      if (itemName.length < existingMatch.displayName.length) {
        existingMatch.displayName = itemName;
      }
    }

    return Array.from(matches.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "nl", { sensitivity: "base" }))
      .slice(0, 6);
  }, [existingItems, name]);

  // Auto-focus input when form becomes visible
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Fout",
        description: "Voer een boodschappenitem in",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) {
      console.log("Already submitting, ignoring duplicate submission");
      return;
    }

    setIsSubmitting(true);
    console.log(`[${new Date().toISOString()}] Form: Starting submission for "${name.trim()}"`);

    try {
      await onAddItem(name.trim(), addedBy, notes.trim() || undefined);
      setName("");
      setNotes("");
      console.log(`[${new Date().toISOString()}] Form: Submission completed successfully`);
      
      // Re-focus input for quick successive additions
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Form: Submission failed:`, error);
      toast({
        title: "Fout",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExisting = (match: MatchingExistingItem) => {
    if (match.reactivateId) {
      setName("");
      onReactivateItem(match.reactivateId);
    } else {
      setName(match.displayName);
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div 
      className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 
        max-w-md mx-auto transition-all duration-300 ease-in-out
        ${isFocused ? 'shadow-2xl border-primary/20' : 'shadow-lg'}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)', // Handle iPhone home indicator
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}
    >
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Voeg een item toe..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`
                  px-4 py-4 text-base border-2 rounded-xl transition-all duration-200
                  focus:ring-2 focus:ring-primary focus:border-primary
                  ${isFocused ? 'border-primary/40' : 'border-gray-200'}
                `}
                disabled={isLoading}
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || isSubmitting || !name.trim()}
              className={`
                bg-primary hover:bg-green-700 text-white px-5 py-4 font-medium 
                rounded-xl transition-all duration-200 min-w-[64px] text-base
                active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${(isLoading || isSubmitting) ? 'animate-pulse' : ''}
              `}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </Button>
          </div>
          <Input
            type="text"
            placeholder="Notitie (optioneel), bijv. halfvolle melk"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              px-4 py-3 text-sm border rounded-xl transition-all duration-200
              focus:ring-2 focus:ring-primary focus:border-primary
              ${isFocused ? 'border-primary/30' : 'border-gray-200'}
            `}
            disabled={isLoading || isSubmitting}
            autoComplete="off"
            autoCapitalize="sentences"
            maxLength={200}
          />
        </form>
        
        {matchingExistingItems.length > 0 ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Beschikbare items
            </div>
            <div className="flex flex-wrap gap-2">
              {matchingExistingItems.map((match) => (
                <button
                  key={match.displayName}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectExisting(match);
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-primary/10 rounded-full border border-gray-200 transition-colors"
                >
                  {match.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : (
          name.trim() && (
            <div className="mt-3 text-xs text-gray-500 text-center">
              Druk op Enter om "{name.trim()}" toe te voegen
            </div>
          )
        )}
      </div>
    </div>
  );
}
