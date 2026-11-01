import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AiArticlesCell from "./AiArticlesCell";

type Props = {
  leadId: number;
  value: string | null;
  vinDecoded?: string | null;
  catalogNote?: string | null;
  aiSource?: string | null;
  hasParts: boolean;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
};

const AiArticlesWidget = (props: Props) => {
  const [open, setOpen] = useState(false);

  if (!props.hasParts && !props.value) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Icon name="Sparkles" size={14} className="mr-1.5" />
        Подбор ИИ
        {props.value && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Подбор артикулов по заявке №{props.leadId}</DialogTitle>
          </DialogHeader>
          <AiArticlesCell {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiArticlesWidget;
