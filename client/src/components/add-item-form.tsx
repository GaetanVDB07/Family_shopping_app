import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddItemFormProps {
  onAddItem: (name: string, addedBy: string) => Promise<void>;
  isLoading: boolean;
}

export function AddItemForm({ onAddItem, isLoading }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [addedBy, setAddedBy] = useState("Familie");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

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
      await onAddItem(name.trim(), addedBy);
      setName("");
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
        <form onSubmit={handleSubmit} className="flex space-x-3">
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
        </form>
        
        {/* Quick add suggestions - could be expanded later */}
        {name.trim() && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Druk op Enter om "{name.trim()}" toe te voegen
          </div>
        )}
      </div>
    </div>
  );
}
