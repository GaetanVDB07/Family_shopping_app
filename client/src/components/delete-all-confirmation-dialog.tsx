import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteAllConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  itemCount: number;
}

export function DeleteAllConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  itemCount
}: DeleteAllConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <span>Hele lijst wissen</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je alle {itemCount} items van de boodschappenlijst wilt wissen?
            Openstaande items worden verwijderd. Afgevinkte items blijven bewaard in je geschiedenis
            zodat je ze later snel kunt terugzetten.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Annuleren
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isLoading ? "Bezig met wissen..." : "Ja, alles wissen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
