import { Check, ChevronDown, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FamilySwitcherOption {
  familyId: string;
  familyName: string;
}

interface FamilySwitcherProps {
  families: FamilySwitcherOption[];
  currentFamilyId: string | null;
  onSwitch: (familyId: string) => void;
}

export function FamilySwitcher({ families, currentFamilyId, onSwitch }: FamilySwitcherProps) {
  if (families.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Wissel van familie"
          className="flex items-center gap-1.5 rounded text-sm opacity-75 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Users className="w-3 h-3" />
          <span>{families.length} families</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {families.map((family) => {
          const isCurrent = family.familyId === currentFamilyId;
          return (
            <DropdownMenuItem
              key={family.familyId}
              aria-current={isCurrent ? "true" : undefined}
              onSelect={() => onSwitch(family.familyId)}
            >
              <span className="flex-1 truncate">{family.familyName}</span>
              {isCurrent ? <Check className="ml-2 h-4 w-4 shrink-0" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
