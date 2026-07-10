import { useEffect } from "react";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { APP_UPDATE_AVAILABLE_EVENT } from "@/lib/service-worker";

export function ServiceWorkerUpdatePrompt() {
  useEffect(() => {
    const announceUpdate = () => {
      toast({
        title: "Nieuwe versie beschikbaar",
        description: "Vernieuw de app om de nieuwste verbeteringen te gebruiken.",
        duration: 120_000,
        action: (
          <ToastAction altText="App vernieuwen" onClick={() => window.location.reload()}>
            Vernieuwen
          </ToastAction>
        ),
      });
    };

    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, announceUpdate);
    return () => window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, announceUpdate);
  }, []);

  return null;
}
