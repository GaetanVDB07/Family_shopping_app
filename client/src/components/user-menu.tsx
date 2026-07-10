import { useLocation } from "wouter";
import { Home, Menu, Settings } from "lucide-react";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const [, setLocation] = useLocation();
  const { currentFamilyId, currentFamily } = useCurrentFamily();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-white hover:bg-white/20"
          aria-label="Menu openen"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="truncate text-sm font-medium">
            {currentFamily?.familyName || "Boodschappen"}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentFamily?.role === "admin" ? "Admin" : "Lid"}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/families")}>
          <Home className="mr-2 h-4 w-4" />
          Alle families
        </DropdownMenuItem>
        {currentFamilyId ? (
          <DropdownMenuItem onClick={() => setLocation(`/settings/${currentFamilyId}`)}>
            <Settings className="mr-2 h-4 w-4" />
            Instellingen
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
