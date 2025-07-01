import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GroceryItem } from "@shared/schema";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  item: GroceryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteConfirmationDialog({
  item,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <AlertDialogTitle className="text-lg">Item verwijderen?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Weet je zeker dat je "<span className="font-medium">{item?.name}</span>" wilt verwijderen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex space-x-3">
          <AlertDialogCancel 
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800"
            disabled={isLoading}
          >
            Annuleren
          </AlertDialogCancel>
          <AlertDialogAction
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isLoading}
          >
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
