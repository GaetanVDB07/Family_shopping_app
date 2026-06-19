import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggleMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="w-4 h-4 mr-2" />
        Weergave
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent" : ""}>
            <Sun className="w-4 h-4 mr-2" />
            Licht
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent" : ""}>
            <Moon className="w-4 h-4 mr-2" />
            Donker
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent" : ""}>
            <Monitor className="w-4 h-4 mr-2" />
            Systeem
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
