import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { CashbackHistoryItem, formatDate, formatMoney } from "./garageTypes";

type CashbackHistoryDialogProps = {
  history: CashbackHistoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CashbackHistoryDialog = ({
  history,
  open,
  onOpenChange,
}: CashbackHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription>
            *Кэшбэком можно оплатить до 50% от суммы заказа. Минимальное
            списание 500р.
          </DialogDescription>
          <DialogTitle>История кэшбэка</DialogTitle>
          <DialogDescription>
            Начисления за выполненные заказы и списания
          </DialogDescription>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            Операций пока не было.
          </p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 border-l-2 pl-3 ${
                  h.type === "accrual"
                    ? "border-primary/40"
                    : "border-destructive/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={h.type === "accrual" ? "Plus" : "Minus"}
                    size={14}
                    className={
                      h.type === "accrual" ? "text-primary" : "text-destructive"
                    }
                  />
                  <div>
                    <p className="text-sm">{h.label}</p>
                    {h.created_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm font-head whitespace-nowrap ${
                    h.type === "accrual" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {h.type === "accrual" ? "+" : "−"}
                  {formatMoney(h.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CashbackHistoryDialog;
