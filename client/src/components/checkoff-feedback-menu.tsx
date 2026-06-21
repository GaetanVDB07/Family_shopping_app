import { useState } from "react";
import { Vibrate, Volume2 } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getCheckoffFeedbackPreferences,
  setCheckoffFeedbackPreferences,
  type CheckoffFeedbackPreferences,
} from "@/lib/checkoff-feedback";

export function CheckoffFeedbackMenu() {
  const [preferences, setPreferences] = useState<CheckoffFeedbackPreferences>(
    () => getCheckoffFeedbackPreferences(),
  );

  const updatePreference = (key: keyof CheckoffFeedbackPreferences) => {
    const next = {
      ...preferences,
      [key]: !preferences[key],
    };
    setCheckoffFeedbackPreferences(next);
    setPreferences(next);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Vibrate className="w-4 h-4 mr-2" />
        Afvink-feedback
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onClick={() => updatePreference("haptic")}
            className={preferences.haptic ? "bg-accent" : ""}
          >
            <Vibrate className="w-4 h-4 mr-2" />
            Trillen {preferences.haptic ? "aan" : "uit"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updatePreference("sound")}
            className={preferences.sound ? "bg-accent" : ""}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Geluid {preferences.sound ? "aan" : "uit"}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
