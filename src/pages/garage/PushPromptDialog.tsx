import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { safeGetSession, safeSetSession } from "@/lib/storage";

const DISMISSED_KEY = "garage_push_prompt_dismissed";

type PushPromptDialogProps = {
  visible: boolean;
  subscribing: boolean;
  subscribe: () => Promise<boolean> | void;
};

const PushPromptDialog = ({ visible, subscribing, subscribe }: PushPromptDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      return;
    }
    if (safeGetSession(DISMISSED_KEY)) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [visible]);

  const dismiss = () => {
    safeSetSession(DISMISSED_KEY, "1");
    setOpen(false);
  };

  const handleSubscribe = async () => {
    await subscribe();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Icon name="Bell" className="text-primary animate-bell-ring" size={26} />
          </span>
          <DialogTitle className="font-head uppercase tracking-wide">
            Включить уведомления?
          </DialogTitle>
          <DialogDescription>
            Сообщим сразу, когда деталь поступит или статус заказа изменится — даже если сайт закрыт.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            disabled={subscribing}
            onClick={handleSubscribe}
            className="font-head uppercase tracking-wide"
          >
            {subscribing ? "Включаем…" : "Включить"}
          </Button>
          <Button
            variant="ghost"
            onClick={dismiss}
            className="font-head uppercase tracking-wide text-muted-foreground"
          >
            Позже
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushPromptDialog;
