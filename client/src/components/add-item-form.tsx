import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { maxLengthInputProps, toastApiError } from "@/lib/api-error";
import { GroceryItem } from "@shared/schema";

interface AddItemOptions {
  notes?: string;
  quantity?: string;
  unit?: string;
}

interface AddItemFormProps {
  onAddItem: (name: string, addedBy: string, options?: AddItemOptions) => Promise<void>;
  onReactivateItem: (itemId: number) => void;
  isLoading: boolean;
  existingItems: GroceryItem[];
}

interface MatchingExistingItem {
  displayName: string;
  reactivateId: number;
}

export function AddItemForm({ onAddItem, onReactivateItem, isLoading, existingItems }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [addedBy, setAddedBy] = useState("Familie");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const matchingExistingItems = useMemo<MatchingExistingItem[]>(() => {
    const query = name.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const matches = new Map<string, MatchingExistingItem>();

    for (const item of existingItems) {
      if (!item.completed) {
        continue;
      }

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
          reactivateId: item.id,
        });
        continue;
      }

      const existingMatch = matches.get(normalized)!;
      if (itemName.length < existingMatch.displayName.length) {
        existingMatch.displayName = itemName;
      }
    }

    return Array.from(matches.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "nl", { sensitivity: "base" }))
      .slice(0, 6);
  }, [existingItems, name]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };

    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);
    updateKeyboardOffset();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

  const hasDetailValues =
    quantity.trim().length > 0 ||
    unit.trim().length > 0 ||
    notes.trim().length > 0;

  const showDetailsSection = showDetails || hasDetailValues;
  const showDetailsToggle = name.trim().length > 0 || hasDetailValues;

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
      return;
    }

    setIsSubmitting(true);

    try {
      const options: AddItemOptions = {};
      const trimmedQuantity = quantity.trim();
      const trimmedUnit = unit.trim();
      const trimmedNotes = notes.trim();

      if (trimmedQuantity) {
        options.quantity = trimmedQuantity;
      }
      if (trimmedUnit) {
        options.unit = trimmedUnit;
      }
      if (trimmedNotes) {
        options.notes = trimmedNotes;
      }

      await onAddItem(name.trim(), addedBy, Object.keys(options).length > 0 ? options : undefined);
      setName("");
      setQuantity("");
      setUnit("");
      setNotes("");
      setShowDetails(false);
      inputRef.current?.focus();
    } catch (error) {
      toastApiError(toast, error, "Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const optionalFieldClassName = `
    px-4 py-3 text-sm border rounded-xl transition-all duration-200
    focus:ring-2 focus:ring-primary focus:border-primary
    ${isFocused ? "border-primary/30" : "border-gray-200"}
  `;

  const handleSelectExisting = (match: MatchingExistingItem) => {
    setName("");
    onReactivateItem(match.reactivateId);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div
      className={`
        fixed left-0 right-0 bg-white border-t border-gray-200
        max-w-md mx-auto transition-all duration-200 ease-out
        ${isFocused || showDetailsSection || matchingExistingItems.length > 0 ? "shadow-2xl border-primary/20" : "shadow-lg"}
      `}
      style={{
        bottom: keyboardOffset,
        paddingBottom: keyboardOffset > 0 ? "0.5rem" : "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
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
                  ${isFocused ? "border-primary/40" : "border-gray-200"}
                `}
                disabled={isLoading}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
                {...maxLengthInputProps(200, toast)}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || isSubmitting || !name.trim()}
              aria-label={name.trim() ? `Voeg ${name.trim()} toe` : "Voeg item toe"}
              className={`
                bg-primary hover:bg-green-700 text-white font-medium
                rounded-xl transition-all duration-200 text-base
                active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${isFocused && name.trim() ? "px-4" : "px-5 min-w-[64px]"}
                py-4
                ${(isLoading || isSubmitting) ? "animate-pulse" : ""}
              `}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isFocused && name.trim() ? (
                <span className="text-sm font-semibold">Voeg toe</span>
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </Button>
          </div>

          {matchingExistingItems.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Eerder gekocht
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
          ) : null}

          {showDetailsToggle ? (
            <button
              type="button"
              onClick={() => setShowDetails((current) => !current)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-green-700 transition-colors"
              aria-expanded={showDetailsSection}
            >
              {showDetailsSection ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Minder details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Meer details
                </>
              )}
            </button>
          ) : null}

          {showDetailsSection ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder="Aantal (optioneel), bijv. 2"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={`flex-1 ${optionalFieldClassName}`}
                  disabled={isLoading || isSubmitting}
                  autoComplete="off"
                  inputMode="decimal"
                  {...maxLengthInputProps(20, toast)}
                />
                <Input
                  type="text"
                  placeholder="Eenheid (optioneel), bijv. L, stuks"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={`flex-1 ${optionalFieldClassName}`}
                  disabled={isLoading || isSubmitting}
                  autoComplete="off"
                  {...maxLengthInputProps(20, toast)}
                />
              </div>
              <Input
                type="text"
                placeholder="Notitie (optioneel), bijv. halfvolle melk"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={optionalFieldClassName}
                disabled={isLoading || isSubmitting}
                autoComplete="off"
                autoCapitalize="sentences"
                {...maxLengthInputProps(200, toast)}
              />
            </div>
          ) : null}
        </form>

        {matchingExistingItems.length === 0 && name.trim() ? (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Druk op Enter om "{name.trim()}" toe te voegen
          </div>
        ) : null}
      </div>
    </div>
  );
}
