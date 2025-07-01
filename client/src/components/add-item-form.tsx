import { useState } from "react";
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
  const { toast } = useToast();

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

    try {
      await onAddItem(name.trim(), addedBy);
      setName("");
      toast({
        title: "Toegevoegd",
        description: `"${name}" toegevoegd aan lijst`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-md mx-auto" style={{boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)"}}>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Nieuw boodschappenitem..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="bg-primary hover:bg-green-700 text-white px-6 py-3 font-medium min-w-[60px]"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
